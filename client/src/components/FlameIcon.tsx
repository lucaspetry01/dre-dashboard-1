// Ícone de chama animada para destacar a categoria de maior gasto
export function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF7A1A" />
          <stop offset="45%" stopColor="#FF3B30" />
          <stop offset="100%" stopColor="#FFD23B" />
        </linearGradient>
      </defs>
      <style>{`
        .flame-outer {
          transform-origin: 32px 50px;
          animation: flicker-outer 1.1s ease-in-out infinite alternate;
        }
        .flame-inner {
          transform-origin: 32px 46px;
          animation: flicker-inner 0.9s ease-in-out infinite alternate;
        }
        @keyframes flicker-outer {
          0% { transform: scaleY(1) scaleX(1) rotate(-1.5deg); }
          50% { transform: scaleY(1.05) scaleX(0.97) rotate(1deg); }
          100% { transform: scaleY(0.97) scaleX(1.03) rotate(-1deg); }
        }
        @keyframes flicker-inner {
          0% { transform: scaleY(1) scaleX(1) translateY(0); }
          50% { transform: scaleY(1.08) scaleX(0.94) translateY(-1px); }
          100% { transform: scaleY(0.95) scaleX(1.05) translateY(1px); }
        }
      `}</style>
      <path
        className="flame-outer"
        fill="url(#flameGrad)"
        d="M32 6 C24 16 18 22 18 34 C18 45 24 52 32 52 C40 52 46 45 46 34 C46 22 40 16 32 6 Z M32 14 C36 20 40 26 40 34 C40 41 37 45 32 45 C27 45 24 41 24 34 C24 26 28 20 32 14 Z"
      />
      <path
        className="flame-inner"
        fill="#FFE066"
        d="M32 22 C29 27 26 30 26 35 C26 40 29 43 32 43 C35 43 38 40 38 35 C38 30 35 27 32 22 Z"
      />
    </svg>
  );
}