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

  toggle(): void { this.open = !this.open; }
  close(): void { this.open = false; }

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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.close();
    }
  }
}

