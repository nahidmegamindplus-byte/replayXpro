import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  theme?: 'light' | 'dark';
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}

export default function Logo({
  size = 'md',
  variant = 'full',
  theme = 'light',
  className = '',
  showSubtitle = false,
  subtitle = 'সোশ্যাল অটোমেশন প্ল্যাটফর্ম',
}: LogoProps) {
  // Dimensions based on size
  const iconDimensions = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 44, height: 44 },
    xl: { width: 56, height: 56 },
  }[size];

  const textClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  const subTextClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  const replyTextColor = theme === 'dark' ? 'text-white' : 'text-[#0B192C]';

  // SVG Icon Component representing the exact ReplyXAi robot chat bubble with motion trails
  const LogoIcon = (
    <svg
      width={iconDimensions.width}
      height={iconDimensions.height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        {/* Main Blue to Cyan Gradient */}
        <linearGradient id="replyx-blue-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0052FF" />
          <stop offset="50%" stopColor="#007DFE" />
          <stop offset="100%" stopColor="#00D2FF" />
        </linearGradient>

        {/* Glow / Highlight Filter */}
        <filter id="replyx-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0066FF" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Motion / Speed Lines (Top Right) */}
      <g stroke="url(#replyx-blue-gradient)" strokeWidth="4" strokeLinecap="round">
        <path d="M68 18 L88 18" />
        <path d="M74 27 L92 27" />
        <path d="M78 36 L86 36" />
      </g>

      {/* Main Chat Bubble Shape */}
      <path
        d="M52 14 C28 14 10 30 10 50 C10 61 15 70 23 77 L15 93 L36 85 C41 86.5 46.5 87.5 52 87.5 C76 87.5 94 70 94 50 C94 30 76 14 52 14 Z"
        fill="url(#replyx-blue-gradient)"
        filter="url(#replyx-glow)"
      />

      {/* Inner Chat Bubble Cutout / Mask */}
      <path
        d="M52 20 C32 20 16 33.5 16 50.5 C16 59.8 20.2 67.5 27 73.5 L22.5 84 L36.5 78.5 C41.2 79.8 46.5 80.5 52 80.5 C72 80.5 88 67 88 50.5 C88 33.5 72 20 52 20 Z"
        fill="#0052FF"
        opacity="0.25"
      />

      {/* Robot Antenna */}
      <circle cx="52" cy="27" r="3.5" fill="#FFFFFF" />
      <path d="M52 30.5 L52 36" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

      {/* Robot Ears / Side Knobs */}
      <rect x="25" y="47" width="5" height="15" rx="2.5" fill="#FFFFFF" />
      <rect x="74" y="47" width="5" height="15" rx="2.5" fill="#FFFFFF" />

      {/* Robot Head Body (White Rounded Shell) */}
      <rect x="28" y="36" width="48" height="36" rx="14" fill="#FFFFFF" />

      {/* Robot Face Screen (Dark Blue Screen) */}
      <rect x="33" y="41" width="38" height="26" rx="9" fill="#0B192C" />

      {/* Cute Smiling Eyes (^ ^ in vibrant Cyan) */}
      <path
        d="M40 54 Q44 48 48 54"
        stroke="#00D2FF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 54 Q60 48 64 54"
        stroke="#00D2FF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{LogoIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none group ${className}`}>
      {variant !== 'text' && LogoIcon}
      <div className="flex flex-col justify-center leading-none">
        <span className={`font-black tracking-tight font-sans ${textClasses} flex items-center`}>
          <span className={`${replyTextColor} font-extrabold tracking-tight`}>Reply</span>
          <span className="bg-gradient-to-r from-[#0052FF] via-[#0080FF] to-[#00D2FF] bg-clip-text text-transparent font-black">
            X
          </span>
          <span className="bg-gradient-to-r from-[#0052FF] via-[#0080FF] to-[#00D2FF] bg-clip-text text-transparent font-black ml-0.5">
            Ai
          </span>
        </span>
        {showSubtitle && (
          <span className={`text-slate-400 font-medium tracking-wide mt-1 truncate ${subTextClasses}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
