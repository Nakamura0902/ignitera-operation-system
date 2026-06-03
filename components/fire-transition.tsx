"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

const COLORS: [number, number, number][] = [
  [96, 165, 250],   // blue-400
  [147, 197, 253],  // blue-300
  [167, 139, 250],  // violet-400
  [192, 132, 252],  // purple-400
  [99, 102, 241],   // indigo-500
  [255, 255, 255],  // white
  [224, 231, 255],  // indigo-100
  [216, 180, 254],  // purple-300
];

export default function FireTransition({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const overlay = overlayRef.current as HTMLDivElement;
    if (!canvas || !overlay) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d")!;
    const particles: Particle[] = [];
    let rafId: number;
    let startTime: number | null = null;
    let completed = false;

    const DURATION = 1600;

    // Fallback: navigate even if rAF stalls (e.g. background tab in automation)
    const fallbackTimer = setTimeout(() => {
      if (!completed) {
        completed = true;
        onCompleteRef.current();
      }
    }, 2500);
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.42;

    function spawnParticle(elapsed: number) {
      const progress = Math.min(elapsed / DURATION, 1);
      const spreadRadius = Math.max(canvas.width, canvas.height) * 0.55 * progress;

      const angle = Math.random() * Math.PI * 2;
      const r = spreadRadius * (0.05 + Math.random() * 0.95);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r * 0.65;

      const speed = 0.8 + Math.random() * 3.5;
      const dir = angle + (Math.random() - 0.5) * 1.2;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      particles.push({
        x: px, y: py,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed - 1.8,
        life: 1,
        decay: 0.007 + Math.random() * 0.018,
        size: 2.5 + Math.random() * 10,
        r: color[0], g: color[1], b: color[2],
      });
    }

    function drawParticle(p: Particle) {
      const a = Math.max(0, p.life);
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${a})`);
      grd.addColorStop(0.45, `rgba(${p.r},${p.g},${p.b},${a * 0.55})`);
      grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Bright white core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
      ctx.fill();
    }

    function frame(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      // Build dark overlay progressively
      const darkAlpha = progress < 0.6
        ? 0.09
        : progress < 0.85
        ? 0.16
        : 0.35;
      ctx.fillStyle = `rgba(1,7,33,${darkAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spawn burst
      const spawnCount =
        progress < 0.1 ? 6
        : progress < 0.5 ? 12 + progress * 20
        : progress < 0.8 ? 8
        : 3;
      for (let i = 0; i < spawnCount; i++) {
        if (particles.length < 900) spawnParticle(elapsed);
      }

      // Draw particles with screen blend for glow
      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        drawParticle(p);
      }
      ctx.globalCompositeOperation = "source-over";

      if (progress >= 1 && !completed) {
        completed = true;
        // Fade the whole overlay out
        overlay.style.transition = "opacity 0.3s ease";
        overlay.style.opacity = "0";
        setTimeout(() => onCompleteRef.current(), 320);
        return;
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fallbackTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ opacity: 1 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Brand message during transition */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2">
        <p
          className="text-blue-200 text-xs font-medium tracking-[0.25em] uppercase"
          style={{ textShadow: "0 0 20px rgba(96,165,250,0.8)" }}
        >
          IGNITERA Command Center
        </p>
        <p className="text-indigo-300/70 text-xs tracking-widest">
          認証完了 — 移動しています
        </p>
      </div>
    </div>
  );
}
