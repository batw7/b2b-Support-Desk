import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-announcements-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-wrapper admin-content-page">
      <nav class="breadcrumb" aria-label="Location">
        <a routerLink="/admin">Admin</a>
        <span aria-hidden="true">/</span>
        <span>Announcements</span>
      </nav>
      <header class="page-header page-header--row">
        <div>
          <h1 class="page-title">Announcements</h1>
          <p class="page-lead">All announcements (active/inactive). Only Owner can add new announcements.</p>
        </div>
        @if (isOwner()) {
          <a mat-raised-button color="primary" routerLink="/admin/announcements/new">New announcement</a>
        }
      </header>

      @if (loading()) {
        <p class="state-message" role="status">Loading…</p>
      }

      @if (!loading() && announcements().length === 0) {
        <section class="nvs-card empty-message">
          <mat-icon aria-hidden="true">campaign</mat-icon>
          <p>No announcements yet.</p>
        </section>
      }

      @if (!loading() && announcements().length > 0) {
        <section class="admin-list-section" aria-label="Announcement list">
          <ul class="admin-list">
            @for (a of announcements(); track a.id) {
              <li>
                <article class="nvs-card admin-list-card">
                  <h2 class="admin-list-card-title">{{ a.title }}</h2>
                  <p class="admin-list-card-meta">
                    <span class="admin-list-card-badge" [class.is-active]="a.isActive">{{ a.isActive ? 'Active' : 'Inactive' }}</span>
                    @if (a.staffOnly) {
                      <span class="admin-list-card-badge badge-staff">Staff only</span>
                    }
                  </p>
                  @if (a.content) {
                    <p class="admin-list-card-content">{{ (a.content || '') | slice:0:200 }}{{ (a.content || '').length > 200 ? '…' : '' }}</p>
                  }
                </article>
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
    .admin-list-card { padding: 1.25rem; }
    .admin-list-card-title { margin: 0 0 0.5rem; font-size: 1.0625rem; font-weight: 600; }
    .admin-list-card-badge { display: inline-block; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: #f1f5f9; }
    .admin-list-card-badge.is-active { background: #d1fae5; color: #065f46; }
    .admin-list-card-badge.badge-staff { margin-left: 0.35rem; background: rgba(59, 130, 246, 0.2); color: var(--nvs-primary); }
    .page-header--row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .admin-list-card-meta { margin: 0; font-size: 0.875rem; color: var(--nvs-text-muted); }
    .admin-list-card-content { margin-top: 0.75rem; font-size: 0.9375rem; color: var(--nvs-text-muted); line-height: 1.5; }
  `],
})
export class AnnouncementsAdminComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  announcements = signal<any[]>([]);
  loading = signal(true);

  isOwner(): boolean {
    return this.auth.getCurrentUser()?.role === 'owner';
  }

  ngOnInit() {
    this.api.get<any[]>('announcements/admin').subscribe({
      next: (list) => { this.announcements.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
