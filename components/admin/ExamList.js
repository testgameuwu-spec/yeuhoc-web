'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Search, MoreVertical, Eye, EyeOff, Pencil, Trash2,
  FileText, Clock, Calendar, GraduationCap, Filter, GripVertical, Save, X
} from 'lucide-react';

const SUBJECT_COLORS = {
  'Toán': 'from-indigo-500/20 to-indigo-600/20 text-indigo-400 border-indigo-500/30',
  'Vật Lý': 'from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/30',
  'Hoá Học': 'from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30',
  'Tiếng Anh': 'from-amber-500/20 to-amber-600/20 text-amber-400 border-amber-500/30',
  'Tư duy định lượng': 'from-violet-500/20 to-violet-600/20 text-violet-400 border-violet-500/30',
  'Tư duy định tính': 'from-pink-500/20 to-pink-600/20 text-pink-400 border-pink-500/30',
};

export default function ExamList({ exams, onEdit, onDelete, onTogglePublish, onCreateNew, onUpdateOrder }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | published | draft
  const [openMenu, setOpenMenu] = useState(null);

  // Ordering states
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [localExams, setLocalExams] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (!isEditingOrder) {
      setLocalExams(exams);
    }
  }, [exams, isEditingOrder]);

  const filtered = localExams.filter(e => {
    if (isEditingOrder) return true; // Show all when editing order
    if (filterStatus === 'published' && !e.published) return false;
    if (filterStatus === 'draft' && e.published) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data to drag
    e.dataTransfer.setData('text/plain', index); 
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newExams = [...localExams];
    const dragged = newExams[draggedIndex];
    newExams.splice(draggedIndex, 1);
    newExams.splice(index, 0, dragged);
    setLocalExams(newExams);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveOrder = () => {
    if (onUpdateOrder) {
      onUpdateOrder(localExams);
    }
    setIsEditingOrder(false);
  };

  const cancelOrder = () => {
    setLocalExams(exams);
    setIsEditingOrder(false);
  };

  const publishedCount = exams.filter(e => e.published).length;
  const draftCount = exams.filter(e => !e.published).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Tổng đề thi', value: exams.length, color: 'from-indigo-500 to-purple-500', icon: FileText },
          { label: 'Đã publish', value: publishedCount, color: 'from-emerald-500 to-cyan-500', icon: Eye },
          { label: 'Bản nháp', value: draftCount, color: 'from-amber-500 to-orange-500', icon: EyeOff },
        ].map(stat => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
            <div className="relative flex items-center gap-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-white/40 font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto opacity-100 transition-opacity" style={{ opacity: isEditingOrder ? 0.5 : 1, pointerEvents: isEditingOrder ? 'none' : 'auto' }}>
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm đề thi..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          {/* Filter pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'published', label: 'Published' },
              { key: 'draft', label: 'Draft' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === f.key ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/60'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditingOrder ? (
            <>
              <button onClick={cancelOrder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all">
                <X className="w-4 h-4" /> Hủy
              </button>
              <button onClick={saveOrder}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10">
                <Save className="w-4 h-4" /> Lưu thứ tự
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditingOrder(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all border border-white/10">
                <GripVertical className="w-4 h-4" /> Sắp xếp
              </button>
              <button onClick={onCreateNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25">
                <Plus className="w-4 h-4" />
                Tạo đề mới
              </button>
            </>
          )}
        </div>
      </div>

      {/* Exam Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
        {/* Header */}
        <div className={`grid gap-4 px-6 py-3 border-b border-white/10 text-xs font-semibold text-white/30 uppercase tracking-wider ${isEditingOrder ? 'grid-cols-[40px_1fr_120px_100px_80px_100px]' : 'grid-cols-[1fr_120px_100px_80px_100px_56px]'}`}>
          {isEditingOrder && <span></span>}
          <span>Đề thi</span>
          <span>Môn / Kì thi</span>
          <span>Câu hỏi</span>
          <span>Năm</span>
          <span>Trạng thái</span>
          {!isEditingOrder && <span></span>}
        </div>

        {/* Rows */}
        {filtered.length > 0 ? filtered.map((exam, index) => {
          const sc = SUBJECT_COLORS[exam.subject] || 'from-gray-500/20 to-gray-600/20 text-gray-400 border-gray-500/30';
          const isDragged = draggedIndex === index;
          return (
            <div key={exam.id}
              draggable={isEditingOrder}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`grid gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors items-center group ${isEditingOrder ? 'grid-cols-[40px_1fr_120px_100px_80px_100px] cursor-grab active:cursor-grabbing' : 'grid-cols-[1fr_120px_100px_80px_100px_56px]'} ${isDragged ? 'opacity-50 bg-white/5' : ''}`}>
              
              {isEditingOrder && (
                <div className="text-white/20 group-hover:text-white/50 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>
              )}
              
              {/* Title */}
              <div>
                <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{exam.title}</p>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {exam.duration} phút
                  <span className="text-white/10">·</span>
                  <Calendar className="w-3 h-3" /> {exam.createdAt}
                </p>
              </div>
              {/* Subject */}
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r ${sc} border`}>
                  {exam.subject}
                </span>
                <span className="block text-[10px] text-white/30 mt-1">{exam.examType}</span>
              </div>
              {/* Questions */}
              <span className="text-sm text-white/60 font-medium">{exam.totalQ} câu</span>
              {/* Year */}
              <span className="text-sm text-white/60 font-medium">{exam.year}</span>
              {/* Status */}
              <div>
                <button onClick={() => !isEditingOrder && onTogglePublish(exam.id)}
                  disabled={isEditingOrder}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                    exam.published
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                  } ${isEditingOrder ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {exam.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {exam.published ? 'Published' : 'Draft'}
                </button>
              </div>
              {/* Actions */}
              {!isEditingOrder && (
              <div className="flex items-center gap-1 relative">
                <button onClick={() => window.open(`/yeuhoc/?preview_exam_id=${exam.id}`, '_blank')}
                  className="p-2 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors" title="Xem trước đề thi">
                  <Eye className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button onClick={() => setOpenMenu(openMenu === exam.id ? null : exam.id)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === exam.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-white/10 bg-[#14142a] shadow-2xl shadow-black/50 py-1 animate-scaleIn">
                        <button onClick={() => { onEdit(exam); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                        </button>
                        <button onClick={() => { onDelete(exam.id); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Xoá
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}
            </div>
          );
        }) : (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-white/40">Không tìm thấy đề thi nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
