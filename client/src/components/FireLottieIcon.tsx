import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface FireLottieIconProps {
  size?: number;
  className?: string;
}

export const FireLottieIcon: React.FC<FireLottieIconProps> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
      }}
    >
      <DotLottieReact
        src="https://lottie.host/f0719690-f337-4ecc-b7ad-f9458ffc55ca/D95vEF0ZhU.lottie"
        loop
        autoplay
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
