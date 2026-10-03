import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupCompetitionsDto } from './dto/update-group-competitions.dto';
import { UpdateGroupRulesDto } from './dto/update-group-rules.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { SetGroupMutedDto } from './dto/set-group-muted.dto';
import { SetGroupFavoriteDto } from './dto/set-group-favorite.dto';
import { SearchPublicGroupsDto } from './dto/search-public-groups.dto';

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
  findPublic(@Query() query: SearchPublicGroupsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.searchPublicGroups(query, user.id);
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

  @Patch(':id/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setMuted(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetGroupMutedDto,
  ) {
    await this.groupsService.setMuted(id, user.id, dto.muted);
  }

  @Patch(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setFavorite(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetGroupFavoriteDto,
  ) {
    await this.groupsService.setFavorite(id, user.id, dto.favorite);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.leaveGroup(id, user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async kickMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupsService.kickMember(id, user.id, targetUserId);
  }

  @Patch(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    await this.groupsService.updateMemberRole(id, user.id, targetUserId, dto.role);
    return this.groupsService.listMembers(id);
  }

  @Post(':id/transfer-ownership')
  async transferOwnership(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferOwnershipDto,
  ) {
    await this.groupsService.transferOwnership(id, user.id, dto.newOwnerUserId);
    return this.groupsService.findByIdForMember(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.deleteGroup(id, user.id);
  }
}
