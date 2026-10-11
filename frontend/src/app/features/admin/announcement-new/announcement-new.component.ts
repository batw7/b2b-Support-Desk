import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-announcement-new',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="page-wrapper">
      <nav class="breadcrumb" aria-label="Location">
        <a routerLink="/admin">Admin</a>
        <span aria-hidden="true">/</span>
        <a routerLink="/admin/announcements">Announcements</a>
        <span aria-hidden="true">/</span>
        <span>New announcement</span>
      </nav>
      <header class="page-header">
        <h1 class="page-title">Add announcement</h1>
        <p class="page-lead">The announcement is saved to the database.</p>
      </header>
      <mat-card class="nvs-card">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" placeholder="Announcement title">
              @if (form.get('title')?.invalid && form.get('title')?.touched) {
                <mat-error>Title is required</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Content</mat-label>
              <textarea matInput formControlName="content" rows="6" placeholder="Announcement text"></textarea>
              @if (form.get('content')?.invalid && form.get('content')?.touched) {
                <mat-error>Content is required</mat-error>
              }
            </mat-form-field>
            <label class="staff-only-row">
              <mat-checkbox formControlName="staffOnly">Show to staff only (Owner and Support team)</mat-checkbox>
            </label>
            <p class="field-hint">When checked, the announcement is visible only to authorized accounts; when unchecked, to all users.</p>
            @if (errorMessage()) {
              <p class="error-msg" role="alert">{{ errorMessage() }}</p>
            }
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
              <a mat-button routerLink="/admin/announcements">Cancel</a>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .breadcrumb { font-size: 0.875rem; color: var(--nvs-text-muted); margin-bottom: 1rem; }
    .breadcrumb a { color: var(--nvs-primary); text-decoration: none; }
    .full-width { width: 100%; display: block; }
    .error-msg { color: var(--nvs-error); font-size: 0.875rem; margin: 0.5rem 0; }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .staff-only-row { display: block; margin: 0.5rem 0 0.25rem; }
    .field-hint { font-size: 0.8125rem; color: var(--nvs-text-muted); margin: 0 0 0.5rem; line-height: 1.45; }
  `],
})
export class AnnouncementNewComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    staffOnly: [false],
  });
  saving = signal(false);
  errorMessage = signal('');

  onSubmit() {
    if (this.form.invalid) return;
    this.errorMessage.set('');
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api.post('announcements', {
      title: raw.title,
      content: raw.content,
      staffOnly: !!raw.staffOnly,
    }).subscribe({
      next: () => this.router.navigate(['/admin/announcements']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || err?.message || 'Could not save.');
      },
      complete: () => this.saving.set(false),
    });
  }
}
