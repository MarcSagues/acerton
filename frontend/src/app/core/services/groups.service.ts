import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Group, GroupMember, ScoringMode } from '../models/group.model';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  isPublic?: boolean;
  scoringMode?: ScoringMode;
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly myGroupsSignal = signal<Group[]>([]);
  readonly myGroups = this.myGroupsSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadMyGroups() {
    return this.http
      .get<Group[]>(`${environment.apiUrl}/groups/mine`)
      .pipe(tap((groups) => this.myGroupsSignal.set(groups)));
  }

  /**
   * A donde navegar justo despues de iniciar sesion: sin grupos da igual
   * (hasGroupGuard te manda a /welcome de todas formas), con uno vas
   * directo a Jornada, con varios entras en Grupos a elegir cual ver.
   */
  postLoginRoute() {
    return this.loadMyGroups().pipe(map((groups) => (groups.length > 1 ? ['/groups'] : ['/matchday'])));
  }

  loadPublicGroups() {
    return this.http.get<Group[]>(`${environment.apiUrl}/groups/public`);
  }

  getById(groupId: string) {
    return this.http.get<Group>(`${environment.apiUrl}/groups/${groupId}`);
  }

  listMembers(groupId: string) {
    return this.http.get<GroupMember[]>(`${environment.apiUrl}/groups/${groupId}/members`);
  }

  create(payload: CreateGroupPayload) {
    return this.http
      .post<Group>(`${environment.apiUrl}/groups`, payload)
      .pipe(tap((group) => this.myGroupsSignal.update((groups) => [group, ...groups])));
  }

  joinByInviteCode(inviteCode: string) {
    return this.http
      .post<Group>(`${environment.apiUrl}/groups/join/${inviteCode}`, {})
      .pipe(tap((group) => this.myGroupsSignal.update((groups) => [group, ...groups])));
  }

  joinPublic(groupId: string) {
    return this.http
      .post<Group>(`${environment.apiUrl}/groups/${groupId}/join`, {})
      .pipe(tap((group) => this.myGroupsSignal.update((groups) => [group, ...groups])));
  }

  updateCompetitions(groupId: string, competitionIds: string[]) {
    return this.http.patch<Group>(`${environment.apiUrl}/groups/${groupId}/competitions`, {
      competitionIds,
    });
  }

  updateRules(
    groupId: string,
    rules: { comebackEnabled?: boolean; comebackPointsPerBonus?: number; isPublic?: boolean },
  ) {
    return this.http.patch<Group>(`${environment.apiUrl}/groups/${groupId}/rules`, rules);
  }
}
