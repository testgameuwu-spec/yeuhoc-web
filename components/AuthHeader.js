import Link from 'next/link';
import LogoIcon from './LogoIcon';
import ThemeToggle from './ThemeToggle';

export default function AuthHeader({ active = 'login' }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-2.5 no-underline group">
          <LogoIcon size={32} color="var(--home-brand-primary)" className="shrink-0" />
          <span className="site-logo-text font-extrabold text-[17px] text-[var(--home-brand-primary)] group-hover:text-[var(--home-brand-hover)] transition-colors">
            YeuHoc
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login/"
            prefetch={false}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all no-underline ${
              active === 'login'
                ? 'bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)]'
                : 'text-gray-600 hover:text-[var(--home-brand-primary)] hover:bg-[var(--home-brand-soft)]'
            }`}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register/"
            prefetch={false}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all no-underline ${
              active === 'register'
                ? 'bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)]'
                : 'bg-[var(--home-brand-primary)] text-white hover:bg-[var(--home-brand-hover)] shadow-sm'
            }`}
          >
            Đăng ký
          </Link>
        </nav>
      </div>
    </header>
  );
}
