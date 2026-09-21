import type React from 'react';

interface StockChartLogoProps {
  size?: number;
  className?: string;
  idPrefix?: string;
}

export const StockChartLogo: React.FC<StockChartLogoProps> = ({ 
  size = 28, 
  className = '',
  idPrefix = 'sct'
}) => {
  const bgId = `${idPrefix}-bg`;
  const trendId = `${idPrefix}-trend`;
  const candleUpId = `${idPrefix}-cup`;
  const candleMidId = `${idPrefix}-cmid`;
  const glowId = `${idPrefix}-glow`;

  return (
    <svg
      className={`brand-svg-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b0f19" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={trendId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0071e3" />
          <stop offset="55%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={candleUpId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={candleMidId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle base */}
      <rect width="64" height="64" rx="16" fill={`url(#${bgId})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="15.25"
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth="1.5"
      />

      {/* Candlestick 1 (Consolidation) */}
      <line x1="18" y1="28" x2="18" y2="46" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <rect x="15" y="32" width="6" height="10" rx="1.5" fill="#475569" />

      {/* Candlestick 2 (Accumulation) */}
      <line x1="32" y1="22" x2="32" y2="44" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="29" y="26" width="6" height="12" rx="1.5" fill={`url(#${candleMidId})`} />

      {/* Candlestick 3 (Bullish Breakout) */}
      <line x1="46" y1="12" x2="46" y2="38" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <rect x="43" y="16" width="6" height="15" rx="1.5" fill={`url(#${candleUpId})`} />

      {/* Ascending Trend Dynamic Glow Curve */}
      <path
        d="M12 45 C 22 42, 28 32, 42 22 L 52 14"
        stroke={`url(#${trendId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />
      <circle cx="52" cy="14" r="3.5" fill="#34d399" filter={`url(#${glowId})`} />
      <circle cx="52" cy="14" r="1.5" fill="#ffffff" />
    </svg>
  );
};
export default StockChartLogo;
