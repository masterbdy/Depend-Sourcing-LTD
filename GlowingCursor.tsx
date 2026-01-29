
import React, { useEffect, useRef } from 'react';

const GlowingCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; lifetime: number }[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // Add Point Function
    const addPoint = (x: number, y: number) => {
      // Add point with full lifetime
      pointsRef.current.push({ x, y, lifetime: 1.0 });
    };

    // Event Listeners
    const handleMouseMove = (e: MouseEvent) => addPoint(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        // Prevent scrolling only if drawing trails (Optional: remove preventDefault if scrolling is preferred)
        // e.preventDefault(); 
        const touch = e.touches[0];
        addPoint(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Animation Loop
    const animate = () => {
      // Clear canvas with slight fade effect or full clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter dead points and age existing ones
      // Decay rate: Lower = Longer trail
      pointsRef.current = pointsRef.current
        .map(p => ({ ...p, lifetime: p.lifetime - 0.015 })) 
        .filter(p => p.lifetime > 0);

      // Drawing Logic
      if (pointsRef.current.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. Outer Glow (The "Tube" Halo)
        ctx.beginPath();
        ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);
        for (let i = 1; i < pointsRef.current.length; i++) {
          const p = pointsRef.current[i];
          const prev = pointsRef.current[i - 1];
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
        ctx.lineTo(
          pointsRef.current[pointsRef.current.length - 1].x, 
          pointsRef.current[pointsRef.current.length - 1].y
        );

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff'; // Cyan glow
        ctx.lineWidth = 12;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)'; // Semi-transparent outer tube
        ctx.stroke();

        // 2. Inner Core (Bright White/Blue)
        ctx.beginPath();
        ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);
        for (let i = 1; i < pointsRef.current.length; i++) {
          const p = pointsRef.current[i];
          const prev = pointsRef.current[i - 1];
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
        ctx.lineTo(
          pointsRef.current[pointsRef.current.length - 1].x, 
          pointsRef.current[pointsRef.current.length - 1].y
        );

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff'; // Solid white core
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default GlowingCursor;
