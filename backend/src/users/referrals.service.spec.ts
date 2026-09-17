import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

function buildDeps() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
  const xpService = {
    awardReferral: jest.fn().mockResolvedValue(null),
  };
  const service = new ReferralsService(prisma as never, xpService as never);
  return { service, prisma, xpService };
}

describe('ReferralsService.getMyReferral', () => {
  it('devuelve el codigo propio y cuantos referidos tiene', async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referralCode: 'ABC23456' });
    prisma.user.count.mockResolvedValue(3);

    const result = await service.getMyReferral('u1');

    expect(result).toEqual({ code: 'ABC23456', referralCount: 3 });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { referredById: 'u1' } });
  });
});

describe('ReferralsService.redeem', () => {
  it('enlaza al referidor y concede su XP (primer referido)', async () => {
    const { service, prisma, xpService } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'referrer1', name: 'Ana' });
    prisma.user.update.mockResolvedValue({});
    prisma.user.count.mockResolvedValue(1);

    const result = await service.redeem('u2', 'abc23456');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { referralCode: 'ABC23456' },
      select: { id: true, name: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { referredById: 'referrer1' },
    });
    expect(xpService.awardReferral).toHaveBeenCalledWith('referrer1', 1);
    expect(result).toEqual({ referrerName: 'Ana' });
  });

  it('usa el indice real de referido (segundo, tercero...) para la caida de XP', async () => {
    const { service, prisma, xpService } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'referrer1', name: 'Ana' });
    prisma.user.update.mockResolvedValue({});
    prisma.user.count.mockResolvedValue(3);

    await service.redeem('u2', 'ABC23456');

    expect(xpService.awardReferral).toHaveBeenCalledWith('referrer1', 3);
  });

  it('rechaza si la cuenta ya tiene un referidor asignado', async () => {
    const { service, prisma, xpService } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: 'someone-else' });

    await expect(service.redeem('u2', 'ABC23456')).rejects.toThrow(ConflictException);
    expect(xpService.awardReferral).not.toHaveBeenCalled();
  });

  it('rechaza un codigo que no existe', async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: null });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.redeem('u2', 'NOEXISTE')).rejects.toThrow(NotFoundException);
  });

  it('rechaza usar el propio codigo', async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', name: 'Yo mismo' });

    await expect(service.redeem('u2', 'ABC23456')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('ReferralsService.redeemBestEffort', () => {
  it('no hace nada si no hay codigo', async () => {
    const { service, prisma } = buildDeps();

    await service.redeemBestEffort('u1', undefined);

    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('no propaga el error si el codigo no es valido (no debe romper el registro)', async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ referredById: null });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.redeemBestEffort('u1', 'NOEXISTE')).resolves.toBeUndefined();
  });
});

describe('ReferralsService.generateUniqueReferralCode', () => {
  it('reintenta si el codigo generado ya existe', async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'ya-existe' }).mockResolvedValueOnce(null);

    const code = await service.generateUniqueReferralCode();

    expect(typeof code).toBe('string');
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
