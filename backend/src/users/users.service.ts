import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from '../auth/auth.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  }

  async registerNotificationToken(userId: string, token: string): Promise<void> {
    await this.prisma.notificationToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  }

  async removeNotificationToken(userId: string, token: string): Promise<void> {
    await this.prisma.notificationToken.deleteMany({ where: { userId, token } });
  }
}
