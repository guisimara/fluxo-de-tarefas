import { useEffect, useMemo, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.6 + 0.6,
    opacity: Math.random() * 0.45 + 0.15,
    duration: Math.random() * 5 + 5,
    delay: Math.random() * 6,
  }));
}

/** Fundo sutil de estrelas: flutuam suavemente e sobem em paralaxe conforme a página é rolada. */
export function StarField() {
  const layerRef = useRef<HTMLDivElement>(null);
  const stars = useMemo(() => generateStars(90), []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (layerRef.current) {
          const y = window.scrollY * 0.15;
          layerRef.current.style.transform = `translateY(-${y}px)`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div ref={layerRef} className="absolute inset-0 will-change-transform" style={{ transition: "transform 0.3s ease-out" }}>
        {stars.map((s, i) => (
          <span
            key={i}
            className="star-particle absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
