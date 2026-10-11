import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';

interface ProductRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-products-management',
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
        <h1 class="page-title">Product catalog</h1>
        <p class="page-lead">
          Define product / product group names for the request form. Only Owner can edit.
        </p>
      </header>

      <mat-card class="nvs-card add-card">
        <form [formGroup]="createForm" (ngSubmit)="createProduct()" class="add-row">
          <mat-form-field appearance="outline" class="add-field" subscriptSizing="dynamic">
            <mat-label>Product name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. V3 ERP">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || saving()">
            <mat-icon>inventory_2</mat-icon>
            Save
          </button>
        </form>
      </mat-card>

      <mat-card class="nvs-card">
        <h2 class="section-title">Registered products</h2>
        @if (loading()) {
          <p class="muted">Loading…</p>
        } @else if (products().length === 0) {
          <p class="muted">No products added yet.</p>
        } @else {
          <ul class="prod-list">
            @for (p of products(); track p.id) {
              <li class="prod-row">
                @if (editingId() === p.id) {
                  <mat-form-field appearance="outline" class="edit-field" subscriptSizing="dynamic">
                    <input matInput [formControl]="editControl" (keydown.enter)="saveEdit(p.id); $event.preventDefault()">
                  </mat-form-field>
                  <div class="prod-actions">
                    <button mat-button type="button" color="primary" (click)="saveEdit(p.id)">Save</button>
                    <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
                  </div>
                } @else {
                  <span class="prod-name">{{ p.name }}</span>
                  <div class="prod-actions">
                    <button mat-stroked-button type="button" (click)="startEdit(p)">
                      <mat-icon>edit</mat-icon>
                      Edit
                    </button>
                    <button mat-stroked-button type="button" color="warn" (click)="removeProduct(p)">
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
    .prod-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .prod-row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--nvs-border);
    }
    .prod-row:last-child { border-bottom: none; }
    .prod-name { font-weight: 500; flex: 1; min-width: 0; }
    .prod-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .edit-field { flex: 1; min-width: 200px; margin: 0; }
    .muted { color: var(--nvs-text-muted); margin: 0; }
  `],
})
export class ProductsManagementComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  products = signal<ProductRow[]>([]);
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
    this.api.get<ProductRow[]>('products').subscribe({
      next: (list) => {
        this.products.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }

  createProduct() {
    if (this.createForm.invalid) return;
    this.saving.set(true);
    const name = this.createForm.get('name')!.value.trim();
    this.api.post<ProductRow>('products', { name }).subscribe({
      next: () => {
        this.createForm.reset({ name: '' });
        this.load();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  startEdit(p: ProductRow) {
    this.editingId.set(p.id);
    this.editControl.setValue(p.name);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(id: string) {
    if (this.editControl.invalid) return;
    this.api.patch<ProductRow>('products/' + id, { name: this.editControl.value.trim() }).subscribe({
      next: () => {
        this.editingId.set(null);
        this.load();
      },
    });
  }

  removeProduct(p: ProductRow) {
    if (!confirm('Delete product “' + p.name + '”?')) return;
    this.api.delete('products/' + p.id).subscribe({ next: () => this.load() });
  }
}
