import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Injectable()
export class GroupJoinCodeFacade {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    inviteCode: ['', [Validators.required, Validators.minLength(6)]],
  });

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  /** No se une directamente: lleva a la vista previa (GroupJoinComponent), donde se confirma o cancela. */
  joinGroup(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { inviteCode } = this.form.getRawValue();
    this.router.navigate(['/groups/join', inviteCode.trim().toUpperCase()]);
  }
}
