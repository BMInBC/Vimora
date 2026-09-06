import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  iconOnly?: boolean;
  priority?: boolean;
  variant?: 'mark' | 'full';
}

export function Logo({
  size = 32,
  showText = true,
  className = '',
  textClassName = '',
  iconOnly = false,
  priority = false,
  variant = 'mark',
}: LogoProps) {
  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Image
          src="/logo.png"
          alt="Vimora"
          width={Math.round(size * 2.6)}
          height={Math.round(size * 2.26)}
          className="object-contain"
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo-icon.png"
          alt="Vimora"
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-contain drop-shadow-xs"
          priority={priority}
        />
      </div>
      {!iconOnly && showText && (
        <span
          className={`font-extrabold font-nunito tracking-tight text-slate-900 ${
            textClassName || 'text-xl'
          }`}
        >
          Vimora
        </span>
      )}
    </div>
  );
}

export default Logo;
