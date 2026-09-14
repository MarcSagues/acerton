import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PublicGroupPreviewService } from './public-group-preview.service';

@Controller('groups/public')
export class PublicGroupPreviewController {
  constructor(private readonly previewService: PublicGroupPreviewService) {}

  @Get(':id/preview')
  getPreview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.previewService.getPreview(id, user.id);
  }
}
