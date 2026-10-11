import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
  firmId?: string | null;
  firmName?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: UserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private userSignal = signal<UserInfo | null>(this.loadStoredUser());

  currentUser = computed(() => this.userSignal());
  loggedIn = computed(() => !!this.userSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private loadStoredUser(): UserInfo | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  accountExists(email: string): Observable<{ exists: boolean }> {
    const q = encodeURIComponent(email.trim());
    return this.http.get<{ exists: boolean }>(`${this.api}/auth/account-exists?email=${q}`);
  }

  login(email: string, password: string, passwordConfirm?: string): Observable<LoginResponse> {
    const body: { email: string; password: string; passwordConfirm?: string } = { email, password };
    if (passwordConfirm !== undefined && passwordConfirm !== '') {
      body.passwordConfirm = passwordConfirm;
    }
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, body);
  }

  applyLoginResponse(res: LoginResponse) {
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.userSignal.set(res.user);
    this.router.navigate(['/dashboard']);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token') && !!this.userSignal();
  }

  getCurrentUser(): UserInfo | null {
    return this.userSignal();
  }

  refreshUser() {
    this.http.get<UserInfo>(`${this.api}/users/me`).subscribe({
      next: (u) => {
        localStorage.setItem('user', JSON.stringify(u));
        this.userSignal.set(u);
      },
    });
  }
}
