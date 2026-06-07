'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Wrench, X } from 'lucide-react';

export default function GlobalSiteWrapper({ children }) {
  const [settings, setSettings] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissedNotice, setDismissedNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        // 1. Fetch system settings
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'general')
          .single();

        if (settingsData && settingsData.value) {
          if (isMounted) setSettings(settingsData.value);
        }

        // 2. Check if user is admin
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (isMounted && profile?.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error fetching global settings:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // During initial load, still render children to avoid layout shifting or blank screen,
  // but if maintenance mode was on previously, it might flash. 
  // For better UX, we could return null or a loader, but returning children is safer for SEO/SSR.
  if (loading) {
    return <>{children}</>;
  }

  // If maintenance mode is ON and user is NOT admin -> Block access
  if (settings?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
          <Wrench className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Hệ thống đang bảo trì</h1>
        <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
          {settings.maintenanceMessage || 'Chúng tôi đang nâng cấp hệ thống để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  // Normal rendering, with optional notice banner
  return (
    <>
      {settings?.showNotice && !dismissedNotice && settings?.noticeMessage && (
        <div className="bg-indigo-600 text-white px-4 py-2.5 sm:py-3 shadow-md relative z-[100] flex items-center justify-center animate-fadeIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full gap-4">
            <div className="flex-1 flex items-center justify-center gap-2.5 sm:gap-3 text-sm sm:text-base font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-indigo-200" />
              <span className="leading-snug">{settings.noticeMessage}</span>
            </div>
            <button 
              onClick={() => setDismissedNotice(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              aria-label="Đóng thông báo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
