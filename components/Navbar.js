'use client';

import { BookOpen, Home } from 'lucide-react';
import UserProfile from './UserProfile';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* ─── Left: Logo ─── */}
        <a href="/yeuhoc/" className="flex items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-[17px] text-gray-900 group-hover:text-indigo-600 transition-colors">
            YeuHoc
          </span>
        </a>

        {/* ─── Center: Nav Links ─── */}
        <nav className="hidden sm:flex items-center gap-1">
          <a
            href="/yeuhoc/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all no-underline"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </a>
        </nav>

        {/* ─── Right: Auth State ─── */}
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
