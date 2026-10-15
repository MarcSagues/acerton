import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuizOption } from '@prisma/client';

export class QuizAnswerDto {
  @IsString()
  @MaxLength(191)
  questionId!: string;

  @IsEnum(QuizOption)
  option!: QuizOption;
}

export class SaveQuizAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}

export class QuizRankingQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  competitionId?: string;

  @IsOptional()
  @Matches(/^\d{4}\/\d{2}$/)
  seasonLabel?: string;

  @IsOptional()
  @Matches(/^(0|[1-9]\d{0,8})$/)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
