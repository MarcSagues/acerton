import { IsEnum } from 'class-validator';
import { GroupRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(GroupRole)
  role!: GroupRole;
}
