'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChartBar, House, User as UserIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { countUnseenResolvedReports } from '@/lib/reportSeenStorage';
import LogoIcon from './LogoIcon';
import ThemeToggle from './ThemeToggle';

const UserProfile = dynamic(() => import('./UserProfile'), {
  ssr: false,
  loading: () => <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />,
});

export default function Navbar() {
  const pathname = usePathname();
  const normalizedPath = pathname === '/' ? '/' : pathname?.replace(/\/$/, '');
  const [unseenResolvedReports, setUnseenResolvedReports] = useState(0);

  const refreshReportBadge = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
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
    }, 2500);
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
    let subscribedUserId = null;
    let subscribeRequestId = 0;
    let isMounted = true;
    let supabaseClient = null;
    let authSubscription = null;
    const getReportChannelTopic = (userId) => `navbar-question-reports-${userId}`;
    const getSupabase = async () => {
      if (!supabaseClient) {
        supabaseClient = (await import('@/lib/supabase')).supabase;
      }
      return supabaseClient;
    };

    const removeReportChannel = async () => {
      if (!reportChannel) return;
      const supabase = await getSupabase();
      const channel = reportChannel;
      reportChannel = null;
      subscribedUserId = null;
      await supabase.removeChannel(channel);
    };

    const removeExistingReportChannel = async (userId) => {
      const supabase = await getSupabase();
      const existingChannel = supabase
        .getChannels()
        .find((channel) => channel.topic === `realtime:${getReportChannelTopic(userId)}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }
    };

    const subscribeForUser = async (userId) => {
      const requestId = ++subscribeRequestId;
      if (!userId) {
        await removeReportChannel();
        return;
      }
      if (reportChannel && subscribedUserId === userId) return;

      await removeReportChannel();
      await removeExistingReportChannel(userId);
      if (!isMounted || requestId !== subscribeRequestId) return;

      const supabase = await getSupabase();
      subscribedUserId = userId;
      reportChannel = supabase
        .channel(getReportChannelTopic(userId))
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
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      await subscribeForUser(session?.user?.id || null);
    };

    const initAuthListener = async () => {
      const supabase = await getSupabase();
      if (!isMounted) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await subscribeForUser(session?.user?.id || null);
        refreshReportBadge();
      });
      authSubscription = subscription;
    };

    const initTimer = setTimeout(() => {
      initRealtime();
      initAuthListener();
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (authSubscription) authSubscription.unsubscribe();
      if (reportChannel && supabaseClient) {
        supabaseClient.removeChannel(reportChannel);
      }
    };
  }, [refreshReportBadge]);

  const linkClass = (active, extra = '') => (
    `${extra} flex shrink-0 items-center gap-1.5 px-2 sm:px-3 py-1.5 min-h-9 rounded-lg text-sm font-medium transition-all no-underline ${
      active
        ? 'text-[var(--home-brand-primary)] bg-[var(--home-brand-soft)] [html[data-theme=dark]_&]:bg-black [html[data-theme=dark]_&]:text-[var(--home-brand-primary)]'
        : 'text-gray-600 hover:text-[var(--home-brand-primary)] hover:bg-[var(--home-brand-soft)] [html[data-theme=dark]_&]:text-gray-300 [html[data-theme=dark]_&]:hover:bg-black [html[data-theme=dark]_&]:hover:text-[var(--home-brand-primary)] [html[data-theme=dark]_&]:active:bg-black'
    }`
  );

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-3 min-w-0">
        {/* ─── Left: Logo ─── */}
        <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-2.5 no-underline group">
          <LogoIcon size={38} color="var(--home-brand-primary)" className="shrink-0" />
          <span className="site-logo-text text-xl transition-colors font-extrabold text-[var(--home-brand-primary)] group-hover:text-[var(--home-brand-hover)]">
            YeuHoc
          </span>
        </Link>

        {/* ─── Center: Nav Links ─── */}
        <nav className="flex min-w-0 items-center justify-center gap-0.5 sm:gap-1">
          <Link
            href="/"
            prefetch={false}
            className={linkClass(normalizedPath === '/')}
          >
            <House className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Đề thi</span>
          </Link>
          <Link
            href="/profile/phan-tich/"
            prefetch={false}
            className={linkClass(normalizedPath === '/profile/phan-tich')}
          >
            <ChartBar className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Phân tích</span>
          </Link>
          <Link
            href={unseenResolvedReports > 0 ? '/profile/?tab=reports' : '/profile/'}
            prefetch={false}
            className={linkClass(normalizedPath === '/profile', 'relative')}
          >
            <UserIcon className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Hồ sơ</span>
            {unseenResolvedReports > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white"
                title="Báo cáo đã xử lý"
              >
                {unseenResolvedReports > 9 ? '9+' : unseenResolvedReports}
              </span>
            )}
          </Link>
        </nav>

        {/* ─── Right: Auth State ─── */}
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
