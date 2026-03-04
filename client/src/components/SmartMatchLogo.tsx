export function SmartMatchLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景圆形 */}
      <circle cx="60" cy="60" r="58" fill="url(#gradient)" opacity="0.1" />
      
      {/* 大写 S */}
      <text
        x="60"
        y="75"
        fontSize="70"
        fontWeight="bold"
        textAnchor="middle"
        fill="url(#gradient)"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        S
      </text>

      {/* 匹配箭头装饰 */}
      <g opacity="0.8">
        {/* 左箭头 */}
        <path
          d="M 20 55 L 35 55"
          stroke="url(#gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 30 50 L 35 55 L 30 60"
          stroke="url(#gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 右箭头 */}
        <path
          d="M 100 55 L 85 55"
          stroke="url(#gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 90 50 L 85 55 L 90 60"
          stroke="url(#gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* 渐变定义 */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
