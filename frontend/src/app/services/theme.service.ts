import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'nvs-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private stored = signal<Theme>(this.loadStored());
  theme = computed(() => this.stored());

  private loadStored(): Theme {
    if (typeof window === 'undefined') return 'dark';
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' ? 'light' : 'dark';
  }

  setTheme(value: Theme) {
    this.stored.set(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
      document.documentElement.setAttribute('data-theme', value);
      if (value === 'dark') document.body.classList.add('dark-theme');
      else document.body.classList.remove('dark-theme');
    }
  }

  toggle() {
    const next = this.stored() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  init() {
    if (typeof window !== 'undefined') {
      const v = this.stored();
      document.documentElement.setAttribute('data-theme', v);
      if (v === 'dark') document.body.classList.add('dark-theme');
    }
  }
}
