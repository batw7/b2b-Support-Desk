import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@app/services/auth.service';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <header class="page-header">
        <h1 class="page-title">Profile</h1>
        <p class="page-lead">View and update your account information.</p>
      </header>

      <section class="profile-section" aria-labelledby="profile-form-heading">
        <mat-card class="nvs-card">
          <mat-card-content>
            <h2 id="profile-form-heading" class="sr-only">Profile form</h2>
            <form [formGroup]="form" (ngSubmit)="save()" class="profile-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full name</mat-label>
                <input matInput formControlName="fullName" autocomplete="name">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="you@domain.com">
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Assigned company</mat-label>
                <input matInput formControlName="firmDisplay" readonly>
              </mat-form-field>
              <p class="profile-yetki">Role: {{ yetkiLabel(auth.getCurrentUser()?.role) }}</p>
              <div class="profile-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  {{ saving() ? 'Saving…' : 'Save' }}
                </button>
                <button mat-stroked-button type="button" class="btn-logout" (click)="auth.logout()">
                  <mat-icon aria-hidden="true">logout</mat-icon>
                  Sign out
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .profile-form .full-width { width: 100%; display: block; }
    .profile-yetki { margin: 0.5rem 0 1rem; font-size: 0.9375rem; color: var(--nvs-text-muted); }
    .profile-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 1rem; }
    .btn-logout { color: var(--nvs-error); border-color: var(--nvs-error); }
    .btn-logout .mat-icon { margin-right: 0.25rem; font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .profile-yetki-detail { font-size: 0.8125rem; color: var(--nvs-text-muted); margin-top: 0.25rem; }
  `],
})
export class ProfileComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  saving = signal(false);
  form = this.fb.nonNullable.group({
    fullName: [this.auth.getCurrentUser()?.fullName ?? '', Validators.required],
    email: [this.auth.getCurrentUser()?.email ?? '', [Validators.required, Validators.email]],
    firmDisplay: [
      {
        value: this.auth.getCurrentUser()?.firmName?.trim() || 'No company assigned yet',
        disabled: true,
      },
    ],
  });

  yetkiLabel(role?: string): string {
    const map: Record<string, string> = {
      owner: 'Owner',
      system_support: 'Support team',
      admin: 'Support team',
      user: 'Company user',
    };
    return map[role ?? ''] ?? role ?? '—';
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.put('users/me', {
      fullName: this.form.get('fullName')?.value,
      email: this.form.get('email')?.value,
    }).subscribe({
      next: () => { this.auth.refreshUser(); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }
}
