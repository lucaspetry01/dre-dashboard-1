import React, { useEffect, useRef } from 'react';

interface RocketLottieIconProps {
  size?: number;
  className?: string;
}

export const RocketLottieIcon: React.FC<RocketLottieIconProps> = ({
  size = 40,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Carregar a biblioteca Lottie dinamicamente
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lottie-web@5/build/player/lottie.js';
    script.async = true;

    script.onload = () => {
      if (window.lottie && containerRef.current) {
        // Carregar a animação do LottieFiles
        window.lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: 'https://lottie.host/804d085b-1c91-4f3f-94a1-042b4e233394/DvLXDqEjAe.json',
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
      }}
    />
  );
};

// Declarar tipo global para window.lottie
declare global {
  interface Window {
    lottie: any;
  }
}
