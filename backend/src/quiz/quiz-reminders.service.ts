import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuizStatus, QuizWindowKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Pasado este tiempo desde que se abrio un quiz ya no se avisa de su apertura:
 * cubre caidas del servidor y el primer despliegue (la migracion ya marca como
 * avisados los que estaban publicados).
 */
export const QUIZ_OPEN_NOTICE_MAX_AGE_MS = 6 * HOUR_MS;

export interface QuizClosingTier {
  field: 'reminder1hSentAt' | 'reminder24hSentAt';
  preference: 'quizReminder1h' | 'quizReminder24h';
  windowMs: number;
  body: string;
}

/** De la mas urgente a la menos: dentro de la ultima hora solo cuenta la de 1 h (nunca las dos a la vez). */
export const QUIZ_CLOSING_TIERS: QuizClosingTier[] = [
  {
    field: 'reminder1hSentAt',
    preference: 'quizReminder1h',
    windowMs: HOUR_MS,
    body: 'Cierra en menos de 1 hora: es tu última oportunidad.',
  },
  {
    field: 'reminder24hSentAt',
    preference: 'quizReminder24h',
    windowMs: 24 * HOUR_MS,
    body: 'Cierra en menos de 24 horas. ¡Que no se te pase!',
  },
];

export interface QuizReminderEvent {
  status: QuizStatus;
  closesAt: Date;
  openedAt: Date | null;
  openNotifiedAt: Date | null;
  reminder1hSentAt: Date | null;
  reminder24hSentAt: Date | null;
}

/**
 * Aviso de apertura: 'send' si toca mandarlo, 'skip' si solo hay que marcarlo
 * (abierto hace demasiado o ya cerrado) y null si no hay nada que hacer.
 */
export function openingNotice(event: QuizReminderEvent, now: Date): 'send' | 'skip' | null {
  if (event.status !== 'OPEN' || event.openNotifiedAt) return null;
  if (event.closesAt.getTime() <= now.getTime()) return 'skip';
  if (event.openedAt && now.getTime() - event.openedAt.getTime() > QUIZ_OPEN_NOTICE_MAX_AGE_MS) {
    return 'skip';
  }
  return 'send';
}

/** Franja de cierre que toca avisar ahora, o null (fuera de franja, ya enviada o quiz no abierto). */
export function dueClosingTier(event: QuizReminderEvent, now: Date): QuizClosingTier | null {
  if (event.status !== 'OPEN') return null;
  const left = event.closesAt.getTime() - now.getTime();
  if (left <= 0) return null;
  for (const tier of QUIZ_CLOSING_TIERS) {
    if (left <= tier.windowMs) return event[tier.field] ? null : tier;
  }
  return null;
}

/** Titulo del aviso: el quiz mixto por su ventana, el antiguo por su liga y jornada. */
export function quizTitle(event: {
  windowKind: QuizWindowKind | null;
  matchday: { order: number; competition: { name: string } } | null;
}): string {
  if (event.matchday)
    return `Quiz de ${event.matchday.competition.name} · Jornada ${event.matchday.order}`;
  return event.windowKind === 'MIDWEEK' ? 'Quiz de entre semana' : 'Quiz del fin de semana';
}

/**
 * Avisos opcionales del Quiz de jornada (2026-10-13, peticion del usuario):
 * al abrirse, 24 h antes del cierre y 1 h antes, cada uno con su preferencia
 * (apagadas de serie). Los de cierre no le llegan a quien ya lo termino. Cada
 * aviso sale una sola vez por quiz: la marca se reclama con un updateMany
 * condicionado antes de enviar, asi dos pasadas a la vez no lo duplican.
 */
@Injectable()
export class QuizRemindersService {
  private readonly logger = new Logger(QuizRemindersService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDueReminders(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.quizEvent.findMany({
        where: { status: 'OPEN' },
        include: { matchday: { select: { order: true, competition: { select: { name: true } } } } },
      });
      for (const event of events) {
        try {
          const title = quizTitle(event);
          await this.handleOpening(event, title, now);
          await this.handleClosing(event, title, now);
        } catch (error) {
          this.logger.error(`Error enviando avisos del quiz ${event.id}`, error as Error);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async handleOpening(event: QuizReminderEvent & { id: string }, title: string, now: Date) {
    const decision = openingNotice(event, now);
    if (!decision) return;
    const claim = await this.prisma.quizEvent.updateMany({
      where: { id: event.id, openNotifiedAt: null },
      data: { openNotifiedAt: now },
    });
    if (claim.count === 0 || decision === 'skip') return;
    const userIds = await this.recipients(event.id, 'quizOpening', false);
    await this.notifications.notifyQuiz(
      userIds,
      'QUIZ_OPENED',
      title,
      'Ya puedes jugarlo: responde antes de que empiece el primer partido.',
      event.id,
    );
  }

  private async handleClosing(event: QuizReminderEvent & { id: string }, title: string, now: Date) {
    const tier = dueClosingTier(event, now);
    if (!tier) return;
    // Con la de 1 h enviada, la de 24 h ya no tiene sentido: se marca tambien.
    const data =
      tier.field === 'reminder1hSentAt'
        ? { reminder1hSentAt: now, reminder24hSentAt: event.reminder24hSentAt ?? now }
        : { reminder24hSentAt: now };
    const claim = await this.prisma.quizEvent.updateMany({
      where: { id: event.id, [tier.field]: null },
      data,
    });
    if (claim.count === 0) return;
    const userIds = await this.recipients(event.id, tier.preference, true);
    await this.notifications.notifyQuiz(userIds, 'QUIZ_CLOSING_SOON', title, tier.body, event.id);
  }

  /** Quien tiene activada esa preferencia; para los de cierre, sin quien ya termino este quiz. */
  private async recipients(
    eventId: string,
    preference: 'quizOpening' | QuizClosingTier['preference'],
    excludeCompleted: boolean,
  ): Promise<string[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { [preference]: true },
      select: { userId: true },
    });
    if (!excludeCompleted || rows.length === 0) return rows.map((row) => row.userId);
    const completed = await this.prisma.quizParticipation.findMany({
      where: { eventId, completedAt: { not: null } },
      select: { userId: true },
    });
    const done = new Set(completed.map((row) => row.userId));
    return rows.map((row) => row.userId).filter((userId) => !done.has(userId));
  }
}
