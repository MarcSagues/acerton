import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Competition } from '../models/competition.model';

@Injectable({ providedIn: 'root' })
export class CompetitionsService {
  private readonly catalogSignal = signal<Competition[]>([]);
  readonly catalog = this.catalogSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadCatalog() {
    return this.http
      .get<Competition[]>(`${environment.apiUrl}/competitions`)
      .pipe(tap((competitions) => this.catalogSignal.set(competitions)));
  }
}
