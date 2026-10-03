import { IsIn } from 'class-validator';
import {
  AVATAR_BACKGROUNDS,
  AVATAR_MASCOT_IDS,
  AvatarBackground,
  AvatarMascotId,
} from '../avatar-catalog';

export class UpdateAvatarDto {
  @IsIn(AVATAR_MASCOT_IDS)
  mascotId!: AvatarMascotId;

  @IsIn(AVATAR_BACKGROUNDS)
  background!: AvatarBackground;
}
