import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';

interface TicketStats {
  active: number;
  closed: number;
  pending: number;
  byPriority: Record<string, number>;
  byRequestType: Record<string, number>;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  answered: 'Answered',
  closed: 'Closed',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    FormsModule,
    RouterLink,
  ],
  template: `
    <div class="page-wrapper dashboard-page">
      <div class="dashboard-actions nvs-dashboard-toolbar">
        <div class="search-filters">
           <select class="custom-select scope-select" [ngModel]="searchScope()" (ngModelChange)="searchScope.set($event)">
             <option value="Customer">Customer</option>
             <option value="All">All</option>
             <option value="Assignee">Assignee</option>
             <option value="Case number">Case number</option>
           </select>
           <input type="text" class="custom-input search-input" 
                  placeholder="Search..." 
                  [ngModel]="searchTerm()" 
                  (ngModelChange)="searchTerm.set($event)">
        </div>
        <button mat-raised-button color="primary" routerLink="/tickets/new" class="btn-ask-question">ASK A QUESTION</button>
      </div>

      <div class="stats-panel nvs-card nvs-priority-strip">
        <div class="nvs-priority-row">
          @for (code of ['S1','S2','S3','S4','S5']; track code) {
            <div class="nvs-pri-tile" [ngClass]="'nvs-pri-' + code.toLowerCase()">
              <span class="nvs-pri-count">{{ getOpenPriorityCount(code) }}</span>
              <span class="nvs-pri-code">{{ code }}</span>
              <span class="nvs-pri-hint">open</span>
            </div>
          }
        </div>
      </div>

      @if (announcementsLoading()) {
        <p class="dash-announce-loading">Announcements…</p>
      } @else if (announcements().length > 0) {
        <div class="dash-announce-banner" role="region" aria-label="Announcements">
          <div class="dash-announce-banner-accent" aria-hidden="true"></div>
          <div class="dash-announce-banner-head">
            <mat-icon class="dash-announce-megaphone" aria-hidden="true">campaign</mat-icon>
            <div class="dash-announce-head-text">
              <span class="dash-announce-kicker">Latest</span>
              <span class="dash-announce-heading">Announcements</span>
            </div>
          </div>
          <div class="dash-announce-track">
            @for (a of announcements(); track a.id) {
              <div class="dash-announce-card" tabindex="0">
                <span class="dash-announce-card-title">{{ a.title }}</span>
                <p class="dash-announce-card-body">{{ announceSnippet(a.content, 96) }}</p>
                @if (isOwner()) {
                  <button type="button" class="dash-announce-remove" (click)="removeAnnouncement($event, a.id)" aria-label="Remove announcement">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }

      <div class="dashboard-layout">
        <div class="dashboard-main">
          <div class="section-header">
            <h2 class="section-title">{{ caseListSectionTitle() }}</h2>
            <div class="sort-controls">
              <span>Sort</span>
              <select class="custom-select small" [ngModel]="sortOption()" (ngModelChange)="sortOption.set($event)">
                <option value="caseNo">Case number</option>
                <option value="customerCode">Customer code</option>
                <option value="customerName">Customer company name</option>
                <option value="subject">Case subject</option>
                <option value="type">Case type</option>
                <option value="dateDesc">Opened date (newest first)</option>
                <option value="dateAsc">Opened time (oldest first)</option>
              </select>
            </div>
          </div>
          
          @if (loading()) {
            <p>Loading...</p>
          } @else if (filteredTickets().length === 0) {
            <div class="case-list-empty">
              No records found.
            </div>
          } @else {
             <ul class="ticket-list-inner">
              @for (t of filteredTickets(); track t.id) {
                <li>
                  <div class="case-item">
                     <div class="case-left-box" [ngClass]="'box-' + (t.priority?.code || 's3') | lowercase">
                       <span class="box-severity">{{ t.priority?.code || '—' }}</span>
                       <span class="box-count">{{ t.replyCount || 0 }}</span>
                       <span class="box-label">Replies</span>
                     </div>
                     <div class="case-content">
                       <div class="case-header case-header-row">
                         <a [routerLink]="['/tickets', t.id]" class="case-subject">{{ t.subject }}</a>
                         @if (isOwner()) {
                           <button type="button" mat-icon-button class="case-assign-trigger" [matMenuTriggerFor]="assignMenu" aria-label="Assign to support team">
                             <mat-icon>more_vert</mat-icon>
                           </button>
                           <mat-menu #assignMenu="matMenu">
                             <button mat-menu-item disabled type="button" class="assign-menu-title">Assign to support team</button>
                             @for (u of assignableSupport(); track u.id) {
                               <button mat-menu-item type="button" (click)="assignTicketTo(t.id, u.id)">{{ u.fullName }}</button>
                             }
                             @if (!assignableSupport().length) {
                               <button mat-menu-item disabled type="button" class="assign-menu-empty">List is loading or empty</button>
                             }
                           </mat-menu>
                         }
                       </div>
                       <div class="case-row">
                         <span class="case-meta-label">Created by:</span> <span class="case-meta-val">{{ t.user?.fullName }}</span>,
                         <span class="case-meta-label">Assignee:</span> <span class="case-meta-val">{{ t.assignedTo?.fullName || '—' }}</span>
                       </div>
                       <div class="case-row">
                         <span class="case-meta-label">Priority:</span>
                         <span class="case-severity-text" [ngClass]="'text-' + (t.priority?.code || 's3') | lowercase">
                           {{ t.priority?.code || '—' }} {{ t.priority?.label ? ('— ' + t.priority.label) : '' }}
                         </span>
                         @if (t.requestType?.label) {
                           <span class="case-meta-label">, Request type:</span>
                           <span class="case-meta-val">{{ t.requestType.label }}</span>
                         }
                         <span class="case-meta-label">, Activity status:</span>
                         <span class="case-status-text" [ngClass]="'status-text-' + (t.status)">
                           {{ getStatusLabel(t.status) }}
                         </span>
                       </div>
                       <div class="case-row company-row">
                         {{ t.firmResponsible || t.user?.firm?.name || '—' }}
                       </div>
                       <div class="case-row footer-row">
                         <span class="product-info">
                           {{ t.catalogProduct?.name || t.productGroup || t.product || '—' }}
                           @if (t.module) { · {{ t.module }} }
                         </span>
                         <a [routerLink]="['/tickets', t.id]" class="read-more">Read more >>></a>
                       </div>
                     </div>
                     <div class="case-right">
                       <div class="case-company-right">{{ t.firmResponsible || t.user?.firm?.name || '—' }}</div>
                       <div class="case-time">{{ t.updatedAt | date:'shortDate' }}</div>
                     </div>
                  </div>
                </li>
              }
            </ul>
          }



      </div>

        <aside class="dashboard-sidebar">
          <div class="sidebar-section">
            <h3 class="sidebar-title">Filters <mat-icon class="close-icon" (click)="clearFilters()">close</mat-icon></h3>
            <ul class="filter-list">
              <li [class.active]="activeFilter() === 'my'" (click)="setFilter('my')">
                <a href="javascript:void(0)" title="Created by me">Created by me @if(activeFilter() === 'my'){<mat-icon>close</mat-icon>}</a>
              </li>
              <li [class.active]="activeFilter() === 'followed'" (click)="setFilter('followed')">
                <a href="javascript:void(0)">Following @if(activeFilter() === 'followed'){<mat-icon>close</mat-icon>}</a>
              </li>
              <li [class.active]="activeFilter() === 'company'" (click)="setFilter('company')">
                <a href="javascript:void(0)">My company's cases @if(activeFilter() === 'company'){<mat-icon>close</mat-icon>}</a>
              </li>
            </ul>
            <hr class="sidebar-divider">
             <ul class="filter-list">
              <li [class.active]="statusFilter() === 'open'" (click)="setStatusFilter('open')">
                <a href="javascript:void(0)">Open cases @if(statusFilter() === 'open'){<mat-icon>close</mat-icon>}</a>
              </li>
              <li [class.active]="statusFilter() === 'closed'" (click)="setStatusFilter('closed')">
                <a href="javascript:void(0)">Closed cases @if(statusFilter() === 'closed'){<mat-icon>close</mat-icon>}</a>
              </li>
            </ul>
             <hr class="sidebar-divider">
             <ul class="filter-list">
              <li [class.active]="statusFilter() === 'answered'" (click)="setStatusFilter('answered')">
                <a href="javascript:void(0)">Answered @if(statusFilter() === 'answered'){<mat-icon>close</mat-icon>}</a>
              </li>
              <li [class.active]="statusFilter() === 'unanswered'" (click)="setStatusFilter('unanswered')">
                 <a href="javascript:void(0)">Unanswered @if(statusFilter() === 'unanswered'){<mat-icon>close</mat-icon>}</a>
              </li>
            </ul>
             <hr class="sidebar-divider">
             <ul class="filter-list">
               <li><span class="filter-header">Priority</span></li>
               @for (p of ['S1','S2','S3','S4','S5']; track p) {
                 <li [class.active]="priorityFilter() === p" (click)="setPriorityFilter(p)">
                   <a href="javascript:void(0)">{{ p }} @if(priorityFilter() === p){<mat-icon>close</mat-icon>}</a>
                 </li>
               }
             </ul>
             <hr class="sidebar-divider">
             <ul class="filter-list">
               <li><span class="filter-header">Request type</span></li>
               <li [class.active]="requestTypeFilter() === 'SORUN'" (click)="setRequestTypeFilter('SORUN')">
                 <a href="javascript:void(0)">Issue report @if(requestTypeFilter() === 'SORUN'){<mat-icon>close</mat-icon>}</a>
               </li>
               <li [class.active]="requestTypeFilter() === 'ISTEK'" (click)="setRequestTypeFilter('ISTEK')">
                 <a href="javascript:void(0)">Feature request @if(requestTypeFilter() === 'ISTEK'){<mat-icon>close</mat-icon>}</a>
               </li>
             </ul>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { padding: 1rem; max-width: 1400px; margin: 0 auto; color: var(--nvs-text); }
    
    .dashboard-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .search-filters { display: flex; gap: 0.5rem; flex: 1; margin-right: 1rem; min-width: 200px; }
    .custom-select { padding: 0.5rem; border: 1px solid var(--nvs-border, #ccc); background: var(--nvs-bg, #fff); color: var(--nvs-text); min-width: 120px; }
    .custom-input { padding: 0.5rem; border: 1px solid var(--nvs-border, #ccc); background: var(--nvs-bg, #fff); color: var(--nvs-text); flex: 1; }

    .stats-panel.nvs-priority-strip {
      margin-bottom: 1.25rem;
      padding: 1rem 1.25rem 1.25rem;
    }
    .dash-announce-loading { color: var(--nvs-text-muted); font-size: 0.8125rem; margin: 0 0 0.65rem; }
    .dash-announce-banner {
      position: relative;
      display: flex;
      align-items: stretch;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
      padding: 0.85rem 1rem 0.85rem 0;
      border-radius: var(--nvs-radius);
      border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--nvs-card-border));
      background:
        radial-gradient(ellipse 120% 180% at 0% 50%, rgba(245, 158, 11, 0.14) 0%, transparent 55%),
        radial-gradient(ellipse 80% 120% at 100% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 45%),
        linear-gradient(165deg, color-mix(in srgb, var(--nvs-card) 88%, #1e293b) 0%, var(--nvs-card) 100%);
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.08),
        0 12px 40px rgba(0, 0, 0, 0.22),
        0 0 48px rgba(245, 158, 11, 0.08);
      overflow: hidden;
      animation: dashAnnouncePulse 4.5s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .dash-announce-banner,
      [data-theme="light"] .dash-announce-banner {
        animation: none;
      }
    }
    @keyframes dashAnnouncePulse {
      0%, 100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.08), 0 12px 40px rgba(0, 0, 0, 0.22), 0 0 42px rgba(245, 158, 11, 0.06); }
      50% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.14), 0 14px 44px rgba(0, 0, 0, 0.26), 0 0 56px rgba(245, 158, 11, 0.12); }
    }
    @keyframes dashAnnouncePulseLight {
      0%, 100% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.25), 0 10px 32px rgba(15, 23, 42, 0.08); }
      50% { box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.45), 0 14px 36px rgba(15, 23, 42, 0.1); }
    }
    [data-theme="light"] .dash-announce-banner {
      background:
        radial-gradient(ellipse 100% 160% at 0% 50%, rgba(251, 191, 36, 0.2) 0%, transparent 50%),
        linear-gradient(180deg, #fffefb 0%, var(--nvs-card) 100%);
      box-shadow:
        0 0 0 1px rgba(245, 158, 11, 0.25),
        0 10px 32px rgba(15, 23, 42, 0.08);
      animation: dashAnnouncePulseLight 4.5s ease-in-out infinite;
    }
    .dash-announce-banner-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 40%, #ea580c 100%);
      box-shadow: 0 0 18px rgba(251, 191, 36, 0.5);
    }
    .dash-announce-banner-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding-left: 0.85rem;
      border-right: 1px solid color-mix(in srgb, var(--nvs-border) 70%, transparent);
      padding-right: 0.85rem;
    }
    .dash-announce-megaphone {
      font-size: 2rem !important;
      width: 2rem !important;
      height: 2rem !important;
      color: #fbbf24 !important;
      filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.45));
    }
    .dash-announce-head-text { display: flex; flex-direction: column; gap: 0.1rem; line-height: 1.15; }
    .dash-announce-kicker {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #f59e0b;
    }
    .dash-announce-heading {
      font-size: 1.05rem;
      font-weight: 750;
      letter-spacing: -0.03em;
      color: var(--nvs-text);
    }
    .dash-announce-track {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      overflow-x: auto;
      overflow-y: hidden;
      flex: 1;
      min-width: 0;
      padding-right: 0.35rem;
      scrollbar-width: thin;
    }
    .dash-announce-card {
      position: relative;
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      max-width: min(280px, 72vw);
      min-width: 200px;
      padding: 0.55rem 2.15rem 0.55rem 0.65rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--nvs-primary) 28%, var(--nvs-card-border));
      background: color-mix(in srgb, var(--nvs-card) 94%, rgba(59, 130, 246, 0.06));
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .dash-announce-card:hover {
      transform: translateY(-2px) scale(1.01);
      border-color: color-mix(in srgb, var(--nvs-primary) 50%, var(--nvs-card-border));
      box-shadow: 0 8px 28px rgba(59, 130, 246, 0.18);
    }
    .dash-announce-card-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--nvs-text);
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .dash-announce-card-body {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.4;
      color: var(--nvs-text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .dash-announce-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: color-mix(in srgb, var(--nvs-card) 85%, transparent);
      color: var(--nvs-text-muted);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .dash-announce-remove:hover { background: rgba(239, 68, 68, 0.15); color: var(--nvs-error); }
    .dash-announce-remove .mat-icon { font-size: 16px; width: 16px; height: 16px; }
    @media (max-width: 640px) {
      .dash-announce-banner { flex-wrap: wrap; padding-bottom: 0.65rem; }
      .dash-announce-banner-head {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid color-mix(in srgb, var(--nvs-border) 70%, transparent);
        padding-bottom: 0.65rem;
        margin-bottom: 0.15rem;
      }
      .dash-announce-track { padding-top: 0.35rem; width: 100%; }
    }
    .case-header-row { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
    .case-header-row .case-subject { flex: 1; min-width: 0; }
    .case-assign-trigger { flex-shrink: 0; width: 36px; height: 36px; padding: 0; }
    .assign-menu-title { font-size: 0.75rem; font-weight: 600; color: var(--nvs-text-muted); opacity: 1 !important; cursor: default !important; }
    .assign-menu-empty { font-size: 0.8125rem; color: var(--nvs-text-muted); opacity: 1 !important; }

    .dashboard-layout { display: flex; gap: 2rem; }
    .dashboard-main { flex: 1; }
    .dashboard-sidebar { width: 300px; flex-shrink: 0; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--nvs-border, #ddd);
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
      color: var(--nvs-text);
    }
    .section-title { font-size: 1.5rem; font-weight: normal; margin: 0; }
    .case-list-empty { padding: 1rem; color: #666; }

    .ticket-list-inner { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
    .ticket-card { cursor: pointer; transition: box-shadow 0.2s ease; margin-bottom: 10px; }
    
    .case-item {
      display: flex;
      background: var(--nvs-card, #fff);
      border: 1px solid var(--nvs-card-border, #eee);
      border-radius: var(--nvs-radius-sm, 10px);
      padding: 12px 14px;
      gap: 15px;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .case-item:hover { box-shadow: var(--nvs-shadow); border-color: color-mix(in srgb, var(--nvs-primary) 35%, var(--nvs-card-border)); }
    .case-left-box {
      width: 50px;
      height: 50px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .box-s1 { background-color: #dc2626; } 
    .box-s2 { background-color: #ea580c; }
    .box-s3 { background-color: #ca8a04; }
    .box-s4 { background-color: #a16207; }
    .box-s5 { background-color: #6b7280; }
    
    .box-severity { font-size: 14px; line-height: 1; }
    .box-count { font-size: 16px; line-height: 1; }
    .box-label { font-size: 9px; text-transform: uppercase; }

    .case-content { flex: 1; min-width: 0; }
    .case-header { margin-bottom: 4px; }
    .case-subject { color: #0056b3; font-weight: bold; font-size: 15px; text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    :host-context(.dark-theme) .case-subject { color: #60a5fa; }
    
    .case-subject:hover { text-decoration: underline; }
    
    .case-row { font-size: 12px; color: var(--nvs-text-muted, #444); margin-bottom: 3px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .company-row { color: #0056b3; font-weight: 600; text-transform: uppercase; }
    :host-context(.dark-theme) .company-row { color: #60a5fa; }

    .footer-row { color: #666; font-size: 11px; display: flex; gap: 10px; }
    :host-context(.dark-theme) .footer-row { color: #aaa; }
    
    .case-meta-label { color: #666; }
    :host-context(.dark-theme) .case-meta-label { color: #aaa; }
    
    .case-meta-val { color: #d9534f; }
    :host-context(.dark-theme) .case-meta-val { color: #f87171; }
    
    .text-s1 { color: #dc2626; font-weight: bold; }
    .text-s2 { color: #ea580c; font-weight: bold; }
    .text-s3 { color: #ca8a04; font-weight: bold; }
    .text-s4 { color: #a16207; font-weight: bold; }
    .text-s5 { color: #6b7280; font-weight: bold; }
    
    .status-text-open { color: #d9534f; }
    .status-text-answered { color: #16a34a; }
    
    .read-more { color: #0056b3; text-decoration: none; cursor: pointer; white-space: nowrap; }
    :host-context(.dark-theme) .read-more { color: #60a5fa; }
    
    .case-right { text-align: right; font-size: 12px; display: flex; flex-direction: column; justify-content: space-between; min-width: 120px; padding-left: 10px; flex-shrink: 0; }
    .case-company-right { color: #d9534f; font-weight: bold; text-transform: uppercase; font-size: 11px; margin-top: auto; }
    :host-context(.dark-theme) .case-company-right { color: #f87171; }
    
    .case-time { color: #888; text-decoration: underline; margin-top: 2px; }

    .sidebar-title {
      font-size: 1.1rem;
      border-bottom: 1px solid var(--nvs-border, #eee);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--nvs-text-muted, #555);
    }
    .close-icon { font-size: 16px; width: 16px; height: 16px; cursor: pointer; }
    .filter-list { list-style: none; padding: 0; margin: 0 0 1rem 0; }
    .filter-list li { margin-bottom: 0.25rem; cursor: pointer; }
    .filter-list a { text-decoration: none; color: var(--nvs-text, #333); font-size: 0.9rem; display: block; padding: 2px 0;}
    .filter-list li.active a {
      background-color: #00a0df;
      color: white;
      padding: 2px 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .filter-header { font-weight: bold; font-size: 0.85rem; color: var(--nvs-text-muted, #666); display: block; margin-bottom: 0.25rem; }
    .sidebar-divider { border: 0; border-top: 1px solid var(--nvs-border, #eee); margin: 1rem 0; }

    .ranking-section { margin-top: 2rem; }
    .ranking-title { font-size: 1.1rem; font-weight: bold; margin-bottom: 1rem; color: var(--nvs-text); }
    .ranking-table-container { background: var(--nvs-card, #fff); border: 1px solid var(--nvs-border, #eee); border-radius: 4px; overflow: hidden; }
    .ranking-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .ranking-table th { background: var(--nvs-bg-secondary, #f8f9fa); color: var(--nvs-text-muted, #666); font-weight: 600; text-align: left; padding: 10px 15px; border-bottom: 1px solid var(--nvs-border, #eee); }
    .ranking-table td { padding: 10px 15px; border-bottom: 1px solid var(--nvs-border, #eee); color: var(--nvs-text); }
    .ranking-table tr:last-child td { border-bottom: none; }
    .badge-s1 { background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
    
    :host-context(.dark-theme) .ranking-table th { background: #333; color: #aaa; }
    :host-context(.dark-theme) .badge-s1 { background: #1e3a8a; color: #93c5fd; }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  stats = signal<TicketStats | null>(null);
  openPriorityCounts = signal<Record<string, number>>({ S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 });
  tickets = signal<any[]>([]);
  loading = signal(true);
  announcements = signal<any[]>([]);
  announcementsLoading = signal(true);
  assignableSupport = signal<{ id: string; fullName: string }[]>([]);
  protected STATUS_LABEL = STATUS_LABEL;

  activeFilter = signal<string>('');
  statusFilter = signal<string | null>(null);
  priorityFilter = signal<string | null>(null);
  requestTypeFilter = signal<string | null>(null);

  searchScope = signal<string>('Customer');
  searchTerm = signal<string>('');

  sortOption = signal<string>('dateDesc');

  filteredTickets = computed(() => {
    let list = this.tickets();

    const term = this.searchTerm().toLowerCase();
    const scope = this.searchScope();

    if (term) {
      list = list.filter(t => {
        if (scope === 'Customer') {
          return (
            t.customerName?.toLowerCase().includes(term) ||
            t.user?.firm?.name?.toLowerCase().includes(term) ||
            t.user?.fullName?.toLowerCase().includes(term)
          );
        }
        if (scope === 'Assignee') return t.assignedTo?.fullName?.toLowerCase().includes(term);
        if (scope === 'Case number') return t.id.toString().includes(term);
        return t.subject.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.id.toString().includes(term);
      });
    }

    const s = this.statusFilter();
    if (s === 'open') {
      list = list.filter(t => t.status !== 'closed');
    } else if (s === 'closed') {
      list = list.filter(t => t.status === 'closed');
    } else if (s === 'answered') {
      list = list.filter(t => t.status === 'answered');
    } else if (s === 'unanswered') {
      list = list.filter(t => t.status === 'open' || t.status === 'in_progress');
    }

    const af = this.activeFilter();
    if (af === 'my') {
      const me = this.auth.getCurrentUser()?.id;
      if (me) list = list.filter(t => t.userId === me);
    }
    if (af === 'company') {
      const fid = this.auth.getCurrentUser()?.firmId;
      if (fid) list = list.filter((t) => t.user?.firmId === fid);
      else list = list.filter((t) => t.userId === this.auth.getCurrentUser()?.id);
    }

    const p = this.priorityFilter();
    if (p) list = list.filter(t => (t.priority?.code ?? '') === p);

    const rt = this.requestTypeFilter();
    if (rt) list = list.filter(t => (t.requestType?.code ?? '') === rt);

    const sort = this.sortOption();
    list = [...list].sort((a, b) => {
      if (sort === 'caseNo') return b.id.localeCompare(a.id);
      if (sort === 'customerCode') return (a.customerCode || '').localeCompare(b.customerCode || '');
      if (sort === 'customerName') return (a.customerName || a.user?.firm?.name || '').localeCompare(b.customerName || b.user?.firm?.name || '');
      if (sort === 'subject') return a.subject.localeCompare(b.subject);
      if (sort === 'type') {
        const an = a.catalogProduct?.name || a.productGroup || '';
        const bn = b.catalogProduct?.name || b.productGroup || '';
        return an.localeCompare(bn);
      }
      if (sort === 'dateDesc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === 'dateAsc') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return 0;
    });

    return list;
  });

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.loading.set(true);
    this.api.get<TicketStats>('tickets/stats').subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set({ active: 0, closed: 0, pending: 0, byPriority: {}, byRequestType: {} }),
    });
    this.api.get<Record<string, number>>('tickets/open-by-priority').subscribe({
      next: (c) => this.openPriorityCounts.set(c || { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 }),
      error: () => this.openPriorityCounts.set({ S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 }),
    });

    this.api.get<any[]>(this.ticketsListUrl()).subscribe({
      next: (list) => { this.tickets.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.announcementsLoading.set(true);
    this.api.get<any[]>('announcements').subscribe({
      next: (list) => {
        this.announcements.set(Array.isArray(list) ? list : []);
        this.announcementsLoading.set(false);
      },
      error: () => {
        this.announcements.set([]);
        this.announcementsLoading.set(false);
      },
    });

    if (this.auth.getCurrentUser()?.role === 'owner') {
      this.api.get<{ id: string; fullName: string }[]>('tickets/owner/assignable-support').subscribe({
        next: (list) => this.assignableSupport.set(Array.isArray(list) ? list : []),
        error: () => this.assignableSupport.set([]),
      });
    } else {
      this.assignableSupport.set([]);
    }
  }

  announceSnippet(content: string | undefined, maxLen = 52): string {
    const c = (content || '').replace(/\s+/g, ' ').trim();
    if (c.length <= maxLen) return c;
    return c.slice(0, maxLen) + '…';
  }

  isOwner(): boolean {
    return this.auth.getCurrentUser()?.role === 'owner';
  }

  assignTicketTo(ticketId: string, userId: string) {
    this.api.put(`tickets/${ticketId}/assign`, { assignedToId: userId }).subscribe({
      next: () => this.refreshData(),
      error: (e) => alert(e?.error?.message || 'Assignment failed'),
    });
  }

  removeAnnouncement(ev: Event, id: string) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!confirm('Remove this announcement?')) return;
    this.api.delete(`announcements/${id}`).subscribe({
      next: () => this.announcements.update((list) => list.filter((a) => a.id !== id)),
      error: (e) => alert(e?.error?.message || 'Could not delete announcement'),
    });
  }

  getOpenPriorityCount(key: string): number {
    return this.openPriorityCounts()[key] ?? 0;
  }

  setFilter(f: string) {
    if (this.activeFilter() === f) this.activeFilter.set('');
    else this.activeFilter.set(f);
  }

  setStatusFilter(s: string) {
    if (this.statusFilter() === s) this.statusFilter.set(null);
    else this.statusFilter.set(s);
  }

  setPriorityFilter(p: string) {
    if (this.priorityFilter() === p) this.priorityFilter.set(null);
    else this.priorityFilter.set(p);
  }

  setRequestTypeFilter(rt: string) {
    if (this.requestTypeFilter() === rt) this.requestTypeFilter.set(null);
    else this.requestTypeFilter.set(rt);
  }

  clearFilters() {
    this.activeFilter.set('');
    this.statusFilter.set(null);
    this.priorityFilter.set(null);
    this.requestTypeFilter.set(null);
  }

  getStatusLabel(s: string): string {
    if (this.isStaff()) {
      return STATUS_LABEL[s] || s;
    }
    if (s === 'open' || s === 'in_progress') return 'Awaiting your response';
    if (s === 'answered') return 'Under review';
    return STATUS_LABEL[s] || s;
  }

  isStaff(): boolean {
    const r = this.auth.getCurrentUser()?.role;
    return r === 'owner' || r === 'system_support' || r === 'admin';
  }

  private ticketsListUrl(): string {
    return this.isStaff() ? 'tickets/admin/list' : 'tickets/my';
  }

  caseListSectionTitle(): string {
    return this.isStaff() ? 'All tickets' : "Cases";
  }
}
