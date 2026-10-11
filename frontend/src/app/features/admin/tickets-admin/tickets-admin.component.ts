import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  answered: 'Answered',
  closed: 'Closed',
};

@Component({
  selector: 'app-tickets-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="page-wrapper admin-content-page">
      <nav class="breadcrumb" aria-label="Location">
        <a routerLink="/admin">Admin</a>
        <span aria-hidden="true">/</span>
        <span>Tickets</span>
      </nav>
      <header class="page-header">
        <h1 class="page-title">Ticket management (database)</h1>
        <p class="page-lead">The list below comes from the <strong>tickets</strong> table. Open a ticket to view details and add replies; changes are saved to the database.</p>
      </header>

      @if (loading()) {
        <p class="state-message" role="status">Loading…</p>
      }

      @if (!loading() && tickets().length === 0) {
        <section class="nvs-card empty-message">
          <mat-icon aria-hidden="true">confirmation_number</mat-icon>
          <p>No tickets yet.</p>
        </section>
      }

      @if (!loading() && tickets().length > 0) {
        <section class="admin-list-section" aria-label="Ticket list">
          <ul class="admin-list">
            @for (t of tickets(); track t.id) {
              <li>
                <a [routerLink]="['/tickets', t.id]" class="nvs-card admin-list-card">
                  <div class="admin-list-card-header">
                    <h2 class="admin-list-card-title">{{ t.subject }}</h2>
                    <span class="admin-list-card-chip" [attr.data-status]="t.status">{{ STATUS_LABEL[t.status] || t.status }}</span>
                  </div>
                  <p class="admin-list-card-meta">
                    <span>{{ t.user?.fullName }}</span>
                    <span>Priority: {{ t.priority?.code ?? '—' }}</span>
                    @if (t.requestType?.label) {
                      <span>Request: {{ t.requestType.label }}</span>
                    }
                  </p>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: [`
    .breadcrumb { font-size: 0.875rem; color: var(--nvs-text-muted); margin-bottom: 1rem; }
    .breadcrumb a { color: var(--nvs-primary); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .state-message { padding: 2rem; color: var(--nvs-text-muted); }
    .empty-message { text-align: center; padding: 2rem; }
    .empty-message mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: var(--nvs-text-muted); margin-bottom: 0.5rem; }
    .admin-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .admin-list-card { display: block; padding: 1.25rem; text-decoration: none; color: inherit; transition: box-shadow 0.2s; }
    .admin-list-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .admin-list-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .admin-list-card-title { margin: 0; font-size: 1.0625rem; font-weight: 600; }
    .admin-list-card-chip { font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; color: #fff; }
    .admin-list-card-chip[data-status="open"] { background: #b45309; }
    .admin-list-card-chip[data-status="in_progress"] { background: #2563eb; }
    .admin-list-card-chip[data-status="answered"] { background: #15803d; }
    .admin-list-card-chip[data-status="closed"] { background: #525252; }
    .admin-list-card-meta { margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--nvs-text-muted); }
    .admin-list-card-meta span + span { margin-left: 1rem; }
  `],
})
export class TicketsAdminComponent implements OnInit {
  private api = inject(ApiService);
  tickets = signal<any[]>([]);
  loading = signal(true);
  protected STATUS_LABEL = STATUS_LABEL;

  ngOnInit() {
    this.api.get<any[]>('tickets/admin/list').subscribe({
      next: (list) => { this.tickets.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
