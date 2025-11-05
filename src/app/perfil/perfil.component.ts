import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  Renderer2,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements AfterViewInit, OnDestroy {
  // Renderer2 para listeners y estilos inline sin tocar DOM directamente
  constructor(private rd: Renderer2) {}

  @ViewChild('avatar', { static: false }) avatarRef?: ElementRef<HTMLElement>;
  @ViewChild('nameSentinel', { static: false }) nameSentinelRef?: ElementRef<HTMLElement>;
  @ViewChild('nameEl', { static: false }) nameElRef?: ElementRef<HTMLElement>;

  // Estado del avatar (imagen de perfil)
  avatarFloating = false; // avatar fijado en la barra sticky
  avatarReappear = false; // animación al volver al contenido
  avatarHovered = false;  // hover visual
  avatarFlipped = false;  // flip 3D al hacer click

  // Estado del nombre (H1) en modo compacto dentro del navbar
  nameCompact = false;

  // IO para detectar cuándo el H1 debe entrar/salir del modo compacto
  private io?: IntersectionObserver;
  // Altura actual de la barra sticky (se lee de --sticky-height)
  private stickyHeight = 0;
  // Alto del placeholder para mantener flujo al fijar el avatar
  placeholderHeight = 0;

  private removeScroll?: () => void;
  private removeResize?: () => void;

  ngAfterViewInit(): void {
    // Calcular tamaños iniciales y evaluar estado
    this.computeOffsets();
    this.updateState();

    // Escuchar scroll/resize con Renderer2
    this.removeScroll = this.rd.listen(window, 'scroll', this.onScroll);
    this.removeResize = this.rd.listen(window, 'resize', this.onResize);

    // Observer para compactar nombre sin parpadeos (con margen superior = stickyHeight)
    const anchor = this.nameSentinelRef?.nativeElement;
    if (anchor) {
      this.stickyHeight = this.readCSSVarPx('--sticky-height') ?? 0;
      const marginTop = this.stickyHeight + 8; // pequeña histéresis
      this.io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const stickyActive = document.documentElement.classList.contains('sticky-active');
          // Solo compactar cuando la barra sticky está activa y el sentinel salió del viewport reducido
          const compact = stickyActive && !entry.isIntersecting;
          if (compact !== this.nameCompact) {
            this.nameCompact = compact;
            document.documentElement.classList.toggle('name-compact', this.nameCompact);
            this.updateNameCompactPosition();
          }
        },
        { root: null, rootMargin: `-${marginTop}px 0px 0px 0px`, threshold: 0 }
      );
      this.io.observe(anchor);
    }

    // Posicionar inicialmente si ya está compacto
    this.updateNameCompactPosition();
  }

  ngOnDestroy(): void {
    if (this.removeScroll) {
      this.removeScroll();
      this.removeScroll = undefined;
    }
    if (this.removeResize) {
      this.removeResize();
      this.removeResize = undefined;
    }
    if (this.io) {
      this.io.disconnect();
      this.io = undefined;
    }
  }

  // Recalcula estado y posición en scroll
  private onScroll = () => {
    this.updateState();
    if (this.nameCompact) this.updateNameCompactPosition();
  };

  // Recalcula medidas y reajusta colocación en resize
  private onResize = () => {
    this.computeOffsets();
    if (this.nameCompact) this.updateNameCompactPosition();
    this.updateState();
  };

  // Lee medidas actuales del avatar y la barra sticky
  private computeOffsets(): void {
    const el = this.avatarRef?.nativeElement;
    if (!el) return;
    this.placeholderHeight = el.offsetHeight;
    // refresca altura sticky si existe variable CSS
    this.stickyHeight = this.readCSSVarPx('--sticky-height') ?? this.stickyHeight;
  }

  // Actualiza los flags del avatar en función de la barra sticky
  private updateState(): void {
    const root = document.documentElement;
    const effectiveSticky =
      root.classList.contains('sticky-active') && !root.classList.contains('force-hide-sticky');

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
    // El estado compacto del nombre lo gestiona el IntersectionObserver
  }

  // Calcula posición/escala del H1 compacto para que quepa siempre dentro del navbar
  private updateNameCompactPosition(): void {
    const nameEl = this.nameElRef?.nativeElement;
    const avatarEl = this.avatarRef?.nativeElement;
    if (!nameEl || !avatarEl) return;

    if (!this.nameCompact) {
      this.rd.removeStyle(nameEl, 'left');
      this.rd.removeStyle(nameEl, 'top');
      this.rd.removeStyle(nameEl, 'transform');
      return;
    }

    const rect = avatarEl.getBoundingClientRect();
    const gap = 8;   // separación de seguridad respecto al avatar
    let scale = 0.60; // escala base en compacto

    // Alinea verticalmente el texto y asegúrate de que quepa dentro del navbar
    const nameRect = nameEl.getBoundingClientRect();
    // lee stickyHeight si existe para poder ajustar
    const sh = (this.stickyHeight = this.readCSSVarPx('--sticky-height') ?? this.stickyHeight);
    const padding = 8; // margen visual dentro del navbar
    const MIN_SCALE = 0.30; // escala mínima por legibilidad

    if (sh && sh > 0) {
      const maxAllowed = Math.max(8, sh - padding * 2);
      const fitScale = maxAllowed / nameRect.height;
      if (fitScale < scale) {
        scale = Math.max(MIN_SCALE, fitScale); // reduce si es necesario para que entre
      }
    }

    const scaledNameHeight = nameRect.height * scale;
    // Vertical: alinear con la parte superior del navbar (padding)
    let top = padding;
    // Clampa dentro de la altura sticky si la conocemos
    if (sh && sh > 0) {
      const minTop = padding;
      const maxTop = Math.max(padding, sh - scaledNameHeight - padding);
      if (top < minTop) top = minTop;
      if (top > maxTop) top = maxTop;
    }

    // Horizontal: sitúalo tras el avatar si existe; si no, usa margen izquierdo seguro
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const scaledNameWidth = nameRect.width * scale;
    let left = 32; // margen base
    if (rect && rect.width > 0) {
      left = Math.max(left, Math.round(rect.right + gap));
    }
    // Evita salir por la derecha del viewport
    left = Math.min(left, vw - scaledNameWidth - 12);

    this.rd.setStyle(nameEl, 'left', `${left}px`);
    this.rd.setStyle(nameEl, 'top', `${top}px`);
    this.rd.setStyle(nameEl, 'transform', `scale(${scale})`);
  }

  // Lee una variable CSS en px y la devuelve como número
  private readCSSVarPx(varName: string): number | undefined {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (!val) return undefined;
    const m = val.match(/(-?\d+(?:\.\d+)?)px/);
    return m ? parseFloat(m[1]) : undefined;
  }
}
