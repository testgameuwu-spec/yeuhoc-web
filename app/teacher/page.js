'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import { Menu, BookOpen, ArrowLeft } from 'lucide-react';
import UserProfile from '@/components/UserProfile';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import ClassroomManagement from '@/components/teacher/ClassroomManagement';
import TeacherOverview from '@/components/teacher/TeacherOverview';
import TeacherExamManagement from '@/components/teacher/TeacherExamManagement';

// ── Custom UI Modal ──
const CustomModal = ({ isOpen, type, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14142a] border border-white/10 rounded-2xl w-[90%] max-w-sm p-6 shadow-xl transform transition-all scale-100">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-colors">
              Hủy
            </button>
          )}
          <button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md">
            {type === 'confirm' ? 'Xác nhận' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal state
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Determine what to render in main content
  const renderContent = () => {
    if (activeTab === 'overview') {
      return <TeacherOverview onNavigate={setActiveTab} />;
    }
    if (activeTab === 'classrooms') {
      return <ClassroomManagement showAlert={showAlert} showConfirm={showConfirm} />;
    }
    if (activeTab === 'exams') {
      return <TeacherExamManagement showAlert={showAlert} />;
    }
    if (activeTab === 'settings') {
      return <div className="text-white">Cài đặt cá nhân giáo viên...</div>;
    }
    return null;
  };

  return (
    <main className="admin-shell min-h-screen overflow-x-hidden">
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - overlay on mobile, normal on desktop */}
      <div className={`md:block ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <TeacherSidebar
          activeTab={activeTab}
          onClose={() => setMobileMenuOpen(false)}
          onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }}
        />
      </div>

      <div className="min-w-0 transition-all duration-300 md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-white/8" style={{ isolation: 'isolate' }}>
          <div className="px-3 sm:px-6 md:px-8 min-h-14 sm:min-h-16 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              
              <h1 className="text-sm sm:text-lg font-bold text-white truncate min-w-0">
                {activeTab === 'overview' ? 'Tổng quan Giáo viên' :
                 activeTab === 'classrooms' ? 'Quản lý Lớp học' :
                 activeTab === 'exams' ? 'Đề thi đã tạo' :
                 'Cài đặt'}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <ThemeToggle />
              <button 
                onClick={() => window.location.href = '/'} 
                className="flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                title="Về trang chủ"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Về trang chủ</span>
              </button>
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="w-full max-w-full p-3 sm:p-5 md:p-8 animate-fadeIn">
          {renderContent()}
        </div>
      </div>
      {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
    </main>
  );
}
