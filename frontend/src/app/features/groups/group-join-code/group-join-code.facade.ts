import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';

@Injectable()
export class GroupJoinCodeFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly formLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    inviteCode: ['', [Validators.required, Validators.minLength(6)]],
  });

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  joinGroup(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const { inviteCode } = this.form.getRawValue();
    this.groupsService.joinByInviteCode(inviteCode.trim().toUpperCase()).subscribe({
      next: (group) => {
        this.formLoading.set(false);
        this.activeGroupService.setActive(group.id);
        this.router.navigate(['/rankings']);
      },
      error: (error: HttpErrorResponse) => {
        this.formLoading.set(false);
        this.errorMessage.set(error.error?.message ?? 'Código de invitación inválido');
      },
    });
  }
}
