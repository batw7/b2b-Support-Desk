import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  firmId?: string | null;
  firmName?: string | null;
}

@Component({
  selector: 'app-authorization',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="page-wrapper nvs-animate-in">
      <header class="page-header">
        <h1 class="page-title">Authorization</h1>
        <p class="page-lead">
          The Owner account is not listed here. By email you can assign only the <strong>Support team</strong> role; there is a single Owner account.
          A registered email is required. Company assignment: <a routerLink="/admin/firm-assignment">Company assignment</a>.
        </p>
      </header>

      <div class="toolbar">
        <button mat-raised-button color="primary" (click)="openAssign()">
          <mat-icon>person_add</mat-icon>
          Add support team member (email)
        </button>
      </div>

      <mat-card class="nvs-card">
        <h2 class="section-title">Authorized users</h2>
        <p class="hint">Owner and support team (admin / legacy system_support) are listed. You can demote a support member to company user from the table.</p>
        <table class="users-table">
          <thead>
            <tr>
              <th>Full name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (u of staff(); track u.id) {
              <tr>
                <td>{{ u.fullName }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="yetki-badge" [attr.data-role]="u.role">{{ yetkiLabel(u.role) }}</span>
                </td>
                <td>
                  @if (u.role !== 'owner' && canChangeRole(u.role)) {
                    <mat-form-field appearance="outline" class="role-select" subscriptSizing="dynamic">
                      <mat-select [value]="roleSelectValue(u.role)" (selectionChange)="setRole(u.id, $event.value)">
                        <mat-option value="admin">Support team</mat-option>
                        <mat-option value="user">Company user</mat-option>
                      </mat-select>
                    </mat-form-field>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!staff().length && !loading()) {
          <p class="muted">No authorized users yet.</p>
        }
        @if (loading()) {
          <p class="muted">Loading…</p>
        }
      </mat-card>
    </div>

    @if (dialogOpen()) {
      <div class="dialog-backdrop" (click)="closeAssign()"></div>
      <div class="dialog-box nvs-card">
        <h2 class="dialog-title">Add support team member</h2>
        <p class="dialog-desc">The registered email address will be assigned as <strong>Support team</strong>.</p>
        <form [formGroup]="assignForm" (ngSubmit)="submitAssign()">
          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" placeholder="you@domain.com">
            @if (assignForm.get('email')?.invalid && assignForm.get('email')?.touched) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>
          @if (assignError()) {
            <p class="assign-error" role="alert">{{ assignError() }}</p>
          }
          <div class="dialog-actions">
            <button mat-button type="button" (click)="closeAssign()">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="assignForm.invalid || assigning()">
              {{ assigning() ? 'Saving…' : 'Confirm' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .toolbar { margin-bottom: 1rem; }
    .hint { color: var(--nvs-text-muted); font-size: 0.9rem; margin: 0 0 1rem; }
    .section-title { margin-top: 0; }
    .page-lead a { color: var(--nvs-primary); }
    .users-table { width: 100%; border-collapse: collapse; }
    .users-table th, .users-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--nvs-border); }
    .users-table th { font-weight: 600; color: var(--nvs-text-muted); font-size: 0.85rem; }
    .yetki-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem; }
    .yetki-badge[data-role="owner"] { background: rgba(139, 92, 246, 0.2); }
    .yetki-badge[data-role="system_support"] { background: rgba(59, 130, 246, 0.2); }
    .yetki-badge[data-role="admin"] { background: rgba(34, 197, 94, 0.2); }
    .yetki-badge[data-role="user"] { background: rgba(148, 163, 184, 0.2); }
    .role-select { width: 200px; }
    .muted { color: var(--nvs-text-muted); }
    .dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; }
    .dialog-box { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; min-width: 360px; max-width: 90vw; padding: 1.5rem; }
    .dialog-title { margin: 0 0 0.5rem; font-size: 1.25rem; }
    .dialog-desc { color: var(--nvs-text-muted); margin: 0 0 1rem; font-size: 0.9375rem; }
    .full-width { width: 100%; display: block; }
    .assign-error { color: var(--nvs-error); font-size: 0.875rem; margin: 0.5rem 0; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
  `],
})
export class AuthorizationComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  staff = signal<UserRow[]>([]);
  loading = signal(true);
  dialogOpen = signal(false);
  assigning = signal(false);
  assignError = signal('');
  assignForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit() {
    this.loadStaff();
  }

  loadStaff() {
    this.loading.set(true);
    this.api.get<UserRow[]>('users/staff').subscribe({
      next: (list) => {
        this.staff.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => {
        this.staff.set([]);
        this.loading.set(false);
      },
    });
  }

  yetkiLabel(r: string): string {
    const map: Record<string, string> = {
      owner: 'Owner',
      system_support: 'Support team',
      admin: 'Support team',
      user: 'Company user',
    };
    return map[r] || r;
  }

  roleSelectValue(r: string): string {
    if (r === 'system_support' || r === 'admin') return 'admin';
    return r;
  }

  canChangeRole(targetRole: string): boolean {
    return this.auth.getCurrentUser()?.role === 'owner' && targetRole !== 'owner';
  }

  openAssign() {
    this.assignForm.reset({ email: '' });
    this.assignError.set('');
    this.dialogOpen.set(true);
  }

  closeAssign() {
    this.dialogOpen.set(false);
  }

  submitAssign() {
    if (this.assignForm.invalid) return;
    this.assignError.set('');
    this.assigning.set(true);
    const v = this.assignForm.getRawValue();
    this.api.post<UserRow>('users/assign-role', { email: v.email.trim(), role: 'admin' }).subscribe({
      next: () => {
        this.loadStaff();
        this.closeAssign();
        this.assigning.set(false);
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          (err?.status === 404 ? 'No registered user found with this email.' : null) ||
          'Operation failed.';
        this.assignError.set(typeof msg === 'string' ? msg : 'Operation failed.');
        this.assigning.set(false);
      },
    });
  }

  setRole(userId: string, role: string) {
    this.api.put('users/' + userId + '/role', { role }).subscribe({
      next: () => this.loadStaff(),
      error: (e) => alert(e?.error?.message || 'Could not assign role'),
    });
  }
}
