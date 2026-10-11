import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-logs-view',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <h1 class="page-title">Log</h1>
    <mat-card>
      <p class="muted">General activity logs. Use the menu for API log and App log.</p>
      <div class="log-list">
        @for (l of logs(); track l.id) {
          <div class="log-row">
            <span class="log-type">{{ l.type }}</span>
            <span class="log-msg">{{ l.message }}</span>
            <span class="log-date">{{ l.createdAt | date:'short' }}</span>
          </div>
        }
      </div>
      @if (logs().length === 0) {
        <p class="muted">No log entries yet.</p>
      }
    </mat-card>
  `,
  styles: [`
    .muted { color: var(--nvs-text-muted); margin-bottom: 1rem; }
    .log-list { max-height: 60vh; overflow: auto; }
    .log-row { padding: 0.5rem 0; border-bottom: 1px solid var(--nvs-border); display: flex; gap: 1rem; align-items: center; font-size: 0.9rem; }
    .log-type { font-weight: 600; min-width: 80px; }
    .log-msg { flex: 1; }
    .log-date { color: var(--nvs-text-muted); font-size: 0.85rem; }
  `],
})
export class LogsViewComponent implements OnInit {
  private api = inject(ApiService);
  logs = signal<any[]>([]);

  ngOnInit() {
    this.api.get<any[]>('admin/logs').subscribe({ next: (list) => this.logs.set(list), error: () => this.logs.set([]) });
  }
}
