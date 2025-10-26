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

  // Stubs para futuro
  @Output() themeChange = new EventEmitter<'light' | 'dark'>();
  @Output() langChange = new EventEmitter<'es' | 'en'>();

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
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
  setDark(): void { this.themeChange.emit('dark'); }
  setEs(): void { this.langChange.emit('es'); }
  setEn(): void { this.langChange.emit('en'); }
}

