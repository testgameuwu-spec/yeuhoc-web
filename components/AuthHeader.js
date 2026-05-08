import Link from 'next/link';
import LogoIcon from './LogoIcon';
import ThemeToggle from './ThemeToggle';

export default function AuthHeader({ active = 'login' }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow">
            <LogoIcon size={20} color="white" />
          </div>
          <span className="site-logo-text font-extrabold text-[17px] text-gray-900 group-hover:text-indigo-600 transition-colors">
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
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register/"
            prefetch={false}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all no-underline ${
              active === 'register'
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            Đăng ký
          </Link>
        </nav>
      </div>
    </header>
  );
}
