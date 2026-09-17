'use client';

import React, { useEffect, useRef } from 'react';

export const IntelligentBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse parallax tracking
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Floating particles (geological dust & data packets)
    const PARTICLE_COUNT = 36;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = [
      'rgba(197, 139, 58, ', // Geological Amber
      'rgba(20, 184, 166, ',  // Terrain Teal
      'rgba(59, 130, 246, ',  // Intelligence Blue
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.6,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: (Math.random() - 0.5) * 0.35 - 0.1, // slight upward drift
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.35 + 0.15,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse parallax lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const parallaxOffsetX = ((mouseX / width) - 0.5) * 20;
      const parallaxOffsetY = ((mouseY / height) - 0.5) * 20;

      // Render subtle connection web between nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.08;
            ctx.strokeStyle = `rgba(197, 139, 58, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x + parallaxOffsetX, particles[i].y + parallaxOffsetY);
            ctx.lineTo(particles[j].x + parallaxOffsetX, particles[j].y + parallaxOffsetY);
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x + parallaxOffsetX, p.y + parallaxOffsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Base Gradient */}
      <div className="absolute inset-0 bg-[#0E1113]" />

      {/* 2. Atmospheric Lighting Radials */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#C58B3A]/[0.035] blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-[700px] h-[700px] rounded-full bg-[#14B8A6]/[0.03] blur-3xl" />

      {/* 3. Geological Topographic Contour Curves (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] text-[#C58B3A]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <path
          d="M-100 200 C 300 120, 600 280, 1000 180 C 1400 80, 1700 250, 2100 160"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <path
          d="M-100 350 C 350 260, 700 420, 1100 320 C 1500 220, 1800 400, 2200 310"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M-100 500 C 250 430, 650 560, 1050 480 C 1450 400, 1750 580, 2150 490"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <path
          d="M-100 680 C 320 620, 720 740, 1150 660 C 1550 580, 1850 760, 2250 670"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M-100 840 C 280 800, 680 900, 1100 820 C 1500 750, 1800 920, 2200 830"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* 4. Fine Tactical Survey Grid */}
      <div className="absolute inset-0 bg-survey-grid opacity-60" />

      {/* 5. Floating Particles Canvas with Parallax */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
