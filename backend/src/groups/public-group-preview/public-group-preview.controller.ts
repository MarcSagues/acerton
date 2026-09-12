import { Controller, Get, Param } from '@nestjs/common';
import { PublicGroupPreviewService } from './public-group-preview.service';

@Controller('groups/public')
export class PublicGroupPreviewController {
  constructor(private readonly previewService: PublicGroupPreviewService) {}

  @Get(':id/preview')
  getPreview(@Param('id') id: string) {
    return this.previewService.getPreview(id);
  }
}
