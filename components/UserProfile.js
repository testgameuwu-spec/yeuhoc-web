'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  User,
  SignOut as LogOut,
  CaretDown as ChevronDown,
  Shield,
  UserCircle,
  ClockCounterClockwise as History,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import ThemeToggle from './ThemeToggle';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  const dataLoadedRef = useRef(false);
  const currentUserRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async (sessionUser) => {
      if (dataLoadedRef.current || !isMounted) return;
      dataLoadedRef.current = true; // Chống double fetch

      setUser(sessionUser);
      currentUserRef.current = sessionUser;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
          
        if (profileData && isMounted) {
          if (profileData.is_banned) {
            alert('Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin để biết thêm chi tiết.');
            await supabase.auth.signOut();
            window.location.href = '/login';
            return;
          }
          setProfile(profileData);
        }
      } catch (err) {
        console.warn('UserProfile fetch profile failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          await loadData(session.user);
        } else if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.warn('UserProfile session check failed:', err.message);
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        currentUserRef.current = null;
        dataLoadedRef.current = false;
        setProfile(null);
        setLoading(false);
      } else if (session?.user) {
        loadData(session.user);
      }
    });

    const handleProfileUpdate = async () => {
      const currentUser = currentUserRef.current;
      if (!currentUser) return;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (profileData && isMounted) setProfile(profileData);
    };

    window.addEventListener('yeuhoc-profile-updated', handleProfileUpdate);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('yeuhoc-profile-updated', handleProfileUpdate);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDropdownOpen(false);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <a
          href="/login/"
          className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all no-underline border border-transparent hover:border-gray-200"
        >
          Đăng nhập
        </a>
        <a
          href="/register/"
          className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all no-underline"
        >
          Đăng ký
        </a>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url;
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
        className="flex min-w-0 items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer relative z-[60]"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-2 ring-white" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        <ChevronDown weight="bold" className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl bg-white border border-gray-200 shadow-2xl py-1.5 z-[9999]"
          style={{ animation: 'fadeIn 0.15s ease-out, slideUp 0.2s ease-out' }}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
            {isAdmin && (
              <span className="profile-theme-badge inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full border border-amber-200 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700" style={{ '--profile-badge-dark-color': '#fcd34d' }}>
                <Shield weight="fill" className="w-3 h-3" /> Admin
              </span>
            )}
          </div>

          <div className="py-1">
            <a href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors no-underline cursor-pointer">
              <UserCircle weight="duotone" className="w-[18px] h-[18px] text-gray-400" /> Hồ sơ
            </a>
            <a href="/profile/?tab=history" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors no-underline cursor-pointer">
              <History weight="duotone" className="w-[18px] h-[18px] text-gray-400" /> Lịch sử làm bài
            </a>
            {isAdmin && (
              <a href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors no-underline cursor-pointer">
                <Shield weight="duotone" className="w-[18px] h-[18px] text-gray-400" /> Bảng điều khiển Admin
              </a>
            )}
          </div>

          <div className="border-t border-gray-100 pt-1">
            <div className="px-2 py-1">
              <ThemeToggle showLabel variant="menu" />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent font-medium text-left"
            >
              <LogOut weight="duotone" className="w-[18px] h-[18px]" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
