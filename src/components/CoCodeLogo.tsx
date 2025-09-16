import { useEffect, useState } from 'react';
import darkLogo from '@/assets/cocode-logo-dark.svg';
import lightLogo from '@/assets/cocode-logo-light.svg';
import { cn } from '@/lib/utils';

type LogoVariant = 'light' | 'dark' | 'auto';

type LogoSize = 'sm' | 'md' | 'lg';

export interface CoCodeLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}

const sizeMap: Record<LogoSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

function resolveEffectiveTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = localStorage.getItem('cocode-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export function CoCodeLogo({
  variant = 'auto',
  size = 'md',
  showWordmark = false,
  className,
}: CoCodeLogoProps) {
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => resolveEffectiveTheme());

  useEffect(() => {
    if (variant !== 'auto') return;

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: string; effectiveTheme?: string }>;
      const next = customEvent.detail?.effectiveTheme || customEvent.detail?.theme;
      if (next === 'light' || next === 'dark') {
        setEffectiveTheme(next);
      } else {
        setEffectiveTheme(resolveEffectiveTheme());
      }
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, [variant]);

  const resolvedVariant: 'light' | 'dark' = variant === 'auto' ? effectiveTheme : variant;
  const src = resolvedVariant === 'dark' ? darkLogo : lightLogo;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={src}
        alt="CoCode logo"
        className={cn('transition-opacity duration-200', sizeMap[size])}
      />
      {showWordmark && (
        <span className="font-semibold tracking-tight text-fg">CoCode</span>
      )}
    </div>
  );
}
