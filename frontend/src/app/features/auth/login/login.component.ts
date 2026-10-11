import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '@app/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

function loginIdentifierValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) return null;
    if (raw.toLowerCase() === 'admin') return null;
    return Validators.email(control);
  };
}

type AccountStatus = 'idle' | 'checking' | 'exists' | 'new';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  animations: [
    trigger('authCardEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
    trigger('confirmExpand', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('320ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0, height: 0, margin: 0 }))]),
    ]),
  ],
  template: `
    <div class="auth-page" role="main">
      <div class="auth-backdrop" aria-hidden="true"></div>
      <mat-card class="auth-card" @authCardEnter>
        <mat-card-header>
          <div class="auth-brand">
            <span class="auth-logo" aria-hidden="true">NVS</span>
            <h1 class="auth-title">Nevers Support</h1>
          </div>
          <p class="auth-subtitle">Sign in with email and password. On your first visit, enter your password twice.</p>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" aria-label="Sign-in form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email or admin</mat-label>
              <input
                matInput
                type="text"
                formControlName="email"
                placeholder="admin or email"
                autocomplete="username"
                (blur)="onEmailBlur()"
              />
              @if (accountStatus() === 'checking') {
                <mat-progress-spinner matSuffix mode="indeterminate" diameter="22" aria-label="Checking" />
              }
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <mat-error>{{ getLoginEmailError() }}</mat-error>
              }
            </mat-form-field>

            @if (hintText()) {
              <p class="auth-hint" role="status">{{ hintText() }}</p>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                placeholder="At least 8 characters (new account)"
                autocomplete="current-password"
              />
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (accountStatus() === 'new') {
              <div @confirmExpand class="confirm-wrap">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Confirm password</mat-label>
                  <input
                    matInput
                    type="password"
                    formControlName="passwordConfirm"
                    autocomplete="new-password"
                  />
                  @if (form.get('passwordConfirm')?.invalid && form.get('passwordConfirm')?.touched) {
                    <mat-error>{{ getConfirmError() }}</mat-error>
                  }
                </mat-form-field>
              </div>
            }

            @if (errorMessage()) {
              <p class="auth-error" role="alert">{{ errorMessage() }}</p>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width auth-submit"
              [disabled]="submitDisabled()"
            >
              {{ loading() ? 'Processing…' : submitLabel() }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .auth-backdrop {
      position: absolute;
      inset: -20%;
      background: radial-gradient(ellipse 50% 40% at 50% 0%, rgba(59, 130, 246, 0.12), transparent 55%),
                  radial-gradient(ellipse 40% 30% at 80% 60%, rgba(59, 130, 246, 0.06), transparent 50%);
      pointer-events: none;
      animation: authPulse 8s ease-in-out infinite;
    }
    @keyframes authPulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.02); }
    }
    .auth-card {
      position: relative;
      max-width: 420px;
      width: 100%;
      padding: 2rem;
      border-radius: 18px;
      background: var(--nvs-card);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--nvs-border);
      z-index: 1;
    }
    .auth-brand { text-align: center; margin-bottom: 0.5rem; }
    .auth-logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: linear-gradient(145deg, var(--nvs-primary), #2563eb);
      color: white;
      border-radius: 16px;
      font-weight: 700;
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
    }
    .auth-title { font-size: 1.375rem; font-weight: 600; margin: 0; color: var(--nvs-text); letter-spacing: -0.02em; }
    .auth-card .mat-mdc-form-field .mdc-floating-label,
    .auth-card .mat-mdc-form-field .mat-mdc-input-element { color: var(--nvs-text) !important; }
    .auth-card .mat-mdc-text-field--outlined .mdc-notched-outline * { border-color: var(--nvs-border) !important; }
    .auth-subtitle { font-size: 0.9375rem; color: var(--nvs-text-muted); margin: 0 0 1.25rem; line-height: 1.55; }
    .auth-hint {
      font-size: 0.8125rem;
      color: var(--nvs-primary);
      margin: -0.25rem 0 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(59, 130, 246, 0.08);
      border-radius: var(--nvs-radius-sm);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .auth-form { margin-bottom: 0; }
    .confirm-wrap { overflow: hidden; }
    .full-width { width: 100%; display: block; }
    .auth-submit {
      margin-top: 0.75rem;
      min-height: 48px;
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .auth-submit:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
    }
    .auth-error { font-size: 0.875rem; color: var(--nvs-error); margin: 0.5rem 0 0; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, loginIdentifierValidator()]],
    password: ['', [Validators.required]],
    passwordConfirm: [''],
  });

  loading = signal(false);
  errorMessage = signal('');
  accountStatus = signal<AccountStatus>('idle');

  constructor() {
    const emailCtrl = this.form.get('email');
    emailCtrl?.valueChanges
      .pipe(
        debounceTime(450),
        distinctUntilChanged(),
        switchMap((val) => {
          const raw = (val ?? '').toString().trim();
          if (!emailCtrl.valid || !raw) {
            this.accountStatus.set('idle');
            this.syncConfirmForExistingAccount();
            return of(null);
          }
          this.accountStatus.set('checking');
          return this.auth.accountExists(raw).pipe(catchError(() => of({ exists: true })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res === null) return;
        this.accountStatus.set(res.exists ? 'exists' : 'new');
        if (res.exists) {
          this.syncConfirmForExistingAccount();
        } else {
          this.syncConfirmForNewAccount();
        }
      });

    this.form
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.accountStatus() === 'new') {
          this.form.get('passwordConfirm')?.updateValueAndValidity({ emitEvent: false });
        }
      });
  }

  hintText(): string {
    switch (this.accountStatus()) {
      case 'exists':
        return 'Account found — enter your password.';
      case 'new':
        return 'First sign-in with this email — enter your password twice (at least 8 characters).';
      default:
        return '';
    }
  }

  submitLabel(): string {
    return this.accountStatus() === 'new' ? 'Create account and sign in' : 'Sign in';
  }

  submitDisabled(): boolean {
    if (this.loading()) return true;
    if (this.accountStatus() === 'checking') return true;
    const email = this.form.get('email');
    const pwd = this.form.get('password');
    if (!email?.valid || !(pwd?.value ?? '').toString()) return true;
    if (this.accountStatus() === 'new') {
      const c = this.form.get('passwordConfirm');
      return !c || c.disabled || c.invalid;
    }
    return false;
  }

  onEmailBlur(): void {
    const c = this.form.get('email');
    const raw = (c?.value ?? '').toString().trim();
    if (!c?.valid || !raw) return;
    if (this.accountStatus() === 'idle') {
      this.accountStatus.set('checking');
      this.auth.accountExists(raw).subscribe({
        next: (r) => {
          this.accountStatus.set(r.exists ? 'exists' : 'new');
          if (r.exists) this.syncConfirmForExistingAccount();
          else this.syncConfirmForNewAccount();
        },
        error: () => {
          this.accountStatus.set('exists');
          this.syncConfirmForExistingAccount();
        },
      });
    }
  }

  private syncConfirmForExistingAccount(): void {
    const p = this.form.get('password');
    if (p) {
      p.setValidators([Validators.required]);
      p.updateValueAndValidity({ emitEvent: false });
    }
    const c = this.form.get('passwordConfirm');
    if (!c) return;
    c.clearValidators();
    c.setValue('');
    c.disable({ emitEvent: false });
    c.updateValueAndValidity({ emitEvent: false });
  }

  private syncConfirmForNewAccount(): void {
    const p = this.form.get('password');
    if (p) {
      p.setValidators([Validators.required, Validators.minLength(8)]);
      p.updateValueAndValidity({ emitEvent: false });
    }
    const c = this.form.get('passwordConfirm');
    if (!c) return;
    c.enable({ emitEvent: false });
    c.setValidators([
      Validators.required,
      Validators.minLength(8),
      (ctrl: AbstractControl) => {
        const pwd = this.form.get('password')?.value ?? '';
        const v = (ctrl.value ?? '').toString();
        if (!v) return null;
        return v === pwd ? null : { mismatch: true };
      },
    ]);
    c.updateValueAndValidity({ emitEvent: false });
  }

  getLoginEmailError(): string {
    const c = this.form.get('email');
    if (c?.hasError('required')) return 'Enter email or admin username';
    if (c?.hasError('email')) return 'Enter a valid email (or admin)';
    return 'Enter a valid value';
  }

  getConfirmError(): string {
    const c = this.form.get('passwordConfirm');
    if (c?.hasError('required')) return 'Password confirmation is required';
    if (c?.hasError('minlength')) return 'At least 8 characters';
    if (c?.hasError('mismatch')) return 'Passwords do not match';
    return 'Enter a valid value';
  }

  onSubmit(): void {
    this.errorMessage.set('');
    const st = this.accountStatus();
    const emailCtrl = this.form.get('email');
    const rawEmail = (emailCtrl?.value ?? '').toString().trim();
    if (st === 'idle' && emailCtrl?.valid && rawEmail) {
      this.loading.set(true);
      this.auth.accountExists(rawEmail).subscribe({
        next: (r) => {
          this.accountStatus.set(r.exists ? 'exists' : 'new');
          if (r.exists) this.syncConfirmForExistingAccount();
          else this.syncConfirmForNewAccount();
          this.loading.set(false);
          if (this.form.valid) this.postLogin();
        },
        error: () => {
          this.loading.set(false);
          this.accountStatus.set('exists');
          this.syncConfirmForExistingAccount();
        },
      });
      return;
    }
    if (this.form.invalid || st === 'checking') return;
    this.postLogin();
  }

  private postLogin(): void {
    this.loading.set(true);
    const v = this.form.getRawValue();
    const confirm = this.accountStatus() === 'new' ? v.passwordConfirm : undefined;
    this.auth.login(v.email, v.password, confirm).subscribe({
      next: (res) => {
        this.auth.applyLoginResponse(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg =
          err?.error?.message ||
          err?.message ||
          (Array.isArray(err?.error?.message) ? err.error.message[0] : null) ||
          'Sign-in failed.';
        this.errorMessage.set(typeof msg === 'string' ? msg : 'Sign-in failed.');
      },
    });
  }
}
