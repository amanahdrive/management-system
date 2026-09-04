'use client';

import React, { useEffect, useRef } from 'react';

/**
 * AMANAH DRIVE — LIVING GRID BACKGROUND ENGINE
 * High-performance, hardware-accelerated Canvas 2D reactive grid.
 * Desktop: Responds to mouse coordinate tracking.
 * Mobile: Responds to gyroscope (DeviceOrientation) tilt with LERP smoothing.
 * Energy-efficient: pauses rendering when document is hidden or prefers-reduced-motion is on.
 */
export function LivingGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      drawStaticGrid(canvas, ctx);
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / (width || 1)) * 2 - 1;
      targetY = (e.clientY / (height || 1)) * 2 - 1;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const clampedGamma = Math.max(-30, Math.min(30, e.gamma));
        const clampedBeta = Math.max(-30, Math.min(30, e.beta - 40));
        targetX = clampedGamma / 30;
        targetY = clampedBeta / 30;
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // iOS 12.2+ permission check
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      const enableGyro = () => {
        (DeviceOrientationEvent as any).requestPermission?.()
          .then((res: string) => {
            if (res === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, { passive: true });
            }
          })
          .catch(() => {});
        window.removeEventListener('click', enableGyro);
      };
      window.addEventListener('click', enableGyro);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    const GRID_SIZE = 44;
    const DOT_RADIUS = 0.9;

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark') || 
                     document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)';

      const offsetX = currentX * 18;
      const offsetY = currentY * 18;

      const centerX = width / 2 + offsetX * 2;
      const centerY = height / 2 + offsetY * 2;
      const maxDistSq = 260 * 260;

      for (let x = (offsetX % GRID_SIZE); x < width; x += GRID_SIZE) {
        for (let y = (offsetY % GRID_SIZE); y < height; y += GRID_SIZE) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distSq = dx * dx + dy * dy;

          let r = DOT_RADIUS;
          if (distSq < maxDistSq) {
            const factor = 1 - distSq / maxDistSq;
            r = DOT_RADIUS + factor * 1.6;
          }

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
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
 const isDark = document.documentElement.classList.contains('dark');
 ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)';
 const GRID = 44;
 for (let x = 0; x < w; x += GRID) {
 for (let y = 0; y < h; y += GRID) {
 ctx.beginPath();
 ctx.arc(x, y, 0.9, 0, Math.PI * 2);
 ctx.fill();
 }
 }
}