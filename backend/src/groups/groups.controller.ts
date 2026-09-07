import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupCompetitionsDto } from './dto/update-group-competitions.dto';
import { UpdateGroupRulesDto } from './dto/update-group-rules.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findMineForUser(user.id);
  }

  @Get('public')
  findPublic() {
    return this.groupsService.findPublicGroups();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findByIdForMember(id, user.id);
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.assertIsMember(id, user.id);
    return this.groupsService.listMembers(id);
  }

  @Post('join/:inviteCode')
  joinByInviteCode(
    @Param('inviteCode') inviteCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.joinByInviteCode(inviteCode, user.id);
  }

  @Post(':id/join')
  joinPublic(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.joinPublicGroup(id, user.id);
  }

  @Patch(':id/competitions')
  async updateCompetitions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGroupCompetitionsDto,
  ) {
    await this.groupsService.assertIsAdmin(id, user.id);
    await this.groupsService.setCompetitions(id, dto.competitionIds);
    return this.groupsService.findByIdForMember(id, user.id);
  }

  @Patch(':id/rules')
  async updateRules(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGroupRulesDto,
  ) {
    await this.groupsService.assertIsAdmin(id, user.id);
    await this.groupsService.updateRules(id, dto);
    return this.groupsService.findByIdForMember(id, user.id);
  }
}
