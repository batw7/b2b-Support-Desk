import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';

interface FirmRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-firms-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-wrapper nvs-animate-in">
      <header class="page-header">
        <h1 class="page-title">Company catalog</h1>
        <p class="page-lead">
          Create registered company names. The support team can assign users to these companies.
        </p>
      </header>

      <mat-card class="nvs-card add-card">
        <form [formGroup]="createForm" (ngSubmit)="createFirm()" class="add-row">
          <mat-form-field appearance="outline" class="add-field" subscriptSizing="dynamic">
            <mat-label>Company name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. ACME Inc.">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || saving()">
            <mat-icon>add_business</mat-icon>
            Save
          </button>
        </form>
      </mat-card>

      <mat-card class="nvs-card">
        <h2 class="section-title">Registered companies</h2>
        @if (loading()) {
          <p class="muted">Loading…</p>
        } @else if (firms().length === 0) {
          <p class="muted">No companies added yet.</p>
        } @else {
          <ul class="firm-list">
            @for (f of firms(); track f.id) {
              <li class="firm-row">
                @if (editingId() === f.id) {
                  <mat-form-field appearance="outline" class="edit-field" subscriptSizing="dynamic">
                    <input matInput [formControl]="editControl" (keydown.enter)="saveEdit(f.id); $event.preventDefault()">
                  </mat-form-field>
                  <div class="firm-actions">
                    <button mat-button type="button" color="primary" (click)="saveEdit(f.id)">Save</button>
                    <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
                  </div>
                } @else {
                  <span class="firm-name">{{ f.name }}</span>
                  <div class="firm-actions">
                    <button mat-stroked-button type="button" (click)="startEdit(f)">
                      <mat-icon>edit</mat-icon>
                      Edit
                    </button>
                    <button mat-stroked-button type="button" color="warn" (click)="removeFirm(f)">
                      <mat-icon>delete</mat-icon>
                      Delete
                    </button>
                  </div>
                }
              </li>
            }
          </ul>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .add-card { margin-bottom: 1.25rem; }
    .add-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; }
    .add-field { flex: 1; min-width: 220px; margin: 0; }
    .firm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .firm-row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--nvs-border);
    }
    .firm-row:last-child { border-bottom: none; }
    .firm-name { font-weight: 500; flex: 1; min-width: 0; }
    .firm-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .edit-field { flex: 1; min-width: 200px; margin: 0; }
    .muted { color: var(--nvs-text-muted); margin: 0; }
  `],
})
export class FirmsManagementComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  firms = signal<FirmRow[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<string | null>(null);
  editControl = this.fb.nonNullable.control('', [Validators.required]);

  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.get<FirmRow[]>('firms').subscribe({
      next: (list) => {
        this.firms.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => {
        this.firms.set([]);
        this.loading.set(false);
      },
    });
  }

  createFirm() {
    if (this.createForm.invalid) return;
    this.saving.set(true);
    const name = this.createForm.get('name')!.value.trim();
    this.api.post<FirmRow>('firms', { name }).subscribe({
      next: () => {
        this.createForm.reset({ name: '' });
        this.load();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  startEdit(f: FirmRow) {
    this.editingId.set(f.id);
    this.editControl.setValue(f.name);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(id: string) {
    if (this.editControl.invalid) return;
    const name = this.editControl.value.trim();
    this.api.patch<FirmRow>('firms/' + id, { name }).subscribe({
      next: () => {
        this.editingId.set(null);
        this.load();
      },
    });
  }

  removeFirm(f: FirmRow) {
    if (!confirm('Delete company “' + f.name + '”? Company links will be removed from users.')) return;
    this.api.delete('firms/' + f.id).subscribe({ next: () => this.load() });
  }
}
