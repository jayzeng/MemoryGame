import React, { useMemo } from 'react';
import { Sparkles, Star } from 'lucide-react';
import { useSparkleMode } from './SparkleModeContext';

type ParticleSpec = {
  id: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  spin: number;
  color: string;
  shape: 'circle' | 'rect';
};

const COLORS = ['#FF8FAB', '#DCCBFF', '#CDEBFF', '#FFE29A', '#FFFFFF'];

const buildParticles = (count: number): ParticleSpec[] => {
  return Array.from({ length: count }, (_, index) => {
    const size = 3 + Math.random() * 7;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#FFFFFF';
    return {
      id: `particle-${index}`,
      left: Math.random() * 100,
      size,
      duration: 9 + Math.random() * 14,
      delay: -Math.random() * 12,
      opacity: 0.35 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 120,
      spin: (Math.random() - 0.5) * 720,
      color,
      shape: Math.random() > 0.55 ? 'rect' : 'circle',
    };
  });
};

export const SparkleDecor: React.FC = () => {
  const { isSparkleMode } = useSparkleMode();
  const particles = useMemo(() => buildParticles(34), []);

  if (!isSparkleMode) return null;

  return (
    <>
      <div className="sparkle-glow" aria-hidden="true" />
      <div className="sparkle-drift" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className={`sparkle-particle sparkle-particle-${particle.shape}`}
            style={
              {
                left: `${particle.left}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: particle.opacity,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
                '--drift': `${particle.drift}px`,
                '--spin': `${particle.spin}deg`,
                '--sparkleColor': particle.color,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="sparkle-ribbon" aria-hidden="true" />
    </>
  );
};

