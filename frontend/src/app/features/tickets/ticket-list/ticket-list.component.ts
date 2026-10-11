import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  answered: 'Answered',
  closed: 'Closed',
};

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <header class="page-header page-header--row">
        <div>
          <h1 class="page-title">Support requests</h1>
          <p class="page-lead">{{ isStaff() ? 'All user requests (support team).' : 'View and track your requests.' }}</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/tickets/new" class="btn-new">
          <mat-icon aria-hidden="true">add</mat-icon>
          <span>New request</span>
        </button>
      </header>

      @if (!loading() && tickets().length > 0) {
        <div class="filter-bar nvs-dashboard-toolbar">
          <mat-form-field appearance="outline" class="priority-filter">
            <mat-label>Priority</mat-label>
            <mat-select [value]="priorityFilter()" (valueChange)="priorityFilter.set($event)">
              <mat-option value="">All</mat-option>
              @for (p of ['S1','S2','S3','S4','S5']; track p) {
                <mat-option [value]="p">{{ p }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      }

      @if (loading()) {
        <p class="state-message" role="status">Loading…</p>
      }

      @if (!loading() && tickets().length === 0) {
        <section class="empty-state" aria-label="No requests">
          <mat-card class="nvs-card empty-card">
            <img src="assets/images/empty-tickets.svg" alt="" class="empty-card-img" width="200" height="160" aria-hidden="true">
            <h2 class="empty-title">You have no support requests yet</h2>
            <p class="empty-desc">Create your first request to get started.</p>
            <button mat-raised-button color="primary" routerLink="/tickets/new">Open first request</button>
          </mat-card>
        </section>
      }

      @if (!loading() && tickets().length > 0 && filteredTickets().length === 0) {
        <p class="state-message" role="status">No requests match this priority.</p>
      }
      @if (!loading() && filteredTickets().length > 0) {
        <section class="ticket-list" aria-label="Request list">
          <ul class="ticket-list-inner">
            @for (t of filteredTickets(); track t.id) {
              <li>
                <mat-card class="nvs-card ticket-card" [routerLink]="['/tickets', t.id]">
                  <div class="ticket-card-header">
                    <h2 class="ticket-card-title">#{{ t.id.slice(0,8) }} — {{ t.subject }}</h2>
                    <div class="ticket-card-meta">
                      <span
                        class="nvs-pri-badge"
                        [attr.data-pri]="priorityPriAttr(t.priority?.code)"
                        aria-label="Priority">{{ t.priority?.code ?? '—' }}</span>
                      <mat-chip [class]="'status-' + t.status">{{ STATUS_LABEL[t.status] || t.status }}</mat-chip>
                    </div>
                  </div>
                  <p class="ticket-card-desc">{{ t.description | slice:0:120 }}{{ t.description.length > 120 ? '…' : '' }}</p>
                  <time class="ticket-card-date" [attr.datetime]="t.updatedAt">{{ t.updatedAt | date:'short' }}</time>
                </mat-card>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: [`
    .page-header--row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .btn-new { flex-shrink: 0; }
    .filter-bar { margin-bottom: 1rem; }
    .priority-filter { min-width: 160px; }
    .state-message { text-align: center; padding: 2rem; color: var(--nvs-text-muted); }
    .ticket-list-inner { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
    .ticket-card { cursor: pointer; transition: box-shadow 0.2s ease; }
    .ticket-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
    .ticket-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .ticket-card-title { font-size: 1.0625rem; font-weight: 600; margin: 0 0 0.5rem; }
    .ticket-card-meta { display: flex; align-items: center; gap: 0.5rem; }
    .ticket-card-desc { margin: 0; font-size: 0.9375rem; color: var(--nvs-text-muted); line-height: 1.45; }
    .ticket-card-date { display: block; margin-top: 0.5rem; font-size: 0.8125rem; color: var(--nvs-text-muted); }
    .status-open { background: #b45309 !important; color: #fff !important; }
    .status-in_progress { background: #2563eb !important; color: #fff !important; }
    .status-answered { background: #15803d !important; color: #fff !important; }
    .status-closed { background: #525252 !important; color: #fff !important; }
    .empty-state { margin-top: 1rem; }
    .empty-card { text-align: center; padding: 2.5rem 1.5rem; }
    .empty-card-img { margin: 0 auto 1rem; display: block; opacity: 0.85; }
    .empty-title { font-size: 1.125rem; margin: 0 0 0.5rem; }
    .empty-desc { color: var(--nvs-text-muted); margin: 0 0 1.25rem; }
  `],
})
export class TicketListComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  tickets = signal<any[]>([]);
  loading = signal(true);
  priorityFilter = signal<string>('');
  protected STATUS_LABEL = STATUS_LABEL;

  filteredTickets = computed(() => {
    const list = this.tickets();
    const p = this.priorityFilter();
    if (!p) return list;
    return list.filter((t) => (t.priority?.code ?? '') === p);
  });

  ngOnInit() {
    const path = this.isStaff() ? 'tickets/admin/list' : 'tickets/my';
    this.api.get<any[]>(path).subscribe({
      next: (list) => { this.tickets.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isStaff(): boolean {
    const r = this.auth.getCurrentUser()?.role;
    return r === 'owner' || r === 'system_support' || r === 'admin';
  }

  priorityPriAttr(code: string | undefined): string {
    const c = (code || '').trim().toLowerCase();
    if (c === 's1' || c === 's2' || c === 's3' || c === 's4' || c === 's5') return c;
    return '';
  }
}
