import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroSection', { static: true }) heroSection?: ElementRef<HTMLElement>;

  isSticky = false;
  stickyHeight = 100; // px
  private onScroll = () => this.updateStickyState();
  private onResize = () => { this.measureHeroHeight(); this.updateStickyState(); };
  private heroHeight = 0;
  private hysteresis = 40; // px de margen para una transición más suave
  private enterThreshold = 0;
  private exitThreshold = 0;

  irAlComponentePerfil() {
    const elemento = document.getElementById('mi-perfil');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }

  irAlComponenteHabilidades() {
    const elemento = document.getElementById('habilidades');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }

  ngAfterViewInit(): void {
    this.measureHeroHeight();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    // Evaluación inicial (por si se entra con scroll restaurado)
    this.updateStickyState();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }

  private measureHeroHeight(): void {
    const el = this.heroSection?.nativeElement;
    if (!el) return;
    // Altura real del hero en flujo normal
    this.heroHeight = el.getBoundingClientRect().height;
    this.enterThreshold = Math.max(this.heroHeight - this.stickyHeight, 0);
    this.exitThreshold = Math.max(this.enterThreshold - this.hysteresis, 0);
  }

  private updateStickyState(): void {
    const y = window.scrollY;
    if (!this.isSticky) {
      this.isSticky = y >= this.enterThreshold;
    } else {
      if (y <= this.exitThreshold) {
        this.isSticky = false;
      }
    }
  }
}
