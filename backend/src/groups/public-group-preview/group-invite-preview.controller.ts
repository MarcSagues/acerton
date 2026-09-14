import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PublicGroupPreviewService } from './public-group-preview.service';

/**
 * Vista previa de un grupo antes de unirse por link o codigo de invitacion
 * (privado o publico): separado de PublicGroupPreviewController (que solo
 * cubre grupos publicos por id) porque esta ruta cuelga de groups/join, no
 * de groups/public, y no exige que el grupo sea publico.
 */
@Controller('groups/join')
export class GroupInvitePreviewController {
  constructor(private readonly previewService: PublicGroupPreviewService) {}

  @Get(':inviteCode/preview')
  getPreview(@Param('inviteCode') inviteCode: string, @CurrentUser() user: AuthenticatedUser) {
    return this.previewService.getPreviewByInviteCode(inviteCode, user.id);
  }
}
