import React from 'react';

interface PulsingFlameIconProps {
  size?: number;
  className?: string;
}

export const PulsingFlameIcon: React.FC<PulsingFlameIconProps> = ({
  size = 20,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes flamePulse {
          0% {
            transform: scale(1);
            opacity: 1;
            filter: drop-shadow(0 0 2px rgba(255, 69, 0, 0.8));
          }
          50% {
            transform: scale(1.15);
            opacity: 0.9;
            filter: drop-shadow(0 0 12px rgba(255, 69, 0, 1));
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: drop-shadow(0 0 2px rgba(255, 69, 0, 0.8));
          }
        }

        @keyframes flameWave {
          0%, 100% {
            d: path('M12 2C12 2 8 8 8 12C8 15.3137 9.79086 18 12 18C14.2091 18 16 15.3137 16 12C16 8 12 2 12 2Z');
          }
          50% {
            d: path('M12 1.5C12 1.5 7.5 8 7.5 12.5C7.5 16 9.5 19 12 19C14.5 19 16.5 16 16.5 12.5C16.5 8 12 1.5 12 1.5Z');
          }
        }

        .flame-icon {
          animation: flamePulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flame-icon"
      >
        {/* Camada externa - Vermelho escuro */}
        <path
          d="M12 2C12 2 8 8 8 12C8 15.3137 9.79086 18 12 18C14.2091 18 16 15.3137 16 12C16 8 12 2 12 2Z"
          fill="#FF4500"
        />

        {/* Camada média - Laranja */}
        <path
          d="M12 4C12 4 9.5 8.5 9.5 11.5C9.5 13.9853 10.5294 16 12 16C13.4706 16 14.5 13.9853 14.5 11.5C14.5 8.5 12 4 12 4Z"
          fill="#FF8C00"
        />

        {/* Camada interna - Amarelo ouro */}
        <path
          d="M12 6C12 6 11 8.5 11 10C11 11.6569 11.3726 13 12 13C12.6274 13 13 11.6569 13 10C13 8.5 12 6 12 6Z"
          fill="#FFD700"
        />

        {/* Brilho central branco */}
        <circle cx="12" cy="9" r="1.2" fill="#FFFFFF" opacity="0.8" />
      </svg>
    </div>
  );
};
