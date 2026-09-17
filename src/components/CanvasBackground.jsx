import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function CanvasBackground() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, animId;
    let orbs = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const isLight = theme === 'light';

    const makeOrb = () => {
      const darkColors = ['rgba(0,212,255,', 'rgba(123,79,255,', 'rgba(0,119,255,', 'rgba(255,107,157,'];
      const lightColors = ['rgba(0,150,255,', 'rgba(100,50,220,', 'rgba(0,100,255,', 'rgba(200,50,120,'];
      const palette = isLight ? lightColors : darkColors;
      const color = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 120 + Math.random() * 220,
        alpha: isLight ? 0.05 + Math.random() * 0.05 : 0.035 + Math.random() * 0.05,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color,
      };
    };

    const initOrbs = () => {
      orbs = [];
      for (let i = 0; i < 7; i++) orbs.push(makeOrb());
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      orbs.forEach((o) => {
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        grad.addColorStop(0, o.color + o.alpha + ')');
        grad.addColorStop(1, o.color + '0)');
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
      });
      animId = requestAnimationFrame(draw);
    };

    resize();
    initOrbs();
    draw();

    window.addEventListener('resize', () => {
      resize();
      initOrbs();
    });

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  return <canvas ref={canvasRef} id="bg-canvas" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
