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
  private hysteresis = 40; // px de margen para una transiciÃ³n mÃ¡s suave
  private enterThreshold = 0;
  private exitThreshold = 0;

  // Campos para typewriter de título y CTA
  typedTitle = '';
  typedCta = '';
  private fullTitle = 'Hola Mundo!';
  private fullCta = '¿Quieres saber más?';
  private titleIndex = 0;
  private titleTimer?: any;
  private ctaIndex = 0;
  private ctaTimer?: any;

  // Efecto consola (typewriter)
  typedText = '';
  caretVisible = true;
  private fullText = [
    'Soy Alonso, un desarrollador y analista, apasionado por la tecnologí­a.',
    'Me especializo en crear aplicaciones personalizadas que combinan funcionalidad y diseño.',
    'Mi objetivo es construir soluciones que impulsen la eficiencia y el rendimiento.'
  ].join('\n');
  private typeIndex = 0;
  private typeTimer?: any;
  private caretTimer?: any;

  irAlComponentePerfil() {
    const elemento = document.getElementById('mi-perfil');
    if (elemento) {
      const root = document.documentElement;
      root.classList.add('force-hide-sticky');
      setTimeout(() => root.classList.remove('force-hide-sticky'), 1600);
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
    // EvaluaciÃ³n inicial (por si se entra con scroll restaurado)
    this.updateStickyState();
    this.startTypingEffect2();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    if (this.typeTimer) { clearInterval(this.typeTimer); }
    if (this.titleTimer) { clearInterval(this.titleTimer); }
    if (this.ctaTimer) { clearInterval(this.ctaTimer); }
    if (this.caretTimer) { clearInterval(this.caretTimer); }
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
    // Propaga estado sticky a nivel global para otros componentes
    const root = document.documentElement;
    if (this.isSticky) {
      root.classList.add('sticky-active');
    } else {
      root.classList.remove('sticky-active');
    }
  }

  private startTypingEffect(): void {
    // Parpadeo del cursor
    this.caretTimer = setInterval(() => {
      this.caretVisible = !this.caretVisible;
    }, 600);

    // Escritura letra a letra
    const baseDelay = 28; // ms por carÃ¡cter
    this.typeTimer = setInterval(() => {
      if (this.typeIndex >= this.fullText.length) {
        clearInterval(this.typeTimer);
        this.typeTimer = undefined;
        return;
      }
      this.typedText += this.fullText[this.typeIndex++];
    }, baseDelay);
  }

  // Nuevo: secuencia título -> texto -> CTA
  private startTypingEffect2(): void {
    // Cursor parpadeante
    this.caretTimer = setInterval(() => { this.caretVisible = !this.caretVisible; }, 600);

    // 1) Título
        this.titleTimer = setInterval(() => {
      if (this.titleIndex >= this.fullTitle.length) {
        clearInterval(this.titleTimer!);
        this.titleTimer = undefined;

        // 2) Texto principal con pausas al inicio de párrafo
        const typeNext = () => {
          if (this.typeIndex >= this.fullText.length) {
            // 3) CTA
            this.ctaTimer = setInterval(() => {
              if (this.ctaIndex >= this.fullCta.length) {
                clearInterval(this.ctaTimer!);
                this.ctaTimer = undefined;
                return;
              }
              this.typedCta += this.fullCta[this.ctaIndex++];
            }, 40);
            return;
          }

          const prev = this.fullText[this.typeIndex - 1] || '';
          const ch = this.fullText[this.typeIndex++];
          this.typedText += ch;

          let delay = 26 + Math.random() * 30; // base + jitter
          if (prev === "\n") {
            delay = 420; // pausa al iniciar cada párrafo
          }
          this.typeTimer = setTimeout(typeNext, delay);
        };
        typeNext();
        return;
      }
      this.typedTitle += this.fullTitle[this.titleIndex++];
    }, 85); }
}



