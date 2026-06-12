'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users, FileText, Bell, Check, X as XIcon, Trash2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import UserProfile from '@/components/UserProfile';
import ClassroomExamManagement from '@/components/teacher/ClassroomExamManagement';

const CustomModal = ({ isOpen, type, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14142a] border border-white/10 rounded-2xl w-[90%] max-w-sm p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-colors">
              Hủy
            </button>
          )}
          <button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
            {type === 'confirm' ? 'Xác nhận' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ClassroomDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // members, exams, announcements
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'exams' || tab === 'members' || tab === 'announcements') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchClassroomData();
  }, [id]);

  const fetchClassroomData = async () => {
    setLoading(true);
    try {
      // Get classroom info
      const { data: clsData, error: clsError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();
      if (clsError) throw clsError;
      setClassroom(clsData);

      // Get members
      const { data: memData, error: memError } = await supabase
        .from('classroom_members')
        .select(`
          status,
          joined_at,
          user_id,
          profiles:user_id (id, full_name, email, avatar_url)
        `)
        .eq('classroom_id', id)
        .order('joined_at', { ascending: false });
      if (memError) throw memError;
      setMembers(memData || []);

    } catch (err) {
      console.error('Error fetching class details:', err);
      alert('Không thể tải dữ liệu lớp học.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberStatus = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from('classroom_members')
        .update({ status: newStatus })
        .eq('classroom_id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (newStatus === 'rejected') {
        // Option to delete the row if rejected
        await supabase.from('classroom_members').delete().eq('classroom_id', id).eq('user_id', userId);
        setMembers(prev => prev.filter(m => m.user_id !== userId));
      } else {
        setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: newStatus } : m));
      }
    } catch (err) {
      console.error('Update status error:', err);
      alert('Không thể cập nhật trạng thái.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Chắc chắn muốn xóa học sinh này khỏi lớp?')) return;
    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (err) {
      console.error('Remove member error:', err);
      alert('Không thể xóa học sinh.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Đang tải chi tiết lớp...</div>;
  }

  if (!classroom) {
    return <div className="min-h-screen flex items-center justify-center text-white">Lớp học không tồn tại hoặc bạn không có quyền truy cập.</div>;
  }

  const pendingMembers = members.filter(m => m.status === 'pending');
  const approvedMembers = members.filter(m => m.status === 'approved');

  return (
    <main className="admin-shell min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 glass border-b border-white/8">
        <div className="px-3 sm:px-6 md:px-8 min-h-14 sm:min-h-16 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/teacher?tab=classrooms')} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-lg font-bold text-white truncate min-w-0">
              Chi tiết: {classroom.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 md:p-8 animate-fadeIn max-w-6xl mx-auto space-y-6">
        
        {/* Class Info Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">{classroom.name}</h2>
              {classroom.description && <p className="text-white/60 text-sm mb-4">{classroom.description}</p>}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-mono border border-white/20">
                Mã tham gia: <strong className="text-emerald-400">{classroom.join_code}</strong>
              </div>
            </div>
            {/* Nav Tabs */}
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
              {[
                { key: 'members', label: 'Học sinh', icon: Users },
                { key: 'exams', label: 'Đề thi', icon: FileText },
                { key: 'announcements', label: 'Thông báo', icon: Bell },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key ? 'bg-emerald-500 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {pendingMembers.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Yêu cầu tham gia ({pendingMembers.length})
                </h3>
                <div className="space-y-3">
                  {pendingMembers.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <div className="font-bold text-white">{member.profiles?.full_name || 'Học sinh ẩn danh'}</div>
                        <div className="text-xs text-white/40">{member.profiles?.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleMemberStatus(member.user_id, 'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-semibold flex items-center gap-1">
                          <Check className="w-4 h-4" /> Duyệt
                        </button>
                        <button onClick={() => handleMemberStatus(member.user_id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold flex items-center gap-1">
                          <XIcon className="w-4 h-4" /> Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-white font-bold mb-4">Học sinh trong lớp ({approvedMembers.length})</h3>
              {approvedMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {approvedMembers.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {member.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white/90">{member.profiles?.full_name || 'Học sinh'}</div>
                          <div className="text-xs text-white/40">{member.profiles?.email}</div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMember(member.user_id)} className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Xóa khỏi lớp">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/40">Chưa có học sinh nào.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <ClassroomExamManagement
            classroomId={id}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

        {activeTab === 'announcements' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Bell className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Bảng thông báo</h3>
            <p className="text-white/50 mb-6">Chức năng đăng thông báo cho lớp đang được phát triển.</p>
          </div>
        )}

      </div>
      {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
    </main>
  );
}
