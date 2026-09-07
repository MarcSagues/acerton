import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateGroupCompetitionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  competitionIds!: string[];
}
