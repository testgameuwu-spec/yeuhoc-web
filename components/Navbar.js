'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart2, Home, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserProfile from './UserProfile';
import { supabase } from '@/lib/supabase';
import { countUnseenResolvedReports } from '@/lib/reportSeenStorage';
import LogoIcon from './LogoIcon';

export default function Navbar() {
  const pathname = usePathname();
  const normalizedPath = pathname === '/' ? '/' : pathname?.replace(/\/$/, '');
  const [unseenResolvedReports, setUnseenResolvedReports] = useState(0);

  const refreshReportBadge = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUnseenResolvedReports(0);
        return;
      }
      const { data } = await supabase
        .from('question_reports')
        .select('id, status')
        .eq('user_id', session.user.id);
      setUnseenResolvedReports(countUnseenResolvedReports(data || []));
    } catch {
      setUnseenResolvedReports(0);
    }
  }, []);

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      refreshReportBadge();
    }, 0);
    const onSeen = () => refreshReportBadge();
    const onFocus = () => refreshReportBadge();
    window.addEventListener('yeuhoc-reports-seen', onSeen);
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('yeuhoc-reports-seen', onSeen);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshReportBadge]);

  useEffect(() => {
    let reportChannel = null;
    let isMounted = true;

    const subscribeForUser = async (userId) => {
      if (!userId) return;
      reportChannel = supabase
        .channel(`navbar-question-reports-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'question_reports',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshReportBadge();
          }
        )
        .subscribe();
    };

    const initRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      await subscribeForUser(session?.user?.id || null);
    };

    initRealtime();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (reportChannel) {
        supabase.removeChannel(reportChannel);
        reportChannel = null;
      }
      await subscribeForUser(session?.user?.id || null);
      refreshReportBadge();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (reportChannel) {
        supabase.removeChannel(reportChannel);
      }
    };
  }, [refreshReportBadge]);

  const linkClass = (active, extra = '') => (
    `${extra} flex shrink-0 items-center gap-1.5 px-2 sm:px-3 py-1.5 min-h-9 rounded-lg text-sm font-medium transition-all no-underline ${
      active
        ? 'text-indigo-600 bg-indigo-50'
        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
    }`
  );

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 min-w-0">
        {/* ─── Left: Logo ─── */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow">
            <LogoIcon size={20} color="white" />
          </div>
          <span className="site-logo-text font-extrabold text-[17px] text-gray-900 group-hover:text-indigo-600 transition-colors">
            YeuHoc
          </span>
        </Link>

        {/* ─── Center: Nav Links ─── */}
        <nav className="flex min-w-0 items-center justify-center gap-0.5 sm:gap-1">
          <Link
            href="/"
            className={linkClass(normalizedPath === '/')}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Đề thi</span>
          </Link>
          <Link
            href="/profile/phan-tich/"
            className={linkClass(normalizedPath === '/profile/phan-tich')}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Phân tích</span>
          </Link>
          <Link
            href={unseenResolvedReports > 0 ? '/profile/?tab=reports' : '/profile/'}
            className={linkClass(normalizedPath === '/profile', 'relative')}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Hồ sơ</span>
            {unseenResolvedReports > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm"
                title="Báo cáo đã xử lý"
              >
                {unseenResolvedReports > 9 ? '9+' : unseenResolvedReports}
              </span>
            )}
          </Link>
        </nav>

        {/* ─── Right: Auth State ─── */}
        <div className="flex shrink-0 items-center gap-2">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
