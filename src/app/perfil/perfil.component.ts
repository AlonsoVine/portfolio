import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements AfterViewInit, OnDestroy {
  @ViewChild('avatar', { static: false }) avatarRef?: ElementRef<HTMLImageElement>;
  avatarFloating = false;
  avatarReappear = false;

  private stickyHeight = 100; // px (altura actual de la barra)
  placeholderHeight = 0; // mantiene el espacio cuando el avatar flota
  private imgLoadHandler?: () => void;

  ngAfterViewInit(): void {
    // Medir posición/altura iniciales del avatar grande (tras cargar la imagen)
    const img = this.avatarRef?.nativeElement;
    if (img) {
      if (img.complete) {
        this.computeOffsets();
      } else {
        this.imgLoadHandler = () => { this.computeOffsets(); this.updateState(); };
        img.addEventListener('load', this.imgLoadHandler);
      }
    }
    // Inicializa y escucha scroll/resize
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    this.updateState();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    const img = this.avatarRef?.nativeElement;
    if (img && this.imgLoadHandler) {
      img.removeEventListener('load', this.imgLoadHandler);
    }
  }

  private onScroll = () => this.updateState();
  private onResize = () => {
    this.computeOffsets();
    this.updateState();
  };

  private computeOffsets(): void {
    const el = this.avatarRef?.nativeElement;
    if (!el) return;
    this.placeholderHeight = el.offsetHeight;
  }

  private updateState(): void {
    // Sincroniza solo con el estado de la barra (y con force-hide-sticky para Perfil)
    const root = document.documentElement;
    const effectiveSticky = root.classList.contains('sticky-active') && !root.classList.contains('force-hide-sticky');

    if (effectiveSticky !== this.avatarFloating) {
      if (effectiveSticky) {
        this.avatarFloating = true;
        this.avatarReappear = false;
      } else {
        this.avatarFloating = false;
        this.avatarReappear = true;
        setTimeout(() => (this.avatarReappear = false), 1600);
      }
    }
  }
}
