import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-api-log',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <h1 class="page-title">API Log</h1>
    <mat-card>
      <div class="log-list">
        @for (l of logs(); track l.id) {
          <div class="log-row">
            <span class="log-msg">{{ l.message }}</span>
            <span class="log-date">{{ l.createdAt | date:'short' }}</span>
          </div>
        }
      </div>
      @if (logs().length === 0) {
        <p class="muted">No API log entries yet.</p>
      }
    </mat-card>
  `,
  styles: [`
    .muted { color: var(--nvs-text-muted); }
    .log-list { max-height: 60vh; overflow: auto; }
    .log-row { padding: 0.5rem 0; border-bottom: 1px solid var(--nvs-border); display: flex; justify-content: space-between; font-size: 0.9rem; }
    .log-date { color: var(--nvs-text-muted); font-size: 0.85rem; }
  `],
})
export class ApiLogComponent implements OnInit {
  private api = inject(ApiService);
  logs = signal<any[]>([]);

  ngOnInit() {
    this.api.get<any[]>('admin/logs?type=api').subscribe({ next: (list) => this.logs.set(list), error: () => this.logs.set([]) });
  }
}
