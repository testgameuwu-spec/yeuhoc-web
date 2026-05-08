'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ showLabel = false, variant = 'icon', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Chuyển sang light mode' : 'Chuyển sang dark mode';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle theme-toggle-${variant} ${showLabel ? 'theme-toggle-with-label' : ''} ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon weight="duotone" className="theme-toggle-icon" />
      {showLabel && (
        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  );
}
