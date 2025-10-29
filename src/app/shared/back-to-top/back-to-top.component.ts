import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Inject,
  PLATFORM_ID,
  NgZone,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  HostBinding
} from '@angular/core';
import { isPlatformBrowser, ViewportScroller } from '@angular/common';
import { animationFrameScheduler, auditTime, distinctUntilChanged, fromEvent, map, merge, startWith, Subscription } from 'rxjs';

@Component({
  selector: 'app-back-to-top',
  templateUrl: './back-to-top.component.html',
  styleUrls: ['./back-to-top.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackToTopComponent implements OnInit, OnDestroy {
  @Input() threshold = 200; // px
  @Input() position: 'right' | 'left' = 'right';
  @Input() bottom?: string | number; // px or css unit
  @Input() side?: string | number; // px or css unit
  @Input() ariaLabel = 'Volver arriba';
  @Input() tabIndex = 0;
  @Input() reduceMotionFallback: 'instant' | 'auto' = 'auto';
  @Input() zIndex?: number;

  private isBrowser: boolean;
  private sub?: Subscription;
  private lastVisible = false;
  show = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private scroller: ViewportScroller,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Host class/state bindings
  @HostBinding('class.visible') get hostVisible() { return this.show; }
  @HostBinding('class.pos-left') get hostLeft() { return this.position === 'left'; }
  @HostBinding('class.pos-right') get hostRight() { return this.position !== 'left'; }
  @HostBinding('style.z-index') get hostZIndex(): string | null { return this.zIndex != null ? String(this.zIndex) : null; }
  @HostBinding('style.--btp-bottom') get hostBottom(): string | null { return this.coerceCssUnit(this.bottom); }
  @HostBinding('style.--btp-side') get hostSide(): string | null { return this.coerceCssUnit(this.side); }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      const scroll$ = fromEvent(window, 'scroll', { passive: true });
      const resize$ = fromEvent(window, 'resize', { passive: true });
      this.sub = merge(scroll$, resize$)
        .pipe(
          startWith(null),
          auditTime(16, animationFrameScheduler),
          map(() => this.computeVisible()),
          distinctUntilChanged(),
        )
        .subscribe((visible) => {
          if (visible !== this.lastVisible) {
            this.lastVisible = visible;
            this.ngZone.run(() => {
              this.show = visible;
              this.cdr.markForCheck();
            });
          }
        });
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = undefined;
    }
  }

  onActivate(ev?: Event): void {
    if (ev) ev.preventDefault();
    if (!this.isBrowser) return;

    const prefersReduced = (() => {
      try {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        return false;
      }
    })();

    if (prefersReduced || this.reduceMotionFallback === 'instant') {
      this.scroller.scrollToPosition([0, 0]);
    } else {
      try {
        window.scrollTo({ top: 0, behavior: (this.reduceMotionFallback === 'auto' ? 'auto' : 'smooth') as ScrollBehavior });
      } catch {
        // Fallback for older browsers
        this.scroller.scrollToPosition([0, 0]);
      }
    }
  }

  private computeVisible(): boolean {
    if (!this.isBrowser) return false;
    const docEl = document.documentElement;
    const body = document.body;
    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop || 0;
    const vh = window.innerHeight || docEl.clientHeight;
    const scrollHeight = Math.max(docEl.scrollHeight, body.scrollHeight, docEl.clientHeight);
    const hasScrollable = scrollHeight > vh + 1;
    return hasScrollable && scrollTop >= (this.threshold || 0);
  }

  private coerceCssUnit(value?: string | number): string | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }
}

