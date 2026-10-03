import { UsersService } from './users.service';
import { NAME_CHANGE_COOLDOWN_MS } from '../auth/public-user.util';

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('UsersService.updateName', () => {
  it('permite el cambio si nunca se ha cambiado el nombre (nameChangedAt null)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', nameChangedAt: null });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      name: 'Nuevo',
      avatarUrl: null,
      usernameConfirmed: true,
      nameChangedAt: new Date(),
    });

    const service = new UsersService(prisma as never);
    const result = await service.updateName('u1', 'Nuevo');

    expect(result.name).toBe('Nuevo');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({ name: 'Nuevo', usernameConfirmed: true }),
    });
  });

  it('rechaza el cambio si todavia no ha pasado el periodo de espera', async () => {
    const prisma = buildPrismaMock();
    const recentChange = new Date(Date.now() - 1000 * 60 * 60); // hace 1 hora
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', nameChangedAt: recentChange });

    const service = new UsersService(prisma as never);
    await expect(service.updateName('u1', 'Otro')).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('permite el cambio si ya paso el periodo de espera desde el ultimo cambio', async () => {
    const prisma = buildPrismaMock();
    const oldChange = new Date(Date.now() - NAME_CHANGE_COOLDOWN_MS - 1000);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', nameChangedAt: oldChange });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      name: 'Otro',
      avatarUrl: null,
      usernameConfirmed: true,
      nameChangedAt: new Date(),
    });

    const service = new UsersService(prisma as never);
    const result = await service.updateName('u1', 'Otro');

    expect(result.name).toBe('Otro');
  });
});

describe('UsersService.updateAvatar', () => {
  it('guarda la ruta del mascota elegido y el color de fondo si el nivel alcanza para ambos', async () => {
    const prisma = buildPrismaMock();
    // guino exige nivel 4 (ver avatar-level-rewards.ts) — 1050 XP cubre los niveles 1-3 (200+350+500) y llega a nivel 4.
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', experience: 1050 });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      name: 'Alex',
      avatarUrl: '/assets/avatars/mascot/guino.png',
      avatarBackground: '#d2be94',
      usernameConfirmed: true,
      nameChangedAt: null,
    });

    const service = new UsersService(prisma as never);
    const result = await service.updateAvatar('u1', 'guino' as never, '#d2be94' as never);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { avatarUrl: '/assets/avatars/mascot/guino.png', avatarBackground: '#d2be94' },
    });
    expect(result.avatarUrl).toBe('/assets/avatars/mascot/guino.png');
    expect(result.avatarBackground).toBe('#d2be94');
  });

  it('permite mascota/color "de fabrica" (reposo + champan) en nivel 1', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', experience: 0 });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      avatarUrl: '/assets/avatars/mascot/reposo.png',
      avatarBackground: '#d2be94',
    });

    const service = new UsersService(prisma as never);
    await service.updateAvatar('u1', 'reposo' as never, '#d2be94' as never);

    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rechaza una mascota de premio si el nivel no llega', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', experience: 0 });

    const service = new UsersService(prisma as never);
    await expect(
      service.updateAvatar('u1', 'guino' as never, '#d2be94' as never),
    ).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rechaza un color de premio si el nivel no llega', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', experience: 0 });

    const service = new UsersService(prisma as never);
    await expect(
      service.updateAvatar('u1', 'reposo' as never, '#6a8caf' as never),
    ).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
