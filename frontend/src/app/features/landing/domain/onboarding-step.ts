import { t } from '../../../core/i18n/translate';
export interface OnboardingStep {
  eyebrow: string;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    eyebrow: t('onboardingStep.ligaVuestraHistoria'),
    title: t('onboardingStep.pronosticaPicaRepite'),
    body: t('onboardingStep.creaGrupoAmigosJuega'),
  },
  {
    eyebrow: t('onboardingStep.dosFormasJugar'),
    title: t('onboardingStep.eligeVuestroTerrenoJuego'),
    body: t('onboardingStep.quiniela1x2ElegirLocal'),
  },
  {
    eyebrow: t('onboardingStep.todoQuedaEntreVosotros'),
    title: t('onboardingStep.temporadaRecordar'),
    body: t('onboardingStep.puntosRachasPiquesAcumulan'),
  },
];
