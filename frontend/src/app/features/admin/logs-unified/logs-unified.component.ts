import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';

type LogEntry = {
  id?: string;
  type?: string;
  message?: string;
  createdAt?: string;
  ip?: string;
  actorName?: string;
  [k: string]: unknown;
};
type StatusInfo = { ok: boolean; time: string } | null;

@Component({
  selector: 'app-logs-unified',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatIconModule],
  template: `
    <div class="page-wrapper nvs-animate-in">
      <header class="page-header">
        <h1 class="page-title">Logs</h1>
        <p class="page-lead">Combined API and user activity log; optional server status.</p>
      </header>

      <mat-tab-group class="logs-tabs" animationDuration="0ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">history</mat-icon>
            Logs
          </ng-template>
          <div class="tab-content">
            <div class="log-list">
              @for (l of logs(); track l.id || $index) {
                <div class="log-row log-row--stack">
                  <div class="log-main">
                    @if (l.type && l.type !== 'api') {
                      <span class="log-type">{{ l.type }}</span>
                    }
                    <span class="log-msg">{{ l.message || '—' }}</span>
                  </div>
                  <div class="log-meta">
                    <span class="log-actor" title="Actor">{{ l.actorName || '—' }}</span>
                    <span class="log-ip" title="IP">{{ l.ip || '—' }}</span>
                    <span class="log-date">{{ l.createdAt | date:'short' }}</span>
                  </div>
                </div>
              }
              @if (logs().length === 0 && !loadingLogs()) {
                <p class="muted">No logs yet.</p>
              }
              @if (loadingLogs()) {
                <p class="muted">Loading…</p>
              }
            </div>
          </div>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">info</mat-icon>
            Status
          </ng-template>
          <div class="tab-content">
            <mat-card class="nvs-card status-card">
              @if (status()) {
                <p><strong>Status:</strong> {{ status()?.ok ? 'Running' : 'Unknown' }}</p>
                <p><strong>Server time:</strong> {{ status()?.time | date:'medium' }}</p>
              } @else if (loadingStatus()) {
                <p class="muted">Loading…</p>
              } @else {
                <p class="muted">Could not load status.</p>
              }
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .tab-icon { margin-right: 0.5rem; vertical-align: middle; font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .tab-content { padding: 1rem 0; }
    .log-list { max-height: 65vh; overflow: auto; }
    .log-row { padding: 0.65rem 0; border-bottom: 1px solid var(--nvs-border); font-size: 0.9rem; }
    .log-row--stack { display: flex; flex-direction: column; gap: 0.35rem; align-items: stretch; }
    @media (min-width: 720px) {
      .log-row--stack { flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    }
    .log-main { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: baseline; flex: 1; min-width: 0; }
    .log-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; color: var(--nvs-text-muted); font-size: 0.8rem; }
    .log-type { font-weight: 600; min-width: 56px; }
    .log-msg { flex: 1; word-break: break-word; min-width: 0; }
    .log-actor { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .log-ip { font-family: ui-monospace, monospace; }
    .log-date { flex-shrink: 0; }
    .muted { color: var(--nvs-text-muted); }
    .status-card p { margin: 0.5rem 0; }
  `],
})
export class LogsUnifiedComponent implements OnInit {
  private api = inject(ApiService);
  logs = signal<LogEntry[]>([]);
  status = signal<StatusInfo>(null);
  loadingLogs = signal(true);
  loadingStatus = signal(true);

  ngOnInit() {
    this.api.get<LogEntry[]>('admin/logs', { limit: 400 }).subscribe({
      next: (list) => {
        this.logs.set(Array.isArray(list) ? list : []);
        this.loadingLogs.set(false);
      },
      error: () => {
        this.logs.set([]);
        this.loadingLogs.set(false);
      },
    });
    this.api.get<StatusInfo>('admin/logs/status').subscribe({
      next: (s) => {
        this.status.set(s);
        this.loadingStatus.set(false);
      },
      error: () => this.loadingStatus.set(false),
    });
  }
}
