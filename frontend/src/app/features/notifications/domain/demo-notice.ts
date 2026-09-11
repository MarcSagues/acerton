export type NoticePeriod = 'Hoy' | 'Esta semana';
export type NoticeKind = 'deadline' | 'result' | 'badge' | 'season';

export interface DemoNotice {
  id: number;
  period: NoticePeriod;
  kind: NoticeKind;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

/** El producto todavía no dispone de un historial persistido de avisos. */
export const DEMO_NOTICES: DemoNotice[] = [
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
];

export const NOTICE_PERIODS: NoticePeriod[] = ['Hoy', 'Esta semana'];
