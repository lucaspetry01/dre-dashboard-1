import React, { useState } from 'react';

interface InteractiveFlameIconProps {
  size?: number;
  intensity?: number; // 0-100
  onClick?: () => void;
  className?: string;
}

export const InteractiveFlameIcon: React.FC<InteractiveFlameIconProps> = ({
  size = 24,
  intensity = 50,
  onClick,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const flameIntensity = Math.min(100, intensity + (isHovered ? 20 : 0));
  const scale = 0.8 + (flameIntensity / 100) * 0.2;

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer transition-transform ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <style>{`
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
          25% { transform: scaleY(1.1) scaleX(0.95); opacity: 0.95; }
          50% { transform: scaleY(0.95) scaleX(1.05); opacity: 1; }
          75% { transform: scaleY(1.05) scaleX(0.98); opacity: 0.98; }
        }
        
        @keyframes flamePulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 100, 0, 0.5)); }
          50% { filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8)); }
        }
        
        @keyframes flameFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        .flame-base {
          animation: flameFlicker 0.6s ease-in-out infinite, flamePulse 1.2s ease-in-out infinite, flameFloat 2s ease-in-out infinite;
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flame-base"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Chama externa (vermelha) */}
        <path
          d="M12 2C12 2 8 8 8 12C8 15.3137 9.79086 18 12 18C14.2091 18 16 15.3137 16 12C16 8 12 2 12 2Z"
          fill="#FF6B00"
          opacity={0.9}
        />

        {/* Chama média (laranja) */}
        <path
          d="M12 4C12 4 9.5 8.5 9.5 11.5C9.5 13.9853 10.5294 16 12 16C13.4706 16 14.5 13.9853 14.5 11.5C14.5 8.5 12 4 12 4Z"
          fill="#FF9500"
          opacity={0.8}
        />

        {/* Chama interna (amarela) */}
        <path
          d="M12 6C12 6 11 8.5 11 10C11 11.6569 11.3726 13 12 13C12.6274 13 13 11.6569 13 10C13 8.5 12 6 12 6Z"
          fill="#FFD700"
          opacity={0.7}
        />

        {/* Brilho central */}
        <circle cx="12" cy="9" r="1.5" fill="#FFFFFF" opacity={0.6} />
      </svg>

      {/* Glow effect quando intenso */}
      {flameIntensity > 70 && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255, 107, 0, 0.3) 0%, transparent 70%)`,
            animation: 'flamePulse 1.2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
};
