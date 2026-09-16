import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

const CONFIG_VALUES: Record<string, unknown> = {
  'jwt.accessSecret': 'access-secret',
  'jwt.accessExpiresIn': '15m',
  'jwt.refreshSecret': 'refresh-secret',
  'jwt.refreshExpiresIn': '30d',
  'google.clientId': 'client-id',
  'google.nativeClientId': undefined,
  corsOrigin: 'https://app.piqo.es',
};

function buildDeps(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    authToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'refresh1' }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    ...prismaOverrides,
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
  const configService = { get: jest.fn((key: string) => CONFIG_VALUES[key]) };
  const mailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };
  const referralsService = {
    generateUniqueReferralCode: jest.fn().mockResolvedValue('ABC23456'),
    redeemBestEffort: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
    mailService as never,
    referralsService as never,
  );
  return { service, prisma, jwtService, mailService, referralsService };
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test',
    passwordHash: 'hashed',
    avatarUrl: '/assets/avatars/mascot/reposo.png',
    avatarBackground: '#d2be94',
    usernameConfirmed: true,
    nameChangedAt: null,
    tutorialCompletedAt: null,
    emailVerifiedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('AuthService.register', () => {
  it('rechaza si ya existe una cuenta con ese email', async () => {
    const { service, prisma } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser());

    await expect(
      service.register({ email: 'test@example.com', password: 'password123', name: 'Test' }),
    ).rejects.toThrow(ConflictException);
  });

  it('crea la cuenta sin verificar, con el avatar de Piqo por defecto, y no devuelve tokens', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(buildUser({ emailVerifiedAt: null }));

    const result = await service.register({ email: 'test@example.com', password: 'password123', name: 'Test' });

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      avatarUrl: '/assets/avatars/mascot/reposo.png',
      avatarBackground: '#d2be94',
    });
    expect(prisma.authToken.create.mock.calls[0][0].data).toMatchObject({ purpose: 'EMAIL_VERIFICATION' });
    expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    expect(result).toEqual({ email: 'test@example.com' });
    expect(result).not.toHaveProperty('tokens');
  });

  it('no revierte la creacion si el envio del correo falla', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(buildUser({ emailVerifiedAt: null }));
    (mailService.sendVerificationEmail as jest.Mock).mockRejectedValue(new Error('red caida'));

    await expect(
      service.register({ email: 'test@example.com', password: 'password123', name: 'Test' }),
    ).resolves.toEqual({ email: 'test@example.com' });
  });

  it('genera un codigo de referido propio para la cuenta nueva', async () => {
    const { service, prisma, referralsService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(buildUser({ emailVerifiedAt: null }));

    await service.register({ email: 'test@example.com', password: 'password123', name: 'Test' });

    expect(referralsService.generateUniqueReferralCode).toHaveBeenCalled();
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({ referralCode: 'ABC23456' });
  });

  it('intenta enlazar el codigo de referido recibido, sin bloquear el registro si falla', async () => {
    const { service, prisma, referralsService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(buildUser({ id: 'nuevo1', emailVerifiedAt: null }));

    await service.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      referralCode: 'FRIEND01',
    });

    expect(referralsService.redeemBestEffort).toHaveBeenCalledWith('nuevo1', 'FRIEND01');
  });
});

describe('AuthService.validateOrCreateGoogleUser', () => {
  it('cuenta nueva: genera codigo de referido propio e intenta enlazar el recibido', async () => {
    const { service, prisma, referralsService } = buildDeps();
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // por googleId: no existe
      .mockResolvedValueOnce(null); // por email: tampoco existe -> cuenta nueva
    (prisma.user.create as jest.Mock).mockResolvedValue(buildUser({ id: 'nuevo1', googleId: 'g1' }));

    await service.validateOrCreateGoogleUser({
      googleId: 'g1',
      email: 'nuevo@example.com',
      name: 'Nuevo',
      referralCode: 'FRIEND01',
    });

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({ referralCode: 'ABC23456' });
    expect(referralsService.redeemBestEffort).toHaveBeenCalledWith('nuevo1', 'FRIEND01');
  });

  it('cuenta ya existente por googleId: no intenta enlazar ningun referido', async () => {
    const { service, prisma, referralsService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(buildUser({ id: 'existente1' }));

    await service.validateOrCreateGoogleUser({
      googleId: 'g1',
      email: 'test@example.com',
      name: 'Test',
      referralCode: 'FRIEND01',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(referralsService.redeemBestEffort).not.toHaveBeenCalled();
  });

  it('cuenta existente por email (enlazar Google): no cuenta como nuevo referido', async () => {
    const { service, prisma, referralsService } = buildDeps();
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // por googleId: no existe
      .mockResolvedValueOnce(buildUser({ id: 'existente1' })); // por email: ya existia sin Google
    (prisma.user.update as jest.Mock).mockResolvedValue(buildUser({ id: 'existente1', googleId: 'g1' }));

    await service.validateOrCreateGoogleUser({
      googleId: 'g1',
      email: 'test@example.com',
      name: 'Test',
      referralCode: 'FRIEND01',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(referralsService.redeemBestEffort).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('rechaza credenciales invalidas', async () => {
    const { service, prisma } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.login({ email: 'x@x.com', password: 'bad' })).rejects.toThrow(UnauthorizedException);
  });

  it('bloquea el login si el email no esta verificado', async () => {
    const { service, prisma } = buildDeps();
    const passwordHash = await bcrypt.hash('password123', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash, emailVerifiedAt: null }));

    await expect(service.login({ email: 'test@example.com', password: 'password123' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('permite el login si el email esta verificado y la contrasena es correcta', async () => {
    const { service, prisma } = buildDeps();
    const passwordHash = await bcrypt.hash('password123', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash }));

    const result = await service.login({ email: 'test@example.com', password: 'password123' });

    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('signed-jwt');
  });
});

describe('AuthService.verifyEmail', () => {
  it('rechaza un token invalido, caducado o ya usado', async () => {
    const { service, prisma } = buildDeps();
    (prisma.authToken.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
  });

  it('marca el email verificado, el token usado, e inicia sesion', async () => {
    const { service, prisma } = buildDeps();
    (prisma.authToken.findFirst as jest.Mock).mockResolvedValue({ id: 'tok1', userId: 'u1' });
    (prisma.user.update as jest.Mock).mockResolvedValue(buildUser());
    (prisma.authToken.update as jest.Mock).mockResolvedValue({});

    const result = await service.verifyEmail('good-token');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(prisma.authToken.update).toHaveBeenCalledWith({ where: { id: 'tok1' }, data: { usedAt: expect.any(Date) } });
    expect(result.tokens.accessToken).toBe('signed-jwt');
  });
});

describe('AuthService.resendVerification', () => {
  it('no hace nada (ni envia correo) si la cuenta no existe', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await service.resendVerification('nadie@example.com');

    expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('no hace nada si la cuenta ya esta verificada', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser());

    await service.resendVerification('test@example.com');

    expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('reenvia el correo si la cuenta existe y no esta verificada', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ emailVerifiedAt: null }));

    await service.resendVerification('test@example.com');

    expect(mailService.sendVerificationEmail).toHaveBeenCalled();
  });
});

describe('AuthService.requestPasswordReset', () => {
  it('no hace nada si la cuenta no existe o es solo-Google (sin passwordHash)', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash: null }));

    await service.requestPasswordReset('test@example.com');

    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.authToken.create).not.toHaveBeenCalled();
  });

  it('crea un token y envia el correo si la cuenta tiene contrasena', async () => {
    const { service, prisma, mailService } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser());

    await service.requestPasswordReset('test@example.com');

    expect(prisma.authToken.create.mock.calls[0][0].data).toMatchObject({ purpose: 'PASSWORD_RESET' });
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
  });
});

describe('AuthService.resetPassword', () => {
  it('rechaza un token invalido, caducado o ya usado', async () => {
    const { service, prisma } = buildDeps();
    (prisma.authToken.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.resetPassword('bad-token', 'newpassword123')).rejects.toThrow(BadRequestException);
  });

  it('actualiza la contrasena, marca el token usado y revoca las sesiones activas', async () => {
    const { service, prisma } = buildDeps();
    (prisma.authToken.findFirst as jest.Mock).mockResolvedValue({ id: 'tok1', userId: 'u1' });
    (prisma.user.update as jest.Mock).mockResolvedValue(buildUser());
    (prisma.authToken.update as jest.Mock).mockResolvedValue({});
    (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

    await service.resetPassword('good-token', 'newpassword123');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { passwordHash: expect.any(String) } });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe('AuthService.changePassword', () => {
  it('rechaza si la cuenta es solo-Google (sin passwordHash)', async () => {
    const { service, prisma } = buildDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash: null }));

    await expect(service.changePassword('u1', 'whatever', 'newpassword123')).rejects.toThrow(BadRequestException);
  });

  it('rechaza si la contrasena actual no coincide', async () => {
    const { service, prisma } = buildDeps();
    const passwordHash = await bcrypt.hash('correct', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash }));

    await expect(service.changePassword('u1', 'incorrect', 'newpassword123')).rejects.toThrow(UnauthorizedException);
  });

  it('actualiza la contrasena si la actual es correcta', async () => {
    const { service, prisma } = buildDeps();
    const passwordHash = await bcrypt.hash('correct', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(buildUser({ passwordHash }));

    await service.changePassword('u1', 'correct', 'newpassword123');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { passwordHash: expect.any(String) } });
  });
});
