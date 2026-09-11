import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

type NoticeKind = 'deadline' | 'result' | 'badge' | 'season';

interface DemoNotice {
  id: number;
  period: 'Hoy' | 'Esta semana';
  kind: NoticeKind;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  /**
   * Datos deliberadamente mock: el backend envia push sin persistir un
   * historial, por lo que todavia no existe un endpoint real que alimentar.
   */
  readonly notices = signal<DemoNotice[]>([
    {
      id: 1,
      period: 'Hoy',
      kind: 'deadline',
      icon: 'schedule',
      title: 'La jornada cierra pronto',
      body: 'Te falta un pronostico en Liga. Tienes hasta las 20:45.',
      time: 'Hace 12 min',
      unread: true,
    },
    {
      id: 2,
      period: 'Hoy',
      kind: 'result',
      icon: 'sports_soccer',
      title: 'Jornada terminada',
      body: 'Has sumado 7 puntos y subes una posicion en la tabla del grupo.',
      time: 'Hace 2 h',
      unread: true,
    },
    {
      id: 3,
      period: 'Esta semana',
      kind: 'badge',
      icon: 'military_tech',
      title: 'Nueva insignia',
      body: 'Has conseguido Constante por participar en 5 jornadas consecutivas.',
      time: 'Martes',
      unread: false,
    },
    {
      id: 4,
      period: 'Esta semana',
      kind: 'season',
      icon: 'emoji_events',
      title: 'La pelea sigue abierta',
      body: 'Solo 4 puntos separan el primer y el tercer puesto de vuestro grupo.',
      time: 'Lunes',
      unread: false,
    },
  ]);

  readonly periods: DemoNotice['period'][] = ['Hoy', 'Esta semana'];

  markAllRead(): void {
    this.notices.update((items) => items.map((notice) => ({ ...notice, unread: false })));
  }
}
