import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.scss']
})
export class SettingsMenuComponent {
  @ViewChild('menu', { static: false }) menuRef?: ElementRef<HTMLElement>;
  @ViewChild('button', { static: false }) buttonRef?: ElementRef<HTMLButtonElement>;

  open = false;
  private autoCloseTimer?: any;
  private autoCloseMs = 7000; // cierre automático si no hay selección

  // Stubs para futuro
  @Output() themeChange = new EventEmitter<'light' | 'dark'>();
  @Output() langChange = new EventEmitter<'es' | 'en'>();

  toggle(): void {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      this.startAutoCloseTimer();
    }
  }

  close(): void {
    this.open = false;
    this.clearAutoCloseTimer();
  }

  private startAutoCloseTimer(): void {
    this.clearAutoCloseTimer();
    this.autoCloseTimer = setTimeout(() => this.close(), this.autoCloseMs);
  }

  private clearAutoCloseTimer(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  // Cierra al hacer click fuera
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.open) return;
    const target = ev.target as Node;
    const host = (this.menuRef?.nativeElement?.parentElement) ?? null;
    if (host && !host.contains(target)) {
      this.close();
    }
  }

  // Accesibilidad por teclado
  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (!this.open) return;
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.close();
      this.buttonRef?.nativeElement.focus();
    }
  }

  // Stubs de acciones
  setLight(): void { this.themeChange.emit('light'); }
  setDark(): void { this.themeChange.emit('dark'); this.close(); }
  setEs(): void { this.langChange.emit('es'); this.close(); }
  setEn(): void { this.langChange.emit('en'); this.close(); }
}
