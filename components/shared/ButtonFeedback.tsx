'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function ButtonFeedbackInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start top buffer loading bar
  const startBuffer = () => {
    setIsBuffering(true);
    setBufferProgress(18);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);

    progressIntervalRef.current = setInterval(() => {
      setBufferProgress((prev) => {
        if (prev >= 88) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 88;
        }
        // Smooth logarithmic step increment
        const step = Math.max(1, Math.floor((90 - prev) / 5));
        return Math.min(88, prev + step);
      });
    }, 100);
  };

  // Finish top buffer loading bar
  const finishBuffer = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setBufferProgress(100);
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);

    bufferTimerRef.current = setTimeout(() => {
      setIsBuffering(false);
      setBufferProgress(0);
    }, 320);
  };

  // Whenever route or search params change, complete the buffer loading bar
  useEffect(() => {
    finishBuffer();
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, [pathname, searchParams]);

  // Global click & ripple & button buffer handler
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Find nearest button or role="button" or .btn
      const target = (e.target as HTMLElement)?.closest(
        'button, [role="button"], .btn, input[type="submit"], input[type="button"], a.btn, a[role="button"]'
      ) as HTMLElement | null;

      if (!target) return;
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') {
        return;
      }

      // 1. Create Ripple Wave
      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 2;
      const radius = diameter / 2;

      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple-wave';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;

      // Calculate position relative to clicked button
      const clientX = e.clientX || rect.left + rect.width / 2;
      const clientY = e.clientY || rect.top + rect.height / 2;
      ripple.style.left = `${clientX - rect.left - radius}px`;
      ripple.style.top = `${clientY - rect.top - radius}px`;

      // Set ripple color based on button theme/background brightness
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
        ripple.style.background = 'rgba(255, 255, 255, 0.4)';
      } else {
        ripple.style.background = 'var(--brand-glow, rgba(16, 185, 129, 0.35))';
      }

      // Ensure button has position relative/overflow hidden container
      const currentPos = style.position;
      if (currentPos === 'static' || !currentPos) {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';

      target.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 600);
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

      // Start the top buffer loading bar if it looks like an action/submit/link
      const isSubmit = (target as HTMLButtonElement).type === 'submit';
      const isLink = target.tagName.toLowerCase() === 'a' || target.getAttribute('href');
      const hasAction =
        isSubmit ||
        isLink ||
        target.getAttribute('type') === 'submit' ||
        target.onclick ||
        target.hasAttribute('data-action');

      if (hasAction) {
        startBuffer();
      }

      // Automatically reset button loading state after brief period (or when action finishes)
      const clearDuration = isSubmit || isLink ? 2000 : 700;
      setTimeout(() => {
        target.removeAttribute('data-loading');
        target.classList.remove('btn-buffering');
        if (!isLink && !isSubmit) {
          finishBuffer();
        }
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
      {/* Top Buffer Loading Bar (Visual indicator for buffer / slow processes) */}
      <div
        aria-hidden="true"
        className={`fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300 ${
          isBuffering ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="h-[3px] bg-gradient-to-r from-[var(--brand-primary)] via-emerald-400 to-teal-300 shadow-[0_0_12px_var(--brand-primary)] transition-all duration-200 ease-out relative"
          style={{ width: `${bufferProgress}%` }}
        >
          {/* Glowing trailing pulse head */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/90 shadow-[0_0_8px_#ffffff]" />
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
