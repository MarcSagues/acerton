import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups.module';
import { RankingsModule } from '../../rankings/rankings.module';
import { PublicGroupPreviewController } from './public-group-preview.controller';
import { PublicGroupPreviewService } from './public-group-preview.service';

/**
 * Modulo hoja: importa GroupsModule y RankingsModule pero ninguno de los
 * dos lo importa a el, para no crear un ciclo (ver comentario en
 * PublicGroupPreviewService).
 */
@Module({
  imports: [GroupsModule, RankingsModule],
  controllers: [PublicGroupPreviewController],
  providers: [PublicGroupPreviewService],
})
export class PublicGroupPreviewModule {}
