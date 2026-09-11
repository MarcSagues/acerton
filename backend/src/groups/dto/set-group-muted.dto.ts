import { IsBoolean } from 'class-validator';

export class SetGroupMutedDto {
  @IsBoolean()
  muted!: boolean;
}
