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
  'Soy Alonso, un desarrollador y analista, apasionado por la tecnología.',
  'Me especializo en crear aplicaciones personalizadas que combinan funcionalidad y diseño.',
  'Mi objetivo es construir soluciones que impulsen la eficiencia y el rendimiento.'
].join('\\n');
  private typeIndex = 0;
  private typeTimer?: any;
  private caretTimer?: any;
  // Dinámica de consola
  consoleTitle = 'Símbolo del sistema';
  private consoleUser = 'visitante';
  private osHeader = '';
  // Estados UI consola
  isMin = false;
  isMax = false;
  isHidden = false;
  private keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isMax) {
      this.toggleMax();
    }
  };

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
    this.initUserAndOS();
    this.restoreConsoleState();
    window.addEventListener('keydown', this.keydownHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.keydownHandler);
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

  // Inicializa usuario (localStorage) y cabecera de SO
  private async initUserAndOS(): Promise<void> {
    try {
      const stored = localStorage.getItem('console.username');
      if (stored && stored.trim()) {
        this.consoleUser = stored.trim();
      } else {
        const lang = navigator.language || 'es';
        this.consoleUser = lang.startsWith('es') ? 'visitante' : 'guest';
      }

      const { platform, versionLabel } = await this.detectPlatformVersion();

      if (platform === 'Window') {
        this.consoleTitle = 'C:\\Window\\System32\\cmd.exe';
        const versionText = "25.04.01995+";
        this.osHeader = `Alonso Window [Versión ${versionText}]\n(c) Alonso Corporation. Todos los derechos reservados.\n\nC:\\Users\\${this.consoleUser}> `;
      } else if (platform === 'macOS') {
        this.consoleTitle = 'Terminal';
        this.osHeader = `Darwin (macOS)\n\n${this.consoleUser}@mac ~ % `;
      } else if (platform === 'Linux') {
        this.consoleTitle = 'Terminal';
        this.osHeader = `GNU/Linux\n\n${this.consoleUser}@host:~$ `;
      } else {
        this.consoleTitle = 'Developer Console';
        this.osHeader = `${platform}\n\n${this.consoleUser}$ `;
      }

      const intro = [
        'Soy Alonso, un desarrollador y analista, apasionado por la tecnología.',
        'Me especializo en crear aplicaciones personalizadas que combinan funcionalidad y diseño.',
        'Mi objetivo es construir soluciones que impulsen la eficiencia y el rendimiento.'
      ].join('\n');

      // Reinicia estados y compone texto completo
      this.typedText = '';
      this.typedTitle = '';
      this.typedCta = '';
      this.fullText = `${this.osHeader}\nHola Mundo!\n${intro}`;
      this.typeIndex = 0;
      this.titleIndex = 0;
      this.ctaIndex = 0;
    } finally {
      this.startTypingEffect2();
    }
  }

  private async detectPlatformVersion(): Promise<{ platform: 'Window' | 'macOS' | 'Linux' | 'Desconocido'; versionLabel?: string }>{
    const uaData: any = (navigator as any).userAgentData;
    const ua = navigator.userAgent || '';
    let platform: 'Window' | 'macOS' | 'Linux' | 'Desconocido' = 'Desconocido';
    let versionLabel: string | undefined;

    const plat = uaData?.platform || navigator.platform || '';
    if (/Win/i.test(plat)) platform = 'Window';
    else if (/Mac/i.test(plat)) platform = 'macOS';
    else if (/Linux/i.test(plat)) platform = 'Linux';

    if (platform === 'Window' && uaData?.getHighEntropyValues) {
      try {
        const { platformVersion } = await uaData.getHighEntropyValues(['platformVersion']);
        const major = parseInt(String(platformVersion).split('.')[0] || '0', 10);
        // Heurística: Window 11 suele ser >= 13; Window 10 < 13
        versionLabel = major >= 13 ? '22000+' : '19045';
      } catch { /* noop */ }
    }
    if (platform === 'Window' && !versionLabel) {
      if (/Window NT 10\.0/.test(ua)) versionLabel = '19045';
    }
    return { platform, versionLabel };
  }
  private startTypingEffect(): void {
    // Parpadeo del cursor
    this.caretTimer = setInterval(() => {
      this.caretVisible = !this.caretVisible;
    }, 600);

    // Escritura letra a letra
    const baseDelay = 16; // ms por carÃ¡cter
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
    this.caretTimer = setInterval(() => { this.caretVisible = !this.caretVisible; }, 450);

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
            }, 28);
            return;
          }

          const prev = this.fullText[this.typeIndex - 1] || '';
          const ch = this.fullText[this.typeIndex++];
          this.typedText += ch;

          let delay = 14 + Math.random() * 18; // base + jitter
          if (prev === "\n") {
            delay = 260; // pausa al iniciar cada párrafo
          }
          this.typeTimer = setTimeout(typeNext, delay);
        };
        typeNext();
        return;
      }
      this.typedTitle += this.fullTitle[this.titleIndex++];
    }, 60); }











  // ===== Acciones de ventana =====
  toggleMin(): void {
    this.isMin = !this.isMin;
    if (this.isMin) {
      // No permitir estados contradictorios: si se minimiza, salir de max
      if (this.isMax) {
        this.isMax = false;
        document.body.style.overflow = '';
      }
    }
    try { localStorage.setItem('consoleMinimized', this.isMin ? '1' : '0'); } catch {}
  }

  toggleMax(): void {
    const next = !this.isMax;
    this.isMax = next;
    if (next) {
      // Al maximizar, forzar salir de minimizado para evitar quedarse encogida
      if (this.isMin) {
        this.isMin = false;
        try { localStorage.setItem('consoleMinimized', '0'); } catch {}
      }
    }
    document.body.style.overflow = this.isMax ? 'hidden' : '';
  }

  closeHero(): void {
    this.isHidden = true;
    this.isMax = false;
    document.body.style.overflow = '';
    try { localStorage.setItem('hideHero', '1'); } catch {}
    this.irAlComponentePerfil();
  }

  reopenHero(): void {
    this.isHidden = false;
    try { localStorage.removeItem('hideHero'); } catch {}
    this.heroSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private restoreConsoleState(): void {
    try {
      this.isMin = localStorage.getItem('consoleMinimized') === '1';
      this.isHidden = localStorage.getItem('hideHero') === '1';
    } catch {}
  }
}
