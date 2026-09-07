import { Controller, Get } from '@nestjs/common';
import { Competition } from '@prisma/client';
import { CompetitionsService } from './competitions.service';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get()
  findAll(): Promise<Competition[]> {
    return this.competitionsService.findAll();
  }
}
