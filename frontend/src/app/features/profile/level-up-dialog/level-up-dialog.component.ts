import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface LevelUpDialogData {
  level: number;
}

/**
 * Pop-up mostrado cuando se detecta, con la app abierta, un aviso de
 * subida de nivel (Sprint 14) sin leer que todavia no se haya enseñado
 * en esta sesion — ver NotificationsFeedService.pendingLevelUpPopup y
 * ShellFacade, que es quien lo abre. Solo "aceptar": no marca el aviso
 * como leido (eso solo pasa al pulsarlo de verdad en Avisos, que ademas
 * lleva a elegir avatar), asi que el punto rojo de Perfil/campanita
 * sigue ahi despues de cerrar esto.
 */
@Component({
  selector: 'app-level-up-dialog',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './level-up-dialog.component.html',
  styleUrl: './level-up-dialog.component.scss',
})
export class LevelUpDialogComponent {
  private readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<LevelUpDialogData>(DIALOG_DATA);

  accept(): void {
    this.dialogRef.close();
  }
}
