import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '@app/services/api.service';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="page-wrapper">
      <a mat-button routerLink="/dashboard" class="back-link">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        <span>Back to dashboard</span>
      </a>

      @if (loading()) {
        <p class="state-message" role="status">Loading…</p>
      }

      @if (!loading() && ticket()) {
        <div class="ticket-layout">
          <div class="ticket-chat">
            <article class="nvs-card ticket-detail">
              <header class="ticket-detail-header">
                <h1 id="ticket-title" class="ticket-detail-title">{{ ticket()!.subject }}</h1>
                <span class="ticket-detail-status status-{{ ticket()!.status }}">{{ statusLabel(ticket()!.status) }}</span>
              </header>
              <div class="ticket-detail-desc">{{ ticket()!.description }}</div>

              <dl class="ticket-meta-dl" aria-label="Request details">
                <div class="ticket-meta-row"><dt>Customer</dt><dd>{{ ticket()!.customerName || ticket()!.user?.fullName || '—' }}</dd></div>
                <div class="ticket-meta-row"><dt>Company</dt><dd>{{ ticket()!.firmResponsible || ticket()!.user?.firm?.name || '—' }}</dd></div>
                <div class="ticket-meta-row"><dt>Product</dt><dd>{{ ticket()!.catalogProduct?.name || ticket()!.productGroup || ticket()!.product || '—' }}</dd></div>
                @if (ticket()!.module) {
                  <div class="ticket-meta-row"><dt>Module</dt><dd>{{ ticket()!.module }}</dd></div>
                }
              </dl>

              @if (ticketAttachments().length) {
                <section class="ticket-attachments" aria-label="Request attachments">
                  <h3 class="attachments-heading">Attachments</h3>
                  <ul class="attachment-list">
                    @for (a of ticketAttachments(); track a.id) {
                      <li class="attachment-item">
                        @if (isInlineImageMime(a.mimeType) && imageSafeUrls()[a.id]) {
                          <div class="attachment-image-block">
                            <img [src]="imageSafeUrls()[a.id]" [alt]="a.originalName" class="attachment-image" loading="lazy" />
                            <div class="attachment-image-meta">
                              <span>{{ a.originalName }}</span>
                              <span class="attachment-size">({{ formatSize(a.size) }})</span>
                              <button type="button" class="attachment-link small" (click)="downloadFile(a)">
                                <mat-icon aria-hidden="true">download</mat-icon>
                                Download
                              </button>
                            </div>
                          </div>
                        } @else {
                          <button type="button" class="attachment-link" (click)="downloadFile(a)">
                            <mat-icon aria-hidden="true">insert_drive_file</mat-icon>
                            <span>{{ a.originalName }}</span>
                            <span class="attachment-size">({{ formatSize(a.size) }})</span>
                          </button>
                        }
                      </li>
                    }
                  </ul>
                </section>
              }

              <section class="ticket-replies" aria-labelledby="replies-heading">
                <h2 id="replies-heading">Messages</h2>
                @for (r of ticket()!.replies || []; track r.id) {
                  <div class="reply-card" [class.reply-internal]="r.isInternal">
                    <div class="reply-meta">
                      <strong>{{ r.user?.fullName }}</strong>
                      @if (r.isInternal) {
                        <span class="reply-badge">Staff only</span>
                      }
                      <time [attr.datetime]="r.createdAt">{{ r.createdAt | date:'short' }}</time>
                      @if (isMyReply(r) && editingReplyId() !== r.id) {
                        <span class="reply-actions">
                          <button mat-icon-button type="button" aria-label="Edit" (click)="startEdit(r)">
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button mat-icon-button type="button" aria-label="Delete" (click)="deleteReply(r.id)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </span>
                      }
                    </div>
                    @if (editingReplyId() === r.id) {
                      <div class="reply-edit-box">
                        <textarea #editInput matInput [(ngModel)]="editContent" rows="3" class="edit-textarea"></textarea>
                        <div class="reply-edit-actions">
                          <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
                          <button mat-raised-button color="primary" type="button" (click)="saveEdit(r.id)" [disabled]="!editContent.trim()">Save</button>
                        </div>
                      </div>
                    } @else {
                      <div class="reply-content">{{ r.content }}</div>
                    }
                    @if (r.attachments?.length) {
                      <ul class="reply-attachments">
                        @for (a of r.attachments; track a.id) {
                          <li class="attachment-item">
                            @if (isInlineImageMime(a.mimeType) && imageSafeUrls()[a.id]) {
                              <div class="attachment-image-block reply-image">
                                <img [src]="imageSafeUrls()[a.id]" [alt]="a.originalName" class="attachment-image" loading="lazy" />
                                <div class="attachment-image-meta">
                                  <span class="reply-att-name">{{ a.originalName }}</span>
                                  <button type="button" class="attachment-link small" (click)="downloadFile(a)">
                                    <mat-icon aria-hidden="true">download</mat-icon>
                                    Download
                                  </button>
                                </div>
                              </div>
                            } @else {
                              <button type="button" class="attachment-link small" (click)="downloadFile(a)">
                                <mat-icon aria-hidden="true">attach_file</mat-icon>
                                {{ a.originalName }}
                              </button>
                            }
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
              </section>

              @if (canReply()) {
                <form [formGroup]="form" (ngSubmit)="sendReply()" class="reply-form" aria-label="Write reply">
                  <div class="reply-compose">
                    <mat-form-field appearance="outline" class="reply-field" subscriptSizing="dynamic">
                      <mat-label>Write your message</mat-label>
                      <textarea matInput formControlName="content" rows="3"></textarea>
                    </mat-form-field>
                    @if (isStaff()) {
                      <mat-checkbox formControlName="isInternal" class="internal-check">
                        Visible to staff only
                      </mat-checkbox>
                    }
                    <div class="reply-files-row">
                      <label for="reply-file-input" class="reply-file-label">
                        <mat-icon aria-hidden="true">attach_file</mat-icon>
                        Add files
                      </label>
                      <input id="reply-file-input" type="file" multiple class="reply-file-input" (change)="onReplyFiles($event)">
                      @if (replyFiles().length) {
                        <span class="reply-file-count">{{ replyFiles().length }} file(s)</span>
                      }
                    </div>
                    <div class="reply-submit-row">
                      <button mat-raised-button color="primary" type="submit" class="send-btn" [disabled]="form.invalid || sending()">
                        <mat-icon aria-hidden="true">send</mat-icon>
                        {{ sending() ? 'Sending…' : 'Submit' }}
                      </button>
                    </div>
                  </div>
                </form>
              }
            </article>
          </div>

          <aside class="ticket-sidebar">
            <div class="nvs-card ticket-info-card">
              <h3 class="ticket-info-title">Details</h3>
              <dl class="ticket-info-list">
                <dt>Opened by</dt>
                <dd>{{ ticket()!.user?.fullName || '—' }}</dd>
                <dt>Opened on</dt>
                <dd>{{ ticket()!.createdAt | date:'medium' }}</dd>
                <dt>Reason for opening</dt>
                <dd>{{ ticket()!.reason || '—' }}</dd>
                <dt>Assignees</dt>
                <dd>{{ ticket()!.assignedTo?.fullName || 'Unassigned' }}</dd>
                @if (ticket()!.closeRequestCancelReason && !ticket()!.closeRequestedAt) {
                  <dt>Last close cancellation</dt>
                  <dd class="cancel-reason-dd">{{ ticket()!.closeRequestCancelReason }}</dd>
                }
                <dt>Priority</dt>
                <dd>{{ ticket()!.priority ? (ticket()!.priority.code + ' — ' + ticket()!.priority.label) : '—' }}</dd>
                <dt>Request type</dt>
                <dd>{{ ticket()!.requestType?.label ?? '—' }}</dd>
              </dl>
              @if (ticket()!.status !== 'closed') {
                @if (isStaff() && ticket()!.closeRequestedAt) {
                  <p class="close-pending-msg">Waiting for company approval or cancellation. The cancellation reason appears in messages.</p>
                } @else if (isStaff() && !ticket()!.closeRequestedAt) {
                  <button mat-stroked-button color="warn" class="close-request-btn" (click)="requestClose()" type="button" [disabled]="requestingClose()">
                    <mat-icon>lock</mat-icon>
                    Send close request
                  </button>
                } @else if (isTicketOwner() && ticket()!.closeRequestedAt) {
                  <div class="close-confirm-box">
                    <p class="close-confirm-msg">Your request was marked as resolved. Confirm closing?</p>
                    <button mat-raised-button color="primary" class="confirm-close-btn" (click)="confirmClose()" type="button" [disabled]="confirmingClose()">
                      {{ confirmingClose() ? 'Confirming…' : 'Yes, close request' }}
                    </button>
                    <div class="cancel-close-section">
                      <p class="cancel-close-lead">If the issue is not resolved, cancel the close request. A reason is required; support will review your message and continue.</p>
                      <mat-form-field appearance="outline" class="cancel-reason-field" subscriptSizing="dynamic">
                        <mat-label>Cancellation reason</mat-label>
                        <textarea matInput rows="3" [(ngModel)]="cancelCloseReason" name="cancelCloseReason" placeholder="At least 8 characters"></textarea>
                      </mat-form-field>
                      <button mat-stroked-button color="accent" type="button" class="cancel-close-btn" (click)="cancelCloseRequest()" [disabled]="cancellingClose()">
                        {{ cancellingClose() ? 'Sending…' : 'Cancel close request' }}
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .back-link { margin-bottom: 1rem; }
    .state-message { padding: 2rem; color: var(--nvs-text-muted); }
    .ticket-layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
    @media (max-width: 900px) { .ticket-layout { grid-template-columns: 1fr; } }
    .ticket-detail-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .ticket-detail-title { margin: 0; font-size: 1.375rem; font-weight: 600; }
    .ticket-detail-status { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem; color: #fff; }
    .ticket-detail-status.status-open { background: #b45309; }
    .ticket-detail-status.status-in_progress { background: #2563eb; }
    .ticket-detail-status.status-answered { background: #15803d; }
    .ticket-detail-status.status-closed { background: #525252; }
    .ticket-detail-desc { white-space: pre-wrap; margin-bottom: 1rem; line-height: 1.5; }
    .ticket-meta-dl { margin: 0 0 1.25rem; padding: 0.75rem 1rem; border-radius: var(--nvs-radius-sm, 8px); background: color-mix(in srgb, var(--nvs-card) 88%, var(--nvs-primary) 6%); border: 1px solid var(--nvs-border); font-size: 0.875rem; }
    .ticket-meta-row { display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem 1rem; margin: 0.35rem 0; align-items: baseline; }
    .ticket-meta-row dt { margin: 0; color: var(--nvs-text-muted); font-weight: 600; }
    .ticket-meta-row dd { margin: 0; color: var(--nvs-text); }
    .ticket-attachments { margin-bottom: 1rem; }
    .attachments-heading { font-size: 0.95rem; margin: 0 0 0.5rem; color: var(--nvs-text-muted); }
    .attachment-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .attachment-image-block { border-radius: var(--nvs-radius-sm); border: 1px solid var(--nvs-border); overflow: hidden; background: var(--nvs-card); }
    .attachment-image-block.reply-image { margin-top: 0.35rem; }
    .attachment-image { display: block; width: 100%; max-width: min(100%, 720px); max-height: 420px; height: auto; object-fit: contain; background: rgba(0,0,0,0.2); }
    .attachment-image-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--nvs-text-muted); }
    .reply-att-name { color: var(--nvs-text); flex: 1; min-width: 0; word-break: break-all; }
    .attachment-link {
      display: inline-flex; align-items: center; gap: 0.35rem; background: none; border: none;
      color: var(--nvs-primary); cursor: pointer; font: inherit; padding: 0.25rem 0; text-align: left;
      transition: opacity 0.2s ease;
    }
    .attachment-link:hover { opacity: 0.85; text-decoration: underline; }
    .attachment-link.small { font-size: 0.875rem; }
    .attachment-link .mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .attachment-size { color: var(--nvs-text-muted); font-size: 0.8rem; }
    .reply-attachments { list-style: none; margin: 0.5rem 0 0; padding: 0; }
    .reply-files-row { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .reply-file-label { cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; color: var(--nvs-primary); font-size: 0.9rem; }
    .reply-file-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    .reply-file-count { font-size: 0.85rem; color: var(--nvs-text-muted); }
    .ticket-replies { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--nvs-border); }
    .ticket-replies h2 { font-size: 1.125rem; margin: 0 0 1rem; }
    .reply-card { background: rgba(0,0,0,0.03); padding: 1rem; border-radius: var(--nvs-radius-sm); margin-bottom: 0.75rem; animation: nvsFadeIn 0.3s ease; }
    @keyframes nvsFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .reply-card.reply-internal { border-left: 4px solid var(--nvs-warning); }
    .reply-meta { margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .reply-meta time { font-size: 0.875rem; color: var(--nvs-text-muted); }
    .reply-badge { font-size: 0.75rem; padding: 0.15rem 0.4rem; background: var(--nvs-warning); color: #000; border-radius: 4px; }
    .reply-content { line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .reply-form { margin-top: 1.5rem; }
    .reply-compose { border: 1px solid var(--nvs-border); border-radius: var(--nvs-radius-sm); padding: 1rem; background: var(--nvs-card); }
    .reply-form .reply-field { width: 100%; display: block; }
    .internal-check { display: block; margin: 0.5rem 0; }
    .reply-submit-row { margin-top: 0.75rem; display: flex; justify-content: flex-end; }
    .send-btn .mat-icon { margin-right: 0.35rem; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .reply-actions { margin-left: auto; }
    .reply-actions button { width: 36px; height: 36px; }
    .reply-edit-box { margin-top: 0.5rem; }
    .edit-textarea { width: 100%; min-height: 80px; padding: 0.5rem; border-radius: var(--nvs-radius-sm); border: 1px solid var(--nvs-border); background: var(--nvs-bg); color: var(--nvs-text); resize: vertical; }
    .reply-edit-actions { margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: flex-end; }
    .close-pending-msg { font-size: 0.875rem; color: var(--nvs-warning); margin: 1rem 0 0; }
    .close-request-btn { margin-top: 1rem; width: 100%; }
    .close-request-btn .mat-icon { margin-right: 0.25rem; }
    .close-confirm-box { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--nvs-border); }
    .close-confirm-msg { font-size: 0.9375rem; color: var(--nvs-text); margin: 0 0 0.75rem; }
    .confirm-close-btn { width: 100%; }
    .ticket-info-title { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
    .ticket-info-list { margin: 0; }
    .ticket-info-list dt { font-size: 0.75rem; color: var(--nvs-text-muted); margin-top: 0.75rem; }
    .ticket-info-list dt:first-child { margin-top: 0; }
    .ticket-info-list dd { margin: 0.25rem 0 0; font-size: 0.9375rem; }
    .cancel-reason-dd { font-size: 0.875rem; line-height: 1.45; white-space: pre-wrap; }
    .cancel-close-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--nvs-border); }
    .cancel-close-lead { font-size: 0.8125rem; color: var(--nvs-text-muted); margin: 0 0 0.75rem; line-height: 1.45; }
    .cancel-reason-field { width: 100%; display: block; margin-bottom: 0.5rem; }
    .cancel-close-btn { width: 100%; }
  `],
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  auth = inject(AuthService);
  private imageObjectUrls: Record<string, string> = {};
  imageSafeUrls = signal<Record<string, SafeUrl>>({});
  ticket = signal<any>(null);
  loading = signal(true);
  sending = signal(false);
  requestingClose = signal(false);
  confirmingClose = signal(false);
  cancellingClose = signal(false);
  cancelCloseReason = '';
  editingReplyId = signal<string | null>(null);
  editContent = '';
  replyFiles = signal<File[]>([]);
  form = this.fb.nonNullable.group({
    content: ['', Validators.required],
    isInternal: [false],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loadTicket(id);
  }

  ngOnDestroy() {
    this.revokeImageUrls();
  }

  loadTicket(id: string) {
    this.api.get<any>('tickets/' + id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.loading.set(false);
        this.loadImagePreviews(t, id);
      },
      error: () => this.loading.set(false),
    });
  }

  isInlineImageMime(mime: string | undefined): boolean {
    if (!mime?.startsWith('image/')) return false;
    if (mime.includes('svg')) return false;
    return true;
  }

  private revokeImageUrls() {
    for (const u of Object.values(this.imageObjectUrls)) {
      URL.revokeObjectURL(u);
    }
    this.imageObjectUrls = {};
    this.imageSafeUrls.set({});
  }

  private loadImagePreviews(t: any, ticketId: string) {
    this.revokeImageUrls();
    const items: { id: string }[] = [];
    const collect = (list: any[]) => {
      for (const a of list || []) {
        if (this.isInlineImageMime(a.mimeType)) items.push({ id: a.id });
      }
    };
    collect(t.attachments || []);
    for (const r of t.replies || []) collect(r.attachments || []);
    if (!items.length) return;

    forkJoin(
      items.map((item) =>
        this.api.getBlob(`tickets/${ticketId}/attachments/${item.id}/file`).pipe(
          map((blob) => ({ id: item.id, blob })),
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((results) => {
      const raw: Record<string, string> = {};
      const safe: Record<string, SafeUrl> = {};
      for (const r of results) {
        if (!r?.blob?.size) continue;
        const url = URL.createObjectURL(r.blob);
        raw[r.id] = url;
        safe[r.id] = this.sanitizer.bypassSecurityTrustUrl(url);
      }
      this.imageObjectUrls = raw;
      this.imageSafeUrls.set(safe);
    });
  }

  ticketAttachments() {
    const t = this.ticket();
    if (!t?.attachments?.length) return [];
    return t.attachments as { id: string; originalName: string; size: number; mimeType: string }[];
  }

  formatSize(n: number) {
    if (n == null || n < 0) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  onReplyFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      this.replyFiles.update((cur) => [...cur, ...Array.from(files)]);
    }
    input.value = '';
  }

  downloadFile(a: { id: string; originalName: string }) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.getBlob(`tickets/${id}/attachments/${a.id}/file`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = a.originalName || 'file';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Could not download file.'),
    });
  }

  isStaff(): boolean {
    const r = this.auth.getCurrentUser()?.role;
    return r === 'owner' || r === 'system_support' || r === 'admin';
  }

  canReply(): boolean {
    const t = this.ticket();
    if (!t) return false;
    const me = this.auth.getCurrentUser()?.id;
    return t.userId === me || this.isStaff();
  }

  statusLabel(s: string) {
    const map: Record<string, string> = { open: 'Open', in_progress: 'In progress', answered: 'Answered', closed: 'Closed' };
    return map[s] || s;
  }

  isTicketOwner(): boolean {
    const t = this.ticket();
    const me = this.auth.getCurrentUser()?.id;
    return !!t && t.userId === me;
  }

  isMyReply(r: { userId?: string }): boolean {
    const me = this.auth.getCurrentUser()?.id;
    return !!me && r.userId === me;
  }

  requestClose() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.requestingClose.set(true);
    this.api.post('tickets/' + id + '/request-close', {}).subscribe({
      next: () => { this.loadTicket(id); this.requestingClose.set(false); },
      error: () => this.requestingClose.set(false),
    });
  }

  confirmClose() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.confirmingClose.set(true);
    this.api.post('tickets/' + id + '/confirm-close', {}).subscribe({
      next: () => { this.loadTicket(id); this.confirmingClose.set(false); },
      error: () => this.confirmingClose.set(false),
    });
  }

  cancelCloseRequest() {
    const id = this.route.snapshot.paramMap.get('id');
    const reason = (this.cancelCloseReason || '').trim();
    if (!id) return;
    if (reason.length < 8) {
      alert('Cancellation reason must be at least 8 characters.');
      return;
    }
    this.cancellingClose.set(true);
    this.api.post('tickets/' + id + '/cancel-close-request', { reason }).subscribe({
      next: () => {
        this.cancelCloseReason = '';
        this.loadTicket(id);
        this.cancellingClose.set(false);
      },
      error: (e) => {
        this.cancellingClose.set(false);
        alert(e?.error?.message || 'Could not send cancellation.');
      },
    });
  }

  startEdit(r: { id: string; content: string }) {
    this.editingReplyId.set(r.id);
    this.editContent = r.content;
  }

  cancelEdit() {
    this.editingReplyId.set(null);
    this.editContent = '';
  }

  saveEdit(replyId: string) {
    const id = this.route.snapshot.paramMap.get('id');
    const content = this.editContent?.trim();
    if (!id || !content) return;
    this.api.patch('tickets/' + id + '/replies/' + replyId, { content }).subscribe({
      next: () => { this.editingReplyId.set(null); this.editContent = ''; this.loadTicket(id); },
      error: () => { },
    });
  }

  deleteReply(replyId: string) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.delete('tickets/' + id + '/replies/' + replyId).subscribe({
      next: () => this.loadTicket(id),
      error: () => { },
    });
  }

  sendReply() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.form.invalid) return;
    this.sending.set(true);
    const body = this.form.getRawValue();
    const files = this.replyFiles();
    this.api
      .post<{ id: string }>('tickets/' + id + '/replies', { content: body.content, isInternal: body.isInternal ?? false })
      .subscribe({
        next: (reply) => {
          if (!files.length) {
            this.form.reset({ content: '', isInternal: false });
            this.replyFiles.set([]);
            this.loadTicket(id);
            this.sending.set(false);
            return;
          }
          const fd = new FormData();
          files.forEach((f) => fd.append('files', f));
          this.api.postFormData(`tickets/${id}/replies/${reply.id}/attachments`, fd).subscribe({
            next: () => {
              this.form.reset({ content: '', isInternal: false });
              this.replyFiles.set([]);
              this.loadTicket(id);
              this.sending.set(false);
            },
            error: () => this.sending.set(false),
          });
        },
        error: () => this.sending.set(false),
      });
  }
}
