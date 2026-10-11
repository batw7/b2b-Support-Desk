import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '@app/services/auth.service';
import { ThemeService } from '@app/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <div class="app-wrapper">
      <header class="app-header" role="banner">
        <a routerLink="/dashboard" class="app-brand" aria-label="Go to home">
          <span class="app-brand-icon-wrap" aria-hidden="true">
            <mat-icon class="app-brand-icon">headset_mic</mat-icon>
          </span>
          <span class="app-brand-lockup">
            <span class="app-brand-title">Nevers</span>
            <span class="app-brand-divider"></span>
            <span class="app-brand-tag">Support</span>
          </span>
        </a>

        <nav class="app-nav" aria-label="Main menu">
          <div class="app-nav-pill">
            <a
              mat-button
              routerLink="/dashboard"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-link"
            >
              <mat-icon aria-hidden="true">space_dashboard</mat-icon>
              <span>Home</span>
            </a>
            <a mat-button routerLink="/announcements" routerLinkActive="active" class="nav-link">
              <mat-icon aria-hidden="true">campaign</mat-icon>
              <span>Announcements</span>
            </a>
          </div>

          <button mat-button [matMenuTriggerFor]="supportMenu" class="nav-link nav-link-menu">
            <mat-icon aria-hidden="true">add_circle_outline</mat-icon>
            <span>New request</span>
            <mat-icon class="nav-chevron" aria-hidden="true">expand_more</mat-icon>
          </button>
          <mat-menu #supportMenu="matMenu" class="support-create-menu">
            <a mat-menu-item routerLink="/tickets/new" [queryParams]="{ requestType: 'SORUN' }">
              <mat-icon>report_problem</mat-icon>
              Issue report
            </a>
            <a mat-menu-item routerLink="/tickets/new" [queryParams]="{ requestType: 'ISTEK' }">
              <mat-icon>lightbulb_outline</mat-icon>
              Feature request
            </a>
          </mat-menu>

          @if (isStaff()) {
            <a mat-button routerLink="/admin" routerLinkActive="active" class="nav-link nav-admin">
              <mat-icon aria-hidden="true">admin_panel_settings</mat-icon>
              <span>Admin</span>
            </a>
          }
        </nav>

        <div class="app-header-actions">
          <button
            mat-icon-button
            (click)="theme.toggle()"
            [attr.aria-label]="theme.theme() === 'dark' ? 'Light theme' : 'Dark theme'"
            title="{{ theme.theme() === 'dark' ? 'Light theme' : 'Dark theme' }}"
            class="header-icon-btn"
          >
            <mat-icon aria-hidden="true">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <mat-divider vertical class="header-v-divider" />
          <a mat-button routerLink="/profile" class="app-header-user">
            <mat-icon aria-hidden="true">person</mat-icon>
            <span class="app-header-user-name">{{ auth.getCurrentUser()?.fullName }}</span>
          </a>
        </div>
      </header>
      <main class="app-main" role="main">
        <div class="app-outlet" [class.app-outlet--anim]="outletAnim()">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
    .app-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      min-height: 60px;
      padding: 0.4rem 1rem 0.4rem 1rem;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--nvs-tab-bar) 94%, transparent) 0%,
        color-mix(in srgb, var(--nvs-tab-bar) 78%, transparent) 100%
      );
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid color-mix(in srgb, var(--nvs-border) 55%, transparent);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
      color: var(--nvs-text);
      flex-shrink: 0;
    }
    .app-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      color: inherit;
      padding: 0.35rem 0.65rem 0.35rem 0.35rem;
      border-radius: var(--nvs-radius);
      transition: background 0.2s ease, box-shadow 0.2s ease;
      flex-shrink: 0;
      border: 1px solid transparent;
    }
    .app-brand:hover {
      background: color-mix(in srgb, var(--nvs-primary) 8%, transparent);
      border-color: color-mix(in srgb, var(--nvs-primary) 22%, transparent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--nvs-primary) 12%, transparent);
    }
    .app-brand-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: linear-gradient(145deg, color-mix(in srgb, var(--nvs-card) 40%, #1e3a8a) 0%, color-mix(in srgb, var(--nvs-primary) 55%, #312e81) 100%);
      border: 1px solid color-mix(in srgb, var(--nvs-primary) 45%, transparent);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.12) inset,
        0 6px 18px rgba(37, 99, 235, 0.28);
    }
    .app-brand-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
      color: #e0e7ff !important;
    }
    [data-theme="light"] .app-brand-icon-wrap {
      background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
      border-color: #93c5fd;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.15);
    }
    [data-theme="light"] .app-brand-icon {
      color: #1d4ed8 !important;
    }
    .app-brand-lockup {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .app-brand-title {
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: var(--nvs-text);
    }
    .app-brand-divider {
      width: 1px;
      height: 1.125rem;
      background: var(--nvs-border);
      flex-shrink: 0;
    }
    .app-brand-tag {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--nvs-text-muted);
      white-space: nowrap;
    }
    @media (max-width: 480px) {
      .app-brand-tag { display: none; }
      .app-brand-divider { display: none; }
    }

    .app-nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      flex: 1;
      min-width: 0;
      justify-content: center;
    }
    @media (max-width: 960px) {
      .app-nav { order: 3; width: 100%; justify-content: flex-start; }
    }
    .app-nav-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.2rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--nvs-surface) 55%, transparent);
      border: 1px solid color-mix(in srgb, var(--nvs-border) 40%, transparent);
    }
    .app-nav .nav-link.mat-mdc-button,
    .app-nav .nav-link-menu.mat-mdc-button {
      border-radius: 999px !important;
      min-width: auto;
      padding: 0 0.85rem;
      height: 38px;
      color: var(--nvs-text);
      font-weight: 500;
      font-size: 0.875rem;
    }
    .app-nav .nav-link .mat-icon,
    .app-nav .nav-link-menu .mat-icon {
      margin-right: 0.35rem;
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
      color: var(--nvs-text-muted);
    }
    .app-nav .nav-link.active {
      background: rgba(59, 130, 246, 0.18) !important;
      color: #93c5fd !important;
    }
    .app-nav .nav-link.active .mat-icon { color: #93c5fd; }
    .nav-chevron { margin-left: 0.1rem !important; margin-right: 0 !important; font-size: 1.1rem !important; width: 1.1rem !important; height: 1.1rem !important; opacity: 0.75; }
    .nav-admin {
      color: #a5b4fc !important;
      border: 1px solid rgba(99, 102, 241, 0.35);
      background: rgba(99, 102, 241, 0.08) !important;
    }
    .nav-admin.active { background: rgba(99, 102, 241, 0.22) !important; }

    .app-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
      margin-left: auto;
    }
    .header-icon-btn { color: var(--nvs-text); }
    .header-v-divider { height: 28px; margin: 0 0.25rem; border-color: var(--nvs-border) !important; }
    .app-header-user {
      color: var(--nvs-text);
      max-width: 200px;
    }
    .app-header-user .mat-icon { margin-right: 0.35rem; color: var(--nvs-text-muted); }
    .app-header-user-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .app-main {
      flex: 1;
      min-height: calc(100vh - 56px);
      padding: 1.5rem;
      background: var(--nvs-surface);
      color: var(--nvs-text);
      overflow: auto;
    }
    .app-outlet { min-height: 100%; }
    .app-outlet--anim { animation: outletFade 0.38s cubic-bezier(0.22, 1, 0.36, 1); }
    @keyframes outletFade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: none; }
    }
    @media (max-width: 600px) {
      .app-header-user-name { display: none; }
      .app-nav-pill .nav-link span:not(.mat-icon) { display: none; }
      .app-nav-pill .nav-link .mat-icon { margin-right: 0; }
    }
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);
  outletAnim = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.outletAnim.set(false);
        requestAnimationFrame(() => this.outletAnim.set(true));
      });
  }

  isStaff(): boolean {
    const r = this.auth.getCurrentUser()?.role;
    return r === 'owner' || r === 'system_support' || r === 'admin';
  }
}
