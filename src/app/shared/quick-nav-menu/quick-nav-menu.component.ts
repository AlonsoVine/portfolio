import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';

@Component({
  selector: 'app-quick-nav-menu',
  templateUrl: './quick-nav-menu.component.html',
  styleUrls: ['./quick-nav-menu.component.scss']
})
export class QuickNavMenuComponent {
  @ViewChild('menu', { static: false }) menuRef?: ElementRef<HTMLElement>;
  @ViewChild('button', { static: false }) buttonRef?: ElementRef<HTMLButtonElement>;

  open = false;
  private autoCloseTimer?: any;
  private autoCloseMs = 7000;

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

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.open) return;
    const target = ev.target as Node;
    const host = (this.menuRef?.nativeElement?.parentElement) ?? null;
    if (host && !host.contains(target)) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (!this.open) return;
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.close();
      this.buttonRef?.nativeElement.focus();
    }
  }

  navigateTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;

    // Si vamos a 'perfil', ocultamos inmediatamente la barra sticky para evitar parpadeos
    if (id === 'perfil') {
      const root = document.documentElement;
      root.classList.add('force-hide-sticky');
      // Fallback temporal: retiramos la clase tras 1.6s por si no llega a aplicarla PerfilComponent aún
      setTimeout(() => root.classList.remove('force-hide-sticky'), 1600);
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.close();
  }
}
