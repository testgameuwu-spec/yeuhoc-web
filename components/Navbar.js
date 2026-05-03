'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Home, User } from 'lucide-react';
import UserProfile from './UserProfile';
import { supabase } from '@/lib/supabase';
import { countUnseenResolvedReports } from '@/lib/reportSeenStorage';
import LogoIcon from './LogoIcon';

export default function Navbar() {
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
    refreshReportBadge();
    const onSeen = () => refreshReportBadge();
    const onFocus = () => refreshReportBadge();
    window.addEventListener('yeuhoc-reports-seen', onSeen);
    window.addEventListener('focus', onFocus);
    return () => {
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

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200" style={{ isolation: 'isolate' }}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* ─── Left: Logo ─── */}
        <a href="/yeuhoc/" className="flex items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow">
            <LogoIcon size={1000} color="white" />
          </div>
          <span className="font-extrabold text-[17px] text-gray-900 group-hover:text-indigo-600 transition-colors">
            YeuHoc
          </span>
        </a>

        {/* ─── Center: Nav Links ─── */}
        <nav className="flex items-center gap-1">
          <a
            href="/yeuhoc/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all no-underline"
          >
            <Home className="w-4 h-4" />
            Đề thi
          </a>
          <a
            href={unseenResolvedReports > 0 ? '/yeuhoc/profile?tab=reports' : '/yeuhoc/profile'}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all no-underline"
          >
            <User className="w-4 h-4" />
            Hồ sơ
            {unseenResolvedReports > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm"
                title="Báo cáo đã xử lý"
              >
                {unseenResolvedReports > 9 ? '9+' : unseenResolvedReports}
              </span>
            )}
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
