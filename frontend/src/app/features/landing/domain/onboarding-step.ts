export interface OnboardingStep {
  eyebrow: string;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    eyebrow: 'Tu liga, vuestra historia',
    title: 'Pronostica.\nPica. Repite.',
    body: 'Crea un grupo con tus amigos, juega cada jornada y deja que la tabla decida quién manda.',
  },
  {
    eyebrow: 'Dos formas de jugar',
    title: 'Elige vuestro\nterreno de juego.',
    body: 'Quiniela 1X2 para elegir local, empate o visitante; resultado exacto para clavar el marcador.',
  },
  {
    eyebrow: 'Todo queda entre vosotros',
    title: 'Una temporada\npara recordar.',
    body: 'Los puntos, las rachas y los piques se acumulan jornada a jornada. Jugar es gratis y sin dinero real.',
  },
];
