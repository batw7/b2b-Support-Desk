import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <header class="page-header">
        <h1 class="page-title">Announcements</h1>
        <p class="page-lead">System updates, maintenance, and important news.</p>
      </header>

      @if (loading()) {
        <p class="state-message" role="status">Loading…</p>
      }

      @if (!loading() && announcements().length === 0) {
        <p class="state-message">No announcements yet.</p>
      }

      @if (!loading() && announcements().length > 0) {
        <section class="announcements-section" aria-label="Announcement list">
          <ul class="announcements-list">
            @for (a of announcements(); track a.id) {
              <li>
                <article class="nvs-card announcement-card">
                  <header class="announcement-header">
                    <mat-icon [class]="'announcement-icon type-' + a.type" aria-hidden="true">info</mat-icon>
                    <h2 class="announcement-title">{{ a.title }}</h2>
                  </header>
                  <div class="announcement-content" [innerHTML]="a.content"></div>
                  <time class="announcement-date" [attr.datetime]="a.createdAt">{{ a.createdAt | date:'longDate' }}</time>
                </article>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: [`
    .state-message { text-align: center; padding: 2rem; color: var(--nvs-text-muted); }
    .announcements-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
    .announcement-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .announcement-icon { font-size: 1.75rem; width: 1.75rem; height: 1.75rem; }
    .type-urgent { color: var(--nvs-error); }
    .type-maintenance { color: var(--nvs-warning); }
    .announcement-title { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .announcement-content { line-height: 1.6; }
    .announcement-date { display: block; margin-top: 0.75rem; font-size: 0.875rem; color: var(--nvs-text-muted); }
  `],
})
export class AnnouncementsComponent implements OnInit {
  private api = inject(ApiService);
  announcements = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.get<any[]>('announcements').subscribe({
      next: (list) => {
        this.announcements.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
