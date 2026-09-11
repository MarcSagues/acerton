import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface OnboardingStep {
  eyebrow: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  readonly steps: OnboardingStep[] = [
    {
      eyebrow: 'Tu liga, vuestra historia',
      title: 'Pronostica.\nPica. Repite.',
      body: 'Crea un grupo con tus amigos, juega cada jornada y deja que la tabla decida quien manda.',
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

  readonly currentStep = signal(0);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/matchday');
    }
  }

  next(): void {
    this.currentStep.update((step) => Math.min(step + 1, this.steps.length - 1));
  }

  goTo(step: number): void {
    this.currentStep.set(step);
  }
}
