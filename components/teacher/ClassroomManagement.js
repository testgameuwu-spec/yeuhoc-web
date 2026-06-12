'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Users, Search, MoreVertical, Trash2, Edit, Copy, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ClassroomManagement({ showAlert, showConfirm }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          *,
          classroom_members(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClassrooms(data || []);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      showAlert('Lỗi', 'Không thể tải danh sách lớp học.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên lớp học.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingClass) {
        // Update
        const { error } = await supabase
          .from('classrooms')
          .update({ name: formData.name, description: formData.description })
          .eq('id', editingClass.id);
        if (error) throw error;
        showAlert('Thành công', 'Đã cập nhật lớp học.');
      } else {
        // Create
        const joinCode = generateJoinCode();
        const { error } = await supabase
          .from('classrooms')
          .insert({
            teacher_id: user.id,
            name: formData.name,
            description: formData.description,
            join_code: joinCode
          });
        if (error) throw error;
        showAlert('Thành công', 'Đã tạo lớp học mới.');
      }
      setIsModalOpen(false);
      fetchClassrooms();
    } catch (error) {
      console.error('Save classroom error:', error);
      showAlert('Lỗi', 'Không thể lưu lớp học: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa lớp học này? Toàn bộ học sinh và đề thi của lớp sẽ bị xóa!', async () => {
      try {
        const { error } = await supabase.from('classrooms').delete().eq('id', id);
        if (error) throw error;
        setClassrooms(prev => prev.filter(c => c.id !== id));
        showAlert('Thành công', 'Đã xóa lớp học.');
      } catch (err) {
        console.error('Delete error:', err);
        showAlert('Lỗi', 'Không thể xóa lớp học: ' + err.message);
      }
    });
  };

  const openCreateModal = () => {
    setEditingClass(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (cls) => {
    setEditingClass(cls);
    setFormData({ name: cls.name, description: cls.description || '' });
    setIsModalOpen(true);
  };

  const filteredClassrooms = classrooms.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.join_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp hoặc mã..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto justify-center shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> Tạo lớp học mới
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-white/40">Đang tải danh sách lớp học...</p>
        </div>
      ) : filteredClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map(cls => (
            <div key={cls.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-white text-lg line-clamp-1" title={cls.name}>{cls.name}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(cls)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="Chỉnh sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cls.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {cls.description && (
                  <p className="text-sm text-white/50 line-clamp-2 mb-4">{cls.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm mt-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{cls.classroom_members?.[0]?.count || 0}</span> thành viên
                  </div>
                  <button 
                    onClick={() => handleCopyCode(cls.join_code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                    title="Copy mã tham gia"
                  >
                    {copiedCode === cls.join_code ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span className="font-mono">{cls.join_code}</span>
                  </button>
                </div>
              </div>
              <div className="border-t border-white/5 p-3 bg-white/[0.02]">
                <Link href={`/teacher/classrooms/${cls.id}`} className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors">
                  Quản lý chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/60 font-medium mb-2">Chưa có lớp học nào</p>
          <p className="text-sm text-white/40 max-w-sm mx-auto mb-6">Bạn chưa tạo lớp học nào, hoặc không có kết quả phù hợp với tìm kiếm.</p>
          <button onClick={openCreateModal} className="px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl text-sm font-semibold transition-colors">
            Tạo lớp học đầu tiên
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#14142a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">{editingClass ? 'Cập nhật Lớp học' : 'Tạo Lớp học mới'}</h3>
            </div>
            <form onSubmit={handleSaveClassroom} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Tên lớp học <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Lớp Toán 12A1..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Mô tả (Tùy chọn)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn gọn về lớp học..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                />
              </div>
              {!editingClass && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 flex items-start gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Mã tham gia lớp sẽ được tạo tự động. Bạn có thể chia sẻ mã này cho học sinh để họ xin vào lớp.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {editingClass ? 'Cập nhật' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
