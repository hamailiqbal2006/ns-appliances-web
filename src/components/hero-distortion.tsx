"use client";

import { useEffect, useRef } from "react";

interface HeroDistortionProps {
  activePalette?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  isActive?: boolean;
}

export function HeroDistortion({
  activePalette = {
    primary: "rgba(142, 178, 126, 0.28)",
    secondary: "rgba(68, 138, 125, 0.22)",
    accent: "rgba(225, 238, 200, 0.18)",
  },
  isActive = true,
}: HeroDistortionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Only activate for fine pointer devices (desktop mouse/trackpad) and if reduced motion is disabled
    if (typeof window === "undefined") return;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || prefersReducedMotion || !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let isHovered = false;

    // Canvas sizing with device pixel ratio
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Mouse tracking state
    const mouse = {
      x: width * 0.5,
      y: height * 0.45,
      targetX: width * 0.5,
      targetY: height * 0.45,
      vx: 0,
      vy: 0,
      speed: 0,
      intensity: 0,
      targetIntensity: 0,
    };

    // Ripple trail points
    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      opacity: number;
      color: string;
    }
    const ripples: Ripple[] = [];
    let lastRippleTime = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (clientX >= 0 && clientX <= width && clientY >= 0 && clientY <= height) {
        mouse.targetX = clientX;
        mouse.targetY = clientY;
        mouse.targetIntensity = 1;
        isHovered = true;
      } else {
        mouse.targetIntensity = 0;
        isHovered = false;
      }
    };

    const handleMouseEnter = () => {
      mouse.targetIntensity = 1;
      isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.targetIntensity = 0;
      isHovered = false;
    };

    const heroParent = canvas.parentElement;
    let isLoopRunning = false;

    const startLoop = () => {
      if (isLoopRunning || !isVisible) return;
      isLoopRunning = true;
      animationFrameId = requestAnimationFrame(render);
    };

    const stopLoop = () => {
      if (!isLoopRunning) return;
      isLoopRunning = false;
      cancelAnimationFrame(animationFrameId);
    };

    const onMouseEnter = () => {
      handleMouseEnter();
      startLoop();
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
      startLoop();
    };

    if (heroParent) {
      heroParent.addEventListener("mousemove", onMouseMove, { passive: true });
      heroParent.addEventListener("mouseenter", onMouseEnter, { passive: true });
      heroParent.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    }

    // Pause rendering when hero is scrolled out of viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            startLoop();
          } else {
            stopLoop();
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    let time = 0;

    const render = () => {
      if (!isVisible) {
        stopLoop();
        return;
      }

      time += 0.018;

      // Smooth lerp mouse position
      const prevX = mouse.x;
      const prevY = mouse.y;
      mouse.x += (mouse.targetX - mouse.x) * 0.09;
      mouse.y += (mouse.targetY - mouse.y) * 0.09;

      mouse.vx = mouse.x - prevX;
      mouse.vy = mouse.y - prevY;
      mouse.speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

      // Lerp intensity
      mouse.intensity += (mouse.targetIntensity - mouse.intensity) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Spawn subtle water ripples when moving
      const now = performance.now();
      if (isHovered && mouse.speed > 1.2 && now - lastRippleTime > 110) {
        lastRippleTime = now;
        ripples.push({
          x: mouse.x,
          y: mouse.y,
          radius: 18,
          maxRadius: Math.min(180, 70 + mouse.speed * 8),
          opacity: Math.min(0.35, 0.15 + mouse.speed * 0.015),
          color: activePalette.accent,
        });
        if (ripples.length > 8) ripples.shift();
      }

      // Draw and expand ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.6;
        r.opacity *= 0.96;

        if (r.opacity < 0.005 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.opacity;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // Render the primary liquid refraction lens under the cursor
      if (mouse.intensity > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Gentle breathing pulsation
        const pulse = Math.sin(time * 2.2) * 12;
        const baseRadius = Math.max(140, Math.min(260, 180 + mouse.speed * 4)) + pulse;

        // Angle of velocity for directional liquid elongation
        const angle = Math.atan2(mouse.vy, mouse.vx);
        const stretch = Math.min(1.4, 1.0 + mouse.speed * 0.02);

        ctx.translate(mouse.x, mouse.y);
        ctx.rotate(angle);
        ctx.scale(stretch, 1 / Math.sqrt(stretch));

        // Outer soft ambient refraction glow
        const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
        outerGrad.addColorStop(0, activePalette.primary);
        outerGrad.addColorStop(0.45, activePalette.secondary);
        outerGrad.addColorStop(0.85, "rgba(20, 60, 55, 0.04)");
        outerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.globalAlpha = mouse.intensity * 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        // Inner chromatic core dispersion
        const innerRadius = baseRadius * 0.38;
        const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
        innerGrad.addColorStop(0, activePalette.accent);
        innerGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.08)");
        innerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.globalAlpha = mouse.intensity * 0.65;
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.fill();

        ctx.restore();
      }

      if (!isHovered && mouse.intensity < 0.005 && ripples.length === 0) {
        ctx.clearRect(0, 0, width, height);
        stopLoop();
        return;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener("resize", resize);
      observer.disconnect();
      if (heroParent) {
        heroParent.removeEventListener("mousemove", onMouseMove);
        heroParent.removeEventListener("mouseenter", onMouseEnter);
        heroParent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [activePalette, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-distortion-canvas"
      aria-hidden="true"
    />
  );
}
