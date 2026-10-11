import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'tickets', loadComponent: () => import('./features/tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent) },
      { path: 'tickets/new', loadComponent: () => import('./features/tickets/ticket-new/ticket-new.component').then(m => m.TicketNewComponent) },
      { path: 'tickets/:id', loadComponent: () => import('./features/tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent) },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['owner', 'system_support', 'admin'] },
        children: [
          { path: '', loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
          { path: 'announcements', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/announcements-admin/announcements-admin.component').then(m => m.AnnouncementsAdminComponent) },
          { path: 'announcements/new', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/announcement-new/announcement-new.component').then(m => m.AnnouncementNewComponent) },
          { path: 'authorization', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/authorization/authorization.component').then(m => m.AuthorizationComponent) },
          { path: 'firm-assignment', canActivate: [roleGuard], data: { roles: ['owner', 'system_support', 'admin'] }, loadComponent: () => import('./features/admin/firm-assignment/firm-assignment.component').then(m => m.FirmAssignmentComponent) },
          { path: 'firms', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/firms-management/firms-management.component').then(m => m.FirmsManagementComponent) },
          { path: 'products', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/products-management/products-management.component').then(m => m.ProductsManagementComponent) },
          { path: 'logs', canActivate: [roleGuard], data: { roles: ['owner'] }, loadComponent: () => import('./features/admin/logs-unified/logs-unified.component').then(m => m.LogsUnifiedComponent) },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
