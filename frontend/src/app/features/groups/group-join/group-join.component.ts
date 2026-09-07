import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';

@Component({
  selector: 'app-group-join',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="join-page">
      @if (errorMessage()) {
        <p>{{ errorMessage() }}</p>
        <button class="cta" (click)="goToGroups()">Ir a mis grupos</button>
      } @else {
        <mat-spinner diameter="32"></mat-spinner>
        <p>Uniendote al grupo...</p>
      }
    </div>
  `,
  styles: [
    `
      .join-page {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text-primary);
        font-family: var(--font-ui);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: center;
        padding: 24px;
      }
      .cta {
        height: 48px;
        padding: 0 20px;
        border-radius: 14px;
        background: var(--accent);
        color: var(--accent-on);
        border: none;
        font: 600 14px/1 var(--font-ui);
        cursor: pointer;
      }
    `,
  ],
})
export class GroupJoinComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode');
    if (!inviteCode) {
      this.errorMessage.set('Link de invitacion invalido');
      return;
    }

    this.groupsService.joinByInviteCode(inviteCode).subscribe({
      next: (group) => {
        this.activeGroupService.setActive(group.id);
        this.router.navigate(['/matchday']);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.message ?? 'No se pudo procesar la invitacion');
      },
    });
  }

  goToGroups(): void {
    this.router.navigate(['/groups']);
  }
}
