import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MyReferral {
  code: string;
  referralCount: number;
}

@Injectable({ providedIn: 'root' })
export class ReferralService {
  constructor(private readonly http: HttpClient) {}

  getMine() {
    return this.http.get<MyReferral>(`${environment.apiUrl}/users/me/referral`);
  }

  redeem(code: string) {
    return this.http.post<{ referrerName: string }>(`${environment.apiUrl}/users/me/referral/redeem`, { code });
  }
}
