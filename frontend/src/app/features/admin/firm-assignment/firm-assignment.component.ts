import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '@app/services/api.service';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  firmId?: string | null;
  firmName?: string | null;
}

interface FirmOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-firm-assignment',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatSelectModule, MatFormFieldModule],
  template: `
    <div class="page-wrapper nvs-animate-in">
      <header class="page-header">
        <h1 class="page-title">Company assignment</h1>
        <p class="page-lead">
          Assign a registered company to company users. Only Owner defines companies on the
          <a routerLink="/admin/firms">Company catalog</a> page.
          Use <a routerLink="/admin/authorization">Authorization</a> to grant roles.
        </p>
      </header>

      <mat-card class="nvs-card">
        @if (firmsLoading()) {
          <p class="muted">Loading companies…</p>
        } @else if (firmAssignableUsers().length === 0) {
          <p class="muted">No company users (role: user) found.</p>
        } @else {
          <table class="users-table">
            <thead>
              <tr>
                <th>Full name</th>
                <th>Email</th>
                <th>Assigned company</th>
              </tr>
            </thead>
            <tbody>
              @for (u of firmAssignableUsers(); track u.id) {
                <tr>
                  <td>{{ u.fullName }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <mat-form-field appearance="outline" class="firm-select" subscriptSizing="dynamic">
                      <mat-select [value]="u.firmId || ''" (selectionChange)="setUserFirm(u.id, $event.value)">
                        <mat-option value="">— No company assigned —</mat-option>
                        @for (f of firms(); track f.id) {
                          <mat-option [value]="f.id">{{ f.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        @if (usersLoading()) {
          <p class="muted">Loading users…</p>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .page-lead a { color: var(--nvs-primary); }
    .users-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    .users-table th, .users-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--nvs-border); }
    .users-table th { font-weight: 600; color: var(--nvs-text-muted); font-size: 0.85rem; }
    .firm-select { min-width: 220px; width: 100%; max-width: 320px; }
    .muted { color: var(--nvs-text-muted); }
  `],
})
export class FirmAssignmentComponent implements OnInit {
  private api = inject(ApiService);
  users = signal<UserRow[]>([]);
  firms = signal<FirmOption[]>([]);
  usersLoading = signal(true);
  firmsLoading = signal(true);

  ngOnInit() {
    this.api.get<UserRow[]>('users').subscribe({
      next: (list) => {
        this.users.set(Array.isArray(list) ? list : []);
        this.usersLoading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.usersLoading.set(false);
      },
    });
    this.api.get<FirmOption[]>('firms').subscribe({
      next: (list) => {
        this.firms.set(Array.isArray(list) ? list : []);
        this.firmsLoading.set(false);
      },
      error: () => {
        this.firms.set([]);
        this.firmsLoading.set(false);
      },
    });
  }

  firmAssignableUsers(): UserRow[] {
    return this.users().filter((u) => u.role === 'user');
  }

  setUserFirm(userId: string, firmId: string) {
    const fid = firmId === '' ? null : firmId;
    this.api.put<UserRow>('users/' + userId + '/firm', { firmId: fid }).subscribe({
      next: () => this.reloadUsers(),
      error: (e) => alert(e?.error?.message || 'Could not assign company'),
    });
  }

  private reloadUsers() {
    this.api.get<UserRow[]>('users').subscribe({
      next: (list) => this.users.set(Array.isArray(list) ? list : []),
    });
  }
}
