"use client";

export default function RoboticDiagram() {
  return (
    <div className="relative w-full max-w-5xl mx-auto flex items-center justify-center py-8 overflow-visible">
      {/* 3D tilted diagram container - strong upward tilt like a photo */}
      <div
        className="relative w-full max-w-4xl"
        style={{
          perspective: "1400px",
          perspectiveOrigin: "50% 40%",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="relative origin-center rounded-xl overflow-hidden plate-bg"
          style={{
            transform: "perspective(1200px) rotateX(28deg) rotateZ(-1deg) scale(1.1)",
            transformStyle: "preserve-3d",
            boxShadow: "0 25px 80px -20px rgba(0,0,0,0.15)",
          }}
        >
          <svg
            viewBox="0 0 900 550"
            className="w-full h-auto rounded-xl bg-transparent"
            style={{
              filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.06))",
            }}
          >
            <defs>
              <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {/* Isometric grid - receding lines create 3D plane */}
            <g stroke="url(#gridGrad)" strokeWidth="1.5" fill="none">
              {/* Lines receding to top-right */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`iso1-${i}`}
                  x1={100 - i * 50}
                  y1={450 + i * 35}
                  x2={500 + i * 60}
                  y2={80 - i * 25}
                />
              ))}
              {/* Lines receding to top-left */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`iso2-${i}`}
                  x1={800 + i * 50}
                  y1={450 + i * 35}
                  x2={400 - i * 60}
                  y2={80 - i * 25}
                />
              ))}
              {/* Horizontal-ish grid lines */}
              {Array.from({ length: 10 }).map((_, i) => {
                const y = 100 + i * 45;
                const spread = 250 + i * 25;
                return (
                  <line
                    key={`h-${i}`}
                    x1={450 - spread}
                    y1={y}
                    x2={450 + spread}
                    y2={y}
                  />
                );
              })}
            </g>

            {/* Connecting lines from central hub to nodes */}
            <g stroke="#94a3b8" strokeWidth="1" fill="none" opacity="0.6">
              <line x1="450" y1="270" x2="220" y2="200" />
              <line x1="450" y1="270" x2="560" y2="160" />
              <line x1="450" y1="270" x2="150" y2="320" />
              <line x1="450" y1="270" x2="680" y2="340" />
              <line x1="450" y1="270" x2="320" y2="380" />
              <line x1="450" y1="270" x2="480" y2="140" />
              <line x1="450" y1="270" x2="260" y2="120" />
              <line x1="450" y1="270" x2="620" y2="420" />
              <line x1="450" y1="270" x2="350" y2="95" />
              <line x1="450" y1="270" x2="170" y2="180" />
              <line x1="450" y1="270" x2="550" y2="390" />
            </g>

            {/* Central hub - light blue diamond with white X */}
            <g transform="translate(450, 270)">
              <path
                d="M0,-42 L30,-14 L0,42 L-30,-14 Z"
                fill="url(#hubGrad)"
                stroke="#0ea5e9"
                strokeWidth="2"
              />
              <path
                d="M-18,-6 L18,6 M18,-6 L-18,6"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M-18,-6 L18,6 M18,-6 L-18,6"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Quadrant labels - rotated to match isometric angle */}
            <text
              x="180"
              y="95"
              fill="#64748b"
              fontSize="12"
              fontWeight="600"
              transform="rotate(-25, 180, 95)"
            >
              Public Clouds
            </text>
            <text
              x="620"
              y="95"
              fill="#64748b"
              fontSize="12"
              fontWeight="600"
              transform="rotate(25, 620, 95)"
            >
              Data Clouds
            </text>
            <text
              x="680"
              y="440"
              fill="#64748b"
              fontSize="12"
              fontWeight="600"
              transform="rotate(-25, 680, 440)"
            >
              Private Clouds
            </text>
            <text
              x="120"
              y="440"
              fill="#64748b"
              fontSize="12"
              fontWeight="600"
              transform="rotate(25, 120, 440)"
            >
              SaaS Clouds
            </text>

            {/* Arduino-like dev board - blue */}
            <g transform="translate(200, 185) scale(0.45)">
              <path
                d="M0,0 L55,0 L55,35 L0,35 Z"
                fill="#3b82f6"
                stroke="#2563eb"
                strokeWidth="1"
                transform="skewX(-22)"
              />
              <rect
                x="8"
                y="6"
                width="5"
                height="5"
                fill="#1e40af"
                transform="skewX(-22)"
              />
              <rect
                x="28"
                y="6"
                width="5"
                height="5"
                fill="#1e40af"
                transform="skewX(-22)"
              />
              <rect
                x="42"
                y="6"
                width="5"
                height="5"
                fill="#1e40af"
                transform="skewX(-22)"
              />
              <rect
                x="18"
                y="22"
                width="20"
                height="8"
                fill="#1e3a8a"
                transform="skewX(-22)"
              />
            </g>

            {/* Green PCB */}
            <g transform="translate(280, 350) scale(0.4)">
              <path
                d="M0,0 L45,0 L45,28 L0,28 Z"
                fill="#22c55e"
                stroke="#16a34a"
                strokeWidth="1"
                transform="skewX(-20)"
              />
              <rect
                x="8"
                y="5"
                width="5"
                height="5"
                fill="#166534"
                transform="skewX(-20)"
              />
              <rect
                x="25"
                y="5"
                width="5"
                height="5"
                fill="#166534"
                transform="skewX(-20)"
              />
              <rect
                x="15"
                y="16"
                width="5"
                height="5"
                fill="#15803d"
                transform="skewX(-20)"
              />
            </g>

            {/* Chip/IC */}
            <g transform="translate(530, 165) scale(0.38)">
              <path
                d="M0,0 L48,0 L48,28 L0,28 Z"
                fill="#1f2937"
                stroke="#111827"
                strokeWidth="1"
                transform="skewX(-18)"
              />
              <rect
                x="4"
                y="4"
                width="2"
                height="6"
                fill="#4b5563"
                transform="skewX(-18)"
              />
              <rect
                x="42"
                y="4"
                width="2"
                height="6"
                fill="#4b5563"
                transform="skewX(-18)"
              />
            </g>

            {/* Silver motor */}
            <g transform="translate(610, 315) scale(0.42)">
              <ellipse
                cx="24"
                cy="14"
                rx="22"
                ry="9"
                fill="#94a3b8"
                stroke="#64748b"
              />
              <rect
                x="4"
                y="14"
                width="40"
                height="22"
                fill="#cbd5e1"
                stroke="#64748b"
              />
              <circle cx="24" cy="25" r="7" fill="#94a3b8" stroke="#64748b" />
            </g>

            {/* Gear */}
            <g transform="translate(155, 295) scale(0.5)">
              <path
                d="M0,-22 L5,-9 L22,-9 L9,4 L14,22 L0,11 L-14,22 L-9,4 L-22,-9 L-5,-9 Z"
                fill="#9ca3af"
                stroke="#6b7280"
                strokeWidth="1"
              />
              <circle cx="0" cy="0" r="6" fill="#6b7280" />
            </g>

            {/* Battery pack */}
            <g transform="translate(355, 95) scale(0.38)">
              <rect
                x="0"
                y="5"
                width="42"
                height="26"
                rx="2"
                fill="#64748b"
                stroke="#475569"
              />
              <rect
                x="5"
                y="10"
                width="32"
                height="16"
                fill="#22c55e"
                opacity="0.9"
              />
              <rect x="42" y="12" width="5" height="12" rx="1" fill="#94a3b8" />
            </g>

            {/* Camera/sensor module - white with lens */}
            <g transform="translate(465, 125) scale(0.42)">
              <path
                d="M0,0 L38,0 L38,22 L0,22 Z"
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth="1"
                transform="skewX(-15)"
              />
              <circle
                cx="19"
                cy="11"
                r="6"
                fill="#64748b"
                transform="skewX(-15)"
              />
              <circle
                cx="19"
                cy="11"
                r="3"
                fill="#94a3b8"
                transform="skewX(-15)"
              />
            </g>

            {/* Mini robot chassis - red */}
            <g transform="translate(265, 115) scale(0.52)">
              <rect
                x="5"
                y="10"
                width="24"
                height="14"
                rx="2"
                fill="#ef4444"
                stroke="#dc2626"
              />
              <circle cx="10" cy="24" r="3" fill="#374151" />
              <circle cx="24" cy="24" r="3" fill="#374151" />
            </g>

            {/* USB drive */}
            <g transform="translate(130, 165) scale(0.35)">
              <path
                d="M0,0 L50,0 L50,18 L0,18 Z"
                fill="#374151"
                stroke="#1f2937"
                transform="skewX(-25)"
              />
              <rect
                x="8"
                y="5"
                width="12"
                height="8"
                fill="#1f2937"
                transform="skewX(-25)"
              />
            </g>

            {/* Padlock + dollar (security) */}
            <g transform="translate(575, 405) scale(0.4)">
              <rect
                x="8"
                y="15"
                width="24"
                height="22"
                rx="2"
                fill="#f59e0b"
                stroke="#d97706"
              />
              <path
                d="M15,15 L15,10 Q15,5 20,5 Q25,5 25,10 L25,15"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
              />
              <text
                x="16"
                y="30"
                fill="#92400e"
                fontSize="14"
                fontWeight="bold"
              >
                $
              </text>
            </g>

            {/* Green leaf (eco/abstract) */}
            <g transform="translate(340, 85) scale(0.3)">
              <path
                d="M15,0 Q30,15 15,35 Q0,15 15,0"
                fill="#22c55e"
                stroke="#16a34a"
                opacity="0.9"
              />
            </g>

            {/* Snowflake (data/abstract) */}
            <g transform="translate(620, 150) scale(0.25)">
              <path
                d="M15,0 L15,30 M10,5 L20,25 M20,5 L10,25 M0,15 L30,15 M5,10 L25,20 M25,10 L5,20"
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
