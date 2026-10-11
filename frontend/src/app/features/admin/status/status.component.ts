import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <h1 class="page-title">Status</h1>
    <mat-card>
      @if (status()) {
        <p><strong>Status:</strong> Running</p>
        <p><strong>Time:</strong> {{ status()?.time }}</p>
      } @else {
        <p>Loading...</p>
      }
    </mat-card>
  `,
})
export class StatusComponent implements OnInit {
  private api = inject(ApiService);
  status = signal<{ ok: boolean; time: string } | null>(null);

  ngOnInit() {
    this.api.get<{ ok: boolean; time: string }>('admin/logs/status').subscribe({
      next: (s) => this.status.set(s),
      error: () => this.status.set(null),
    });
  }
}
