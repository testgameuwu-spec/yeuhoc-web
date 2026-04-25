'use client';

import {
  BookOpen, FileText, Settings, Users, ChevronLeft, ChevronRight,
  LayoutDashboard, Trophy
} from 'lucide-react';
import UserProfile from '../UserProfile';

const NAV_ITEMS = [
  { key: 'exams', label: 'Đề thi', icon: FileText },
  { key: 'scoring', label: 'Điểm số', icon: Trophy },
  { key: 'users', label: 'Người dùng', icon: Users },
];

export default function AdminSidebar({ activeTab, onTabChange, isOpen, onToggle }) {
  return (
    <aside className={`fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 border-r border-white/8 ${isOpen ? 'w-64' : 'w-20'}`}
      style={{ background: 'rgba(10, 10, 30, 0.95)', backdropFilter: 'blur(20px)' }}>

      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/8">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div className="animate-fadeIn">
              <span className="font-extrabold text-base bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                YeuHoc
              </span>
              <span className="block text-[10px] text-white/30 font-medium -mt-0.5">Admin Panel</span>
            </div>
          )}
        </div>
        <button onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }
                ${!isOpen ? 'justify-center' : ''}
              `}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/8 flex justify-center">
        <UserProfile />
      </div>
    </aside>
  );
}
