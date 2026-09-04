'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { sound } from '@/lib/sound/SoundFX';

function isPrefetchRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  try {
    if (init?.priority === 'low') return true;

    // Check Request object if input is Request
    if (typeof input === 'object' && input !== null && 'headers' in input && (input as Request).headers) {
      const h = (input as Request).headers;
      if (
        h.get('next-router-prefetch') ||
        h.get('next-router-segment-prefetch') ||
        h.get('rsc-prefetch')
      ) {
        return true;
      }
    }

    // Check init headers
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        if (
          init.headers.get('next-router-prefetch') ||
          init.headers.get('next-router-segment-prefetch') ||
          init.headers.get('rsc-prefetch')
        ) {
          return true;
        }
      } else if (Array.isArray(init.headers)) {
        for (const [k] of init.headers) {
          const lk = k.toLowerCase();
          if (
            lk === 'next-router-prefetch' ||
            lk === 'next-router-segment-prefetch' ||
            lk === 'rsc-prefetch'
          ) {
            return true;
          }
        }
      } else if (typeof init.headers === 'object') {
        const headers = init.headers as Record<string, string>;
        if (
          headers['next-router-prefetch'] ||
          headers['Next-Router-Prefetch'] ||
          headers['next-router-segment-prefetch'] ||
          headers['Next-Router-Segment-Prefetch'] ||
          headers['rsc-prefetch']
        ) {
          return true;
        }
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function ButtonFeedbackInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isBuffering, setIsBuffering] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0); // 0 to 100%
  const activeRequestsRef = useRef(0);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start centered ambient light glow
  const startGlow = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    setIsBuffering(true);
    setGlowIntensity(50);

    if (!pulseIntervalRef.current) {
      pulseIntervalRef.current = setInterval(() => {
        setGlowIntensity((prev) => {
          if (prev >= 85) return 85;
          return Math.min(85, prev + 10);
        });
      }, 100);
    }
  };

  // Finish centered ambient light glow
  const finishGlow = (delay = 140) => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    setGlowIntensity(100);

    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishTimeoutRef.current = setTimeout(() => {
      setIsBuffering(false);
      setGlowIntensity(0);
    }, delay);
  };

  // Safety Watchdog: never let glow get permanently stuck on screen
  useEffect(() => {
    if (isBuffering) {
      const watchdog = setTimeout(() => {
        activeRequestsRef.current = 0;
        finishGlow(100);
      }, 5000);
      return () => clearTimeout(watchdog);
    }
  }, [isBuffering]);

  // Route & search params listener
  useEffect(() => {
    // When route finishes updating, complete any pending buffer immediately
    activeRequestsRef.current = 0;
    const timer = setTimeout(() => {
      finishGlow(120);
    }, 10);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Global fetch interception for REAL-TIME data load synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const isPrefetch = isPrefetchRequest(args[0], args[1]);

      if (!isPrefetch) {
        activeRequestsRef.current += 1;
        startGlow();
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        if (!isPrefetch) {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
          if (activeRequestsRef.current === 0) {
            finishGlow(140);
          }
        }
      }
    };

    // Custom event listeners for explicit loading triggers
    const handleCustomStart = () => {
      activeRequestsRef.current += 1;
      startGlow();
    };

    const handleCustomEnd = () => {
      activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
      if (activeRequestsRef.current === 0) {
        finishGlow(120);
      }
    };

    window.addEventListener('app:load:start', handleCustomStart);
    window.addEventListener('app:load:end', handleCustomEnd);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('app:load:start', handleCustomStart);
      window.removeEventListener('app:load:end', handleCustomEnd);
    };
  }, []);

  // Global click & tactile ripple handler
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        'button, [role="button"], .btn, input[type="submit"], input[type="button"], a.btn, a[role="button"]'
      ) as HTMLElement | null;

      if (!target) return;
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      // Procedural Web Audio tactile microswitch click
      sound.playTactileClick();

      // Tactile Ripple Wave
      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 2;
      const radius = diameter / 2;

      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple-wave';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;

      const clientX = e.clientX || rect.left + rect.width / 2;
      const clientY = e.clientY || rect.top + rect.height / 2;
      ripple.style.left = `${clientX - rect.left - radius}px`;
      ripple.style.top = `${clientY - rect.top - radius}px`;

      const style = window.getComputedStyle(target);
      const isPrimary =
        target.classList.contains('btn-primary') ||
        style.backgroundColor.includes('15, 122, 115') ||
        style.backgroundColor.includes('16, 185, 129') ||
        style.backgroundColor.includes('14, 116, 144') ||
        target.className.includes('bg-emerald') ||
        target.className.includes('bg-teal') ||
        target.className.includes('bg-indigo') ||
        target.className.includes('bg-blue') ||
        target.className.includes('bg-rose') ||
        target.className.includes('bg-amber');

      if (isPrimary) {
        ripple.style.background = 'rgba(255, 255, 255, 0.35)';
      } else {
        ripple.style.background = 'var(--brand-glow, rgba(16, 185, 129, 0.3))';
      }

      const currentPos = style.position;
      if (currentPos === 'static' || !currentPos) {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';

      target.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 550);
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        'button, [role="button"], .btn, input[type="submit"], input[type="button"], a.btn, a[role="button"]'
      ) as HTMLElement | null;

      if (!target) return;
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      // Add temporary buffering class to the button
      target.setAttribute('data-loading', 'true');
      target.classList.add('btn-buffering');

      const isSubmit = (target as HTMLButtonElement).type === 'submit';
      const isLink = target.tagName.toLowerCase() === 'a' || target.getAttribute('href');

      // For links and form submissions, give immediate subtle glow feedback
      if (isLink || isSubmit) {
        startGlow();
        setTimeout(() => {
          if (activeRequestsRef.current === 0) {
            finishGlow(120);
          }
        }, 350);
      }

      const clearDuration = isSubmit || isLink ? 700 : 300;
      setTimeout(() => {
        target.removeAttribute('data-loading');
        target.classList.remove('btn-buffering');
      }, clearDuration);
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      {/* Centered Ambience Light Soft Glow (Positioned in Center Top) */}
      <div
        aria-hidden="true"
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none transition-all duration-300 ease-out flex flex-col items-center justify-start ${
          isBuffering ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          width: 'min(360px, 70vw)',
        }}
      >
        {/* Layer 1: Ambient Soft Glow Atmospheric Halo (Downward diffuse aura) */}
        <div
          className="absolute -top-3 w-full h-11 bg-gradient-to-b from-emerald-400/45 via-teal-400/30 to-transparent dark:from-emerald-400/55 dark:via-teal-300/40 blur-xl transition-opacity duration-300 animate-ambience-halo"
          style={{
            opacity: glowIntensity > 0 ? glowIntensity / 100 : 0,
          }}
        />

        {/* Layer 2: Secondary Mid Glow Diffuse Beam */}
        <div
          className="absolute top-0 w-[85%] h-3.5 bg-gradient-to-r from-transparent via-emerald-400/70 dark:via-emerald-300/80 to-transparent blur-md transition-all duration-200"
          style={{
            transform: `scaleX(${0.4 + (glowIntensity / 100) * 0.6})`,
          }}
        />

        {/* Layer 3: Sharp Center Core Light Filament */}
        <div
          className="h-[3px] w-full rounded-full bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-200 to-transparent shadow-[0_0_18px_rgba(52,211,153,0.95)] relative overflow-hidden transition-all duration-200"
          style={{
            transform: `scaleX(${0.3 + (glowIntensity / 100) * 0.7})`,
          }}
        >
          {/* Animated Light Shimmer Core Sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/95 to-transparent animate-ambience-sweep" />
        </div>
      </div>
    </>
  );
}

export function ButtonFeedback() {
  return (
    <Suspense fallback={null}>
      <ButtonFeedbackInner />
    </Suspense>
  );
}
