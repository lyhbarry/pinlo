interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const r = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.65);
  const dy = Math.round(size * 0.72);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width={size} height={size} rx={r} fill="#2563EB" />
      <text
        x={size / 2}
        y={dy}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fill="white"
        textAnchor="middle"
      >
        P
      </text>
    </svg>
  );
}
