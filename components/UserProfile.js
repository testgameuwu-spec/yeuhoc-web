'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User,
  LogOut,
  ChevronDown,
  Shield,
  UserCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // 1. Initial Session Check
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;
        
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Fetch profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileData) {
              if (profileData.is_banned) {
                alert('Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin để biết thêm chi tiết.');
                await supabase.auth.signOut();
                window.location.href = '/yeuhoc/login';
                return;
              }
              setProfile(profileData);
            }
          }
        }
      } catch (err) {
        console.warn('UserProfile: Session check failed:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkSession();

    // Safety timeout: Never stay in loading state more than 4 seconds
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => { 
      mounted = false; 
      clearTimeout(safetyTimer);
    };
  }, []);

  // 2. Auth State Listener (separate to avoid loops)
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('UserProfile Auth Event:', event);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          if (profileData.is_banned) {
            alert('Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin để biết thêm chi tiết.');
            await supabase.auth.signOut();
            window.location.href = '/yeuhoc/login';
            return;
          }
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
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
    window.location.href = '/yeuhoc/';
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/yeuhoc/login"
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all no-underline border border-transparent hover:border-gray-200"
        >
          Đăng nhập
        </a>
        <a
          href="/yeuhoc/register"
          className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all no-underline"
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
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer relative z-[60]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover ring-2 ring-white" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-2xl py-1.5 z-[9999]"
          style={{ animation: 'fadeIn 0.15s ease-out, slideUp 0.2s ease-out' }}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>

          <div className="py-1">
            <a href="/yeuhoc/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors no-underline cursor-pointer">
              <UserCircle className="w-4 h-4 text-gray-400" /> Hồ sơ
            </a>
            {isAdmin && (
              <a href="/yeuhoc/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors no-underline cursor-pointer">
                <Shield className="w-4 h-4 text-gray-400" /> Bảng điều khiển Admin
              </a>
            )}
          </div>

          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent font-medium text-left"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
