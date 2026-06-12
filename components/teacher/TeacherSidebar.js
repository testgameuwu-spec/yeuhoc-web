'use client';

import {
  LayoutDashboard, BookOpen, FileText, Users, X, Settings
} from 'lucide-react';
import LogoIcon from '../LogoIcon';

const NAV_ITEMS = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'classrooms', label: 'Lớp học của tôi', icon: Users },
  { key: 'exams', label: 'Đề thi đã tạo', icon: FileText },
  { key: 'settings', label: 'Cài đặt', icon: Settings },
];

export default function TeacherSidebar({ activeTab, onTabChange, onClose }) {
  return (
    <aside className="admin-sidebar fixed top-0 left-0 h-dvh z-40 flex w-64 max-w-[84vw] flex-col overflow-hidden border-r border-white/8 transition-all duration-300"
      style={{ background: 'var(--admin-sidebar-bg)', backdropFilter: 'blur(20px)' }}>

      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/8">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <LogoIcon size={20} color="white" />
          </div>
          <div className="animate-fadeIn">
            <span className="font-extrabold text-base bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              YeuHoc
            </span>
            <span className="block text-[10px] text-white/30 font-medium -mt-0.5">Teacher Panel</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border border-emerald-500/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
