import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';
import { map, switchMap, of } from 'rxjs';

export interface TicketPriority { id: string; code: string; label: string; sortOrder: number; }
export interface TicketRequestType { id: string; code: string; label: string; }
export interface ProductRow { id: string; name: string; }

@Component({
  selector: 'app-ticket-new',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-wrapper">
      <header class="page-header">
        <h1 class="page-title">New support request</h1>
      </header>

      <div class="form-layout">
        <div class="form-main">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ticket-form">
            <section class="form-section">
              <div class="readonly-block nvs-card">
                <p><strong>Customer:</strong> {{ customerLine() }}</p>
                <p><strong>Case owner (company):</strong> {{ firmLine() }}</p>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Subject</mat-label>
                <input matInput formControlName="subject" placeholder="Short title">
                @if (form.get('subject')?.invalid && form.get('subject')?.touched) {
                  <mat-error>Subject is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Product</mat-label>
                <mat-select formControlName="productId">
                  @for (p of products(); track p.id) {
                    <mat-option [value]="p.id">{{ p.name }}</mat-option>
                  }
                </mat-select>
                @if (!products().length) {
                  <mat-hint>If the list is empty, add products under Owner → Admin → Product catalog.</mat-hint>
                }
                @if (form.get('productId')?.invalid && form.get('productId')?.touched) {
                  <mat-error>Select a product</mat-error>
                }
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Priority</mat-label>
                  <mat-select formControlName="priorityId">
                    <mat-option [value]="null">Select</mat-option>
                    @for (p of priorities(); track p.id) {
                      <mat-option [value]="p.id">{{ p.code }} — {{ p.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Request type</mat-label>
                  <mat-select formControlName="requestTypeId">
                    <mat-option [value]="null">Select</mat-option>
                    @for (r of requestTypes(); track r.id) {
                      <mat-option [value]="r.id">{{ r.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="10" placeholder="Describe your issue in detail"></textarea>
                @if (form.get('description')?.invalid && form.get('description')?.touched) {
                  <mat-error>Description is required</mat-error>
                }
              </mat-form-field>

              <div class="file-upload-section">
                <label for="file-upload" class="file-upload-label">
                  <mat-icon>attach_file</mat-icon> Add files
                </label>
                <input type="file" id="file-upload" multiple (change)="onFileSelected($event)">
                <span class="file-info">{{ selectedFiles().length }} file(s) selected</span>
                @if (selectedFiles().length) {
                  <div class="file-chip-list">
                    @for (f of selectedFiles(); track $index) {
                      <span class="file-chip">{{ f.name }}</span>
                    }
                  </div>
                }
              </div>

              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
                  {{ submitting() ? 'Sending…' : 'Submit' }}
                </button>
              </div>
            </section>
          </form>
        </div>

        <aside class="form-sidebar">
          <div class="info-box">
            <h3>Submission checklist</h3>
            <p class="info-red">Please check:</p>
            <ul>
              <li>Did you select the correct product? (Admin → Product catalog)</li>
              <li>Are the subject and description clear enough?</li>
              <li>Did you attach a screenshot or log?</li>
            </ul>
            <p class="info-red">Reminder:</p>
            <ul>
              <li>Use <strong>Feature request</strong> for requests and <strong>Issue report</strong> for bugs from the menu.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 20px; max-width: 1200px; margin: 0 auto; }
    .page-title { font-size: 24px; margin-bottom: 20px; border-bottom: 1px solid var(--nvs-border); padding-bottom: 10px; color: var(--nvs-text); }
    .form-layout { display: flex; gap: 30px; flex-wrap: wrap; }
    .form-main { flex: 1; min-width: 300px; }
    .form-sidebar { width: 320px; flex-shrink: 0; }
    .readonly-block { padding: 1rem 1.25rem; margin-bottom: 1rem; font-size: 0.9375rem; line-height: 1.6; }
    .readonly-block p { margin: 0.35rem 0; color: var(--nvs-text); }
    .full-width { width: 100%; display: block; margin-bottom: 15px; }
    .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
    .half-width { flex: 1; min-width: 0; }
    .info-box { background: var(--nvs-surface, #f5f5f5); padding: 15px; border: 1px solid var(--nvs-border, #ddd); color: var(--nvs-text, #333); }
    .info-box h3 { background: #444; color: #fff; padding: 10px; margin: -15px -15px 15px -15px; text-align: center; font-size: 14px; }
    .info-red { color: #ef4444; font-weight: bold; margin-bottom: 8px; font-size: 13px; }
    .info-box ul { padding-left: 20px; margin-bottom: 15px; font-size: 12px; line-height: 1.5; color: var(--nvs-text-muted, #555); }
    :host-context(.dark-theme) .info-box { background: #2d2d2d; border-color: #444; color: #eee; }
    :host-context(.dark-theme) .info-box ul { color: #ccc; }
    :host-context(.dark-theme) .info-box h3 { background: #1a1a1a; }
    .form-actions { text-align: right; margin-top: 20px; border-top: 2px solid #00a0df; padding-top: 20px; }
    .form-actions button { min-width: 120px; }
    .file-upload-section { margin-top: 10px; margin-bottom: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .file-upload-label { cursor: pointer; display: inline-flex; align-items: center; gap: 5px; color: #00a0df; font-weight: 500; }
    .file-upload-label:hover { text-decoration: underline; color: #38bdf8; }
    #file-upload { display: none; }
    .file-info { font-size: 0.9rem; color: var(--nvs-text-muted); }
    .file-chip-list { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; margin-top: 6px; }
    .file-chip { font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; background: var(--nvs-card); border: 1px solid var(--nvs-border); color: var(--nvs-text-muted); }
  `],
})
export class TicketNewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  form = this.fb.group({
    subject: ['', Validators.required],
    productId: ['', Validators.required],
    module: [''],
    priorityId: [null as string | null],
    requestTypeId: [null as string | null],
    description: ['', Validators.required],
  });

  submitting = signal(false);
  selectedFiles = signal<File[]>([]);
  priorities = signal<TicketPriority[]>([]);
  requestTypes = signal<TicketRequestType[]>([]);
  products = signal<ProductRow[]>([]);

  customerLine = computed(() => this.auth.getCurrentUser()?.fullName ?? '—');
  firmLine = computed(() => this.auth.getCurrentUser()?.firmName?.trim() || 'No company assigned yet');

  ngOnInit() {
    this.api.get<TicketPriority[]>('tickets/priorities').subscribe({
      next: (list) => this.priorities.set(list),
      error: () => this.priorities.set([]),
    });
    this.api.get<TicketRequestType[]>('tickets/request-types').subscribe({
      next: (list) => {
        this.requestTypes.set(list);
        const code = this.route.snapshot.queryParamMap.get('requestType');
        if (code) {
          const match = list.find((r) => r.code === code);
          if (match) this.form.patchValue({ requestTypeId: match.id });
        }
      },
      error: () => this.requestTypes.set([]),
    });
    this.api.get<ProductRow[]>('products').subscribe({
      next: (list) => this.products.set(Array.isArray(list) ? list : []),
      error: () => this.products.set([]),
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      this.selectedFiles.update((current) => [...current, ...Array.from(files)]);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      subject: raw.subject,
      description: raw.description,
      productId: raw.productId,
      priorityId: raw.priorityId || null,
      requestTypeId: raw.requestTypeId || null,
    };
    const files = this.selectedFiles();
    this.api
      .post<{ id: string }>('tickets', payload)
      .pipe(
        switchMap((created) => {
          if (!files.length) return of(created);
          const fd = new FormData();
          files.forEach((f) => fd.append('files', f));
          return this.api.postFormData(`tickets/${created.id}/attachments`, fd).pipe(map(() => created));
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err: { status?: number; error?: { message?: string }; message?: string }) => {
          this.submitting.set(false);
          if (err.status === 401) return;
          alert('Error: ' + (err.error?.message || err.message || 'Unknown error'));
        },
        complete: () => this.submitting.set(false),
      });
  }
}
