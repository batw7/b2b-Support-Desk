import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '@app/services/auth.service';
import { ApiService } from '@app/services/api.service';

interface SupportRankRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  closedCount: number;
  activeCount: number;
  byPriority: Record<string, number>;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatTableModule],
  template: `
    <div class="page-wrapper admin-page nvs-animate-in">
      <header class="page-header">
        <h1 class="page-title">Admin panel</h1>
        <p class="page-lead">{{ pageLead() }}</p>
      </header>

      <section class="admin-stats-section" aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="section-title">{{ isOwner() ? 'Support team ranking' : 'Your team — ranking' }}</h2>
        <mat-card class="nvs-card stats-card stats-card-bg">
          @if (ranking().length) {
            <table mat-table [dataSource]="ranking()" class="stats-table">
              <ng-container matColumnDef="rank">
                <th mat-header-cell *matHeaderCellDef>Rank</th>
                <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
              </ng-container>
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let row">{{ row.fullName }}</td>
              </ng-container>
              <ng-container matColumnDef="closedCount">
                <th mat-header-cell *matHeaderCellDef>Closed tickets</th>
                <td mat-cell *matCellDef="let row">{{ row.closedCount }}</td>
              </ng-container>
              <ng-container matColumnDef="activeCount">
                <th mat-header-cell *matHeaderCellDef>Active / in review</th>
                <td mat-cell *matCellDef="let row">{{ row.activeCount }}</td>
              </ng-container>
              <ng-container matColumnDef="byPriority">
                <th mat-header-cell *matHeaderCellDef>Priority (S1–S5)</th>
                <td mat-cell *matCellDef="let row">
                  <span class="priority-pills">
                    @for (p of ['S1','S2','S3','S4','S5']; track p) {
                      @if ((row.byPriority?.[p] ?? 0) > 0) {
                        <span class="pill">{{ p }}: {{ row.byPriority[p] }}</span>
                      }
                    }
                  </span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          } @else {
            <p class="stats-empty">No data yet.</p>
          }
        </mat-card>
      </section>

      <section class="admin-cards" aria-label="Admin sections">
        <ul class="admin-cards-grid">
          @if (isOwner()) {
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/firms">
                <mat-icon class="admin-card-icon" aria-hidden="true">domain_add</mat-icon>
                <h3 class="admin-card-title">Company catalog</h3>
                <p class="admin-card-desc">Define company names (Owner).</p>
              </a>
            </li>
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/products">
                <mat-icon class="admin-card-icon" aria-hidden="true">inventory_2</mat-icon>
                <h3 class="admin-card-title">Product catalog</h3>
                <p class="admin-card-desc">Manage products available on the request form (Owner).</p>
              </a>
            </li>
          }
          @if (isOwner()) {
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/authorization">
                <mat-icon class="admin-card-icon" aria-hidden="true">admin_panel_settings</mat-icon>
                <h3 class="admin-card-title">Authorization</h3>
                <p class="admin-card-desc">Grant Support team access to registered users (Owner).</p>
              </a>
            </li>
          }
          @if (showFirmAssignment()) {
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/firm-assignment">
                <mat-icon class="admin-card-icon" aria-hidden="true">manage_accounts</mat-icon>
                <h3 class="admin-card-title">Company assignment</h3>
                <p class="admin-card-desc">Link company users to registered companies.</p>
              </a>
            </li>
          }
          @if (isOwner()) {
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/logs">
                <mat-icon class="admin-card-icon" aria-hidden="true">list_alt</mat-icon>
                <h3 class="admin-card-title">Logs</h3>
                <p class="admin-card-desc">System and API records (Owner).</p>
              </a>
            </li>
          }
          @if (isOwner()) {
            <li>
              <a class="admin-card nvs-card" routerLink="/admin/announcements">
                <mat-icon class="admin-card-icon" aria-hidden="true">campaign</mat-icon>
                <h3 class="admin-card-title">Announcements</h3>
                <p class="admin-card-desc">Announcement list and new announcements (Owner).</p>
              </a>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .admin-cards-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; align-items: stretch; }
    .admin-cards-grid > li { display: flex; min-height: 168px; }
    .admin-card { display: flex; flex-direction: column; flex: 1; min-height: 100%; padding: 1.5rem; text-decoration: none; color: inherit; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; border: 1px solid var(--nvs-card-border); border-radius: var(--nvs-radius); box-sizing: border-box; }
    .admin-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.18); transform: translateY(-3px); border-color: rgba(59, 130, 246, 0.35); }
    .admin-card-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #3b82f6; margin-bottom: 0.75rem; }
    .admin-card-title { margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 600; }
    .admin-card-desc { margin: 0; font-size: 0.875rem; color: var(--nvs-text-muted); line-height: 1.5; }
    .admin-stats-section { margin-bottom: 2rem; }
    .stats-card { overflow: auto; }
    .stats-card-bg { background: var(--nvs-sidebar) !important; color: #fff !important; }
    .stats-card-bg .mat-mdc-table,
    .stats-card-bg .mat-mdc-header-row,
    .stats-card-bg .mat-mdc-row,
    .stats-card-bg table,
    .stats-card-bg tbody,
    .stats-card-bg thead,
    .stats-card-bg tr,
    .stats-card-bg .mat-mdc-cell,
    .stats-card-bg .mat-mdc-header-cell { background: var(--nvs-sidebar) !important; color: #fff !important; border-color: var(--nvs-border) !important; }
    .stats-card-bg .stats-table th,
    .stats-card-bg .stats-table td,
    .stats-card-bg .stats-empty { color: #fff !important; }
    .stats-table { width: 100%; }
    .stats-table th, .stats-table td { color: var(--nvs-text); }
    .priority-pills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .priority-pills .pill { font-size: 0.75rem; padding: 0.15rem 0.4rem; background: var(--nvs-border); border-radius: 4px; color: #fff; }
    .stats-empty { margin: 0; padding: 1rem; color: rgba(255,255,255,0.8); }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  ranking = signal<SupportRankRow[]>([]);
  displayedColumns = ['rank', 'fullName', 'closedCount', 'activeCount', 'byPriority'];

  ngOnInit() {
    this.api.get<SupportRankRow[]>('tickets/admin/support-ranking').subscribe({
      next: (r) => this.ranking.set(r),
      error: () => {},
    });
  }

  isOwner(): boolean {
    return this.auth.getCurrentUser()?.role === 'owner';
  }

  showFirmAssignment(): boolean {
    const r = this.auth.getCurrentUser()?.role;
    return r === 'owner' || r === 'system_support' || r === 'admin';
  }

  pageLead(): string {
    return this.isOwner()
      ? 'Access authorization, company and product catalogs, announcements, and logs from here.'
      : 'Company assignment and team ranking. Other admin areas are available to Owner only.';
  }
}
