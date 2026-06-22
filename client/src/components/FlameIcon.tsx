// Ícone de chama minimalista em traço (outline), estilo "destaque popular"
export function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Categoria de maior gasto"
    >
      <style>{`
        .flame-path {
          transform-origin: 8px 8px;
          animation: flame-pulse 1.6s ease-in-out infinite;
        }
        @keyframes flame-pulse {
          0%, 100% { stroke-width: 1.1; opacity: 0.85; }
          50% { stroke-width: 1.4; opacity: 1; }
        }
      `}</style>
      <path
        className="flame-path"
        fill="none"
        stroke="#FF5353"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.81 13.65 C5.81 13.65 5.04 13.27 5.42 11.51 C5.81 9.66 3.75 10.6 5.71 5.04 C5.71 5.04 6.91 8.66 9.09 8.01 C9.09 8.01 9.37 5.57 9.83 4.77 C10.86 2.95 12.96 1.76 13.21 0.49 C13.21 0.49 13.13 2.18 12.84 5.80 C12.61 8.11 10.72 8.55 11.09 10.56 C11.46 12.58 13.50 13.24 13.82 12.25 C14.22 10.99 14.19 8.32 15.67 7.52 C15.67 7.52 14.88 9.40 16.10 10.50 C16.52 11.22 17.99 12.35 16.65 14.02"
        transform="translate(-2.5, -0.5) scale(0.78)"
      />
    </svg>
  );
}
