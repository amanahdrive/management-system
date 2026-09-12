'use client';

import React, { useEffect, useRef } from 'react';

/**
 * AMANAH DRIVE — HIGH-PERFORMANCE LIVING GRID BACKGROUND ENGINE
 * Energy-efficient, hardware-friendly Canvas 2D reactive grid.
 * - Idle Sleep Engine: automatically suspends requestAnimationFrame when idle (0% CPU/GPU at rest)
 * - Single-path batched draw call: collapses 1,100+ separate path/fill operations into 1 single GPU draw
 * - Cached theme observation: eliminates layout thrashing DOM queries per frame
 * - Energy-efficient: completely dormant when document is hidden or prefers-reduced-motion is active
 */
export function LivingGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    if (prefersReducedMotion || isMobile) {
      drawStaticGrid(canvas, ctx);
      return;
    }

    let animationFrameId: number | null = null;
    let isRunning = false;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastActivityTime = performance.now();

    // Cache theme to avoid DOM queries inside 60-144 FPS loop
    let isDark = document.documentElement.classList.contains('dark') || 
                 document.documentElement.getAttribute('data-theme') === 'dark';

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark') || 
               document.documentElement.getAttribute('data-theme') === 'dark';
      wakeUp();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const GRID_SIZE = 44;
    const DOT_RADIUS = 0.9;
    const MAX_DIST_SQ = 260 * 260;

    const renderFrame = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)';

      const offsetX = currentX * 18;
      const offsetY = currentY * 18;
      const centerX = width / 2 + offsetX * 2;
      const centerY = height / 2 + offsetY * 2;

      // Single batched path: 1 draw call instead of 1,000+ individual beginPath/fill
      ctx.beginPath();
      for (let x = (offsetX % GRID_SIZE); x < width; x += GRID_SIZE) {
        for (let y = (offsetY % GRID_SIZE); y < height; y += GRID_SIZE) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distSq = dx * dx + dy * dy;

          let r = DOT_RADIUS;
          if (distSq < MAX_DIST_SQ) {
            const factor = 1 - distSq / MAX_DIST_SQ;
            r = DOT_RADIUS + factor * 1.6;
          }

          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    const loop = () => {
      if (document.hidden) {
        isRunning = false;
        animationFrameId = null;
        return;
      }

      renderFrame();

      const deltaX = Math.abs(targetX - currentX);
      const deltaY = Math.abs(targetY - currentY);
      const isSettled = deltaX < 0.001 && deltaY < 0.001;
      const isIdle = performance.now() - lastActivityTime > 1000;

      // Idle Sleep Engine: Go to sleep when settled and idle to release 100% GPU/CPU
      if (isSettled && isIdle) {
        isRunning = false;
        animationFrameId = null;
        return;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    const wakeUp = () => {
      lastActivityTime = performance.now();
      if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      wakeUp();
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / (width || 1)) * 2 - 1;
      targetY = (e.clientY / (height || 1)) * 2 - 1;
      wakeUp();
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const clampedGamma = Math.max(-30, Math.min(30, e.gamma));
        const clampedBeta = Math.max(-30, Math.min(30, e.beta - 40));
        targetX = clampedGamma / 30;
        targetY = clampedBeta / 30;
        wakeUp();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        wakeUp();
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial render then sleep
    wakeUp();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      themeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
      aria-hidden="true"
    />
  );
}

function drawStaticGrid(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)';
  const GRID = 44;
  ctx.beginPath();
  for (let x = 0; x < w; x += GRID) {
    for (let y = 0; y < h; y += GRID) {
      ctx.moveTo(x + 0.9, y);
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}