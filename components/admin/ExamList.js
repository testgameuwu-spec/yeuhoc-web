'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Plus, Search, MoreVertical, Eye, EyeOff, Pencil, Trash2,
  FileText, Clock, Calendar, GripVertical, Save, X, Folder, ChevronDown, ChevronRight, Lock, Globe, EyeOff as PrivateEye, ArrowRightLeft, Shuffle, AlertTriangle
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { createMixedExamQuestions, MIX_QUESTION_TYPES } from '@/lib/questionMix';

const SUBJECT_COLORS = {
  'Toán': 'from-indigo-500/20 to-indigo-600/20 text-indigo-400 border-indigo-500/30',
  'Vật Lý': 'from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/30',
  'Hoá Học': 'from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30',
  'Tiếng Anh': 'from-amber-500/20 to-amber-600/20 text-amber-400 border-amber-500/30',
  'Tư duy định lượng': 'from-violet-500/20 to-violet-600/20 text-violet-400 border-violet-500/30',
  'Tư duy định tính': 'from-pink-500/20 to-pink-600/20 text-pink-400 border-pink-500/30',
};

const VISIBILITY_CONFIG = {
  public: { icon: Globe, label: 'Công khai', color: 'text-emerald-400' },
  private: { icon: PrivateEye, label: 'Riêng tư', color: 'text-amber-400' },
  locked: { icon: Lock, label: 'Khóa', color: 'text-rose-400' }
};

const SUBJECTS = ['Toán', 'Vật Lý', 'Hoá Học', 'Tiếng Anh', 'Tư duy định lượng', 'Tư duy định tính', 'Khác'];
const EXAM_TYPES = ['THPT', 'HSA', 'TSA', 'Other'];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
const MIX_EXAM_TYPES = ['HSA', 'TSA'];
const MIX_INITIAL_QUOTAS = Object.fromEntries(MIX_QUESTION_TYPES.map(type => [type, 0]));
const MIX_TYPE_LABELS = {
  MCQ: 'Trắc nghiệm',
  MA: 'Chọn nhiều',
  TF: 'Đúng/Sai',
  SA: 'Trả lời ngắn',
  DRAG: 'Kéo thả',
};

function countQuestionsByType(exams) {
  const counts = { ...MIX_INITIAL_QUOTAS };
  exams.forEach((exam) => {
    (exam.questions || []).forEach((question) => {
      if (MIX_QUESTION_TYPES.includes(question.type)) {
        counts[question.type] += 1;
      }
    });
  });
  return counts;
}

export default function ExamList({ 
  exams, folders = [], onEdit, onDelete, onTogglePublish, onCreateNew, onUpdateOrder,
  onCreateFolder, onUpdateFolder, onDeleteFolder, onUpdateFoldersOrder, onSaveExam, onCreateMixedExam
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [openFolderMenu, setOpenFolderMenu] = useState(null);

  // Expanded folders
  const [expandedFolders, setExpandedFolders] = useState({});

  // Modals
  const [folderModal, setFolderModal] = useState({ isOpen: false, data: null });
  const [moveModal, setMoveModal] = useState({ isOpen: false, exam: null });
  const [mixModalOpen, setMixModalOpen] = useState(false);
  const [mixExamType, setMixExamType] = useState('HSA');
  const [mixSearch, setMixSearch] = useState('');
  const [mixSelectedIds, setMixSelectedIds] = useState([]);
  const [mixQuotas, setMixQuotas] = useState({ ...MIX_INITIAL_QUOTAS });
  const [mixError, setMixError] = useState('');

  // Ordering states
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  
  // We maintain local copies of folders and exams for drag and drop
  const [localFolders, setLocalFolders] = useState([]);
  const [localExams, setLocalExams] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'folder'|'exam', id: string, folderId: string|null }

  useEffect(() => {
    if (!isEditingOrder) {
      const timer = setTimeout(() => {
        setLocalFolders(folders);
        setLocalExams(exams);
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [exams, folders, isEditingOrder]);

  // Pagination (only applies to filtered exams in a flat view, or we can disable pagination when using folders. Let's keep it simple: no pagination when folders are used, or we paginate the root list).
  // Actually, standard pagination with tree view is hard. Let's just do flat pagination for the exams list if needed, or no pagination.
  // For now, let's keep the existing logic for "filtered" exams if searching, otherwise tree view.
  const isSearching = search !== '' || filterStatus !== 'all' || filterSubject !== 'all' || filterType !== 'all';

  const filteredExams = localExams.filter(e => {
    if (filterStatus === 'published' && !e.published) return false;
    if (filterStatus === 'draft' && e.published) return false;
    if (filterSubject !== 'all' && e.subject !== filterSubject) return false;
    if (filterType !== 'all' && e.examType !== filterType) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mixableExamCount = localExams.filter(exam => MIX_EXAM_TYPES.includes(exam.examType)).length;
  const mixSourceExams = useMemo(() => {
    const query = mixSearch.trim().toLowerCase();
    return localExams.filter((exam) => {
      if (exam.examType !== mixExamType) return false;
      if (query && !exam.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [localExams, mixExamType, mixSearch]);
  const selectedMixExams = useMemo(() => {
    const selectedIdSet = new Set(mixSelectedIds.map(String));
    return localExams.filter(exam => selectedIdSet.has(String(exam.id)) && exam.examType === mixExamType);
  }, [localExams, mixExamType, mixSelectedIds]);
  const selectedMixCounts = useMemo(() => countQuestionsByType(selectedMixExams), [selectedMixExams]);
  const mixQuotaTotal = MIX_QUESTION_TYPES.reduce((total, type) => total + Number(mixQuotas[type] || 0), 0);

  const toggleFolder = (id) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));

  // --- Drag and Drop ---
  const handleDragStart = (e, type, item, parentFolderId = null) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setDraggedItem({ type, id: item.id, folderId: parentFolderId });
  };

  const handleDragOver = (e, type, targetItem, targetFolderId = null) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    if (draggedItem.type !== type) return; // Cannot mix folder and exam reordering

    if (type === 'folder') {
      const draggedIdx = localFolders.findIndex(f => f.id === draggedItem.id);
      const targetIdx = localFolders.findIndex(f => f.id === targetItem.id);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const newFolders = [...localFolders];
      const dragged = newFolders[draggedIdx];
      newFolders.splice(draggedIdx, 1);
      newFolders.splice(targetIdx, 0, dragged);
      setLocalFolders(newFolders);
    } else if (type === 'exam') {
      // Reordering exams within the SAME folder or root
      if (draggedItem.folderId !== targetFolderId) return; // For simplicity, only allow reordering within same level
      
      const draggedIdx = localExams.findIndex(ex => ex.id === draggedItem.id);
      const targetIdx = localExams.findIndex(ex => ex.id === targetItem.id);
      if (draggedIdx === -1 || targetIdx === -1) return;
      
      const newExams = [...localExams];
      const dragged = newExams[draggedIdx];
      newExams.splice(draggedIdx, 1);
      newExams.splice(targetIdx, 0, dragged);
      setLocalExams(newExams);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDropOnFolder = async (e, targetFolder) => {
    e.preventDefault();
    if (draggedItem?.type === 'exam' && draggedItem.folderId !== targetFolder.id) {
      if (onSaveExam) {
        await onSaveExam({ ...draggedItem, folderId: targetFolder.id });
      }
    }
    setDraggedItem(null);
  };

  const saveOrder = async () => {
    setIsSavingOrder(true);
    if (onUpdateFoldersOrder && localFolders.length > 0) {
      await onUpdateFoldersOrder(localFolders);
    }
    if (onUpdateOrder && localExams.length > 0) {
      await onUpdateOrder(localExams);
    }
    setIsSavingOrder(false);
    setIsEditingOrder(false);
  };

  const cancelOrder = () => {
    setLocalFolders(folders);
    setLocalExams(exams);
    setIsEditingOrder(false);
  };

  const submitFolder = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      subject: formData.get('subject') || null,
      examType: formData.get('examType') || null,
      year: formData.get('year') || null,
      visibility: formData.get('visibility'),
    };
    if (folderModal.data) {
      await onUpdateFolder(folderModal.data.id, data);
    } else {
      await onCreateFolder(data);
    }
    setFolderModal({ isOpen: false, data: null });
  };

  const handleMoveExam = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newFolderId = formData.get('folderId') === 'root' ? null : formData.get('folderId');
    if (moveModal.exam && onSaveExam) {
      await onSaveExam({ ...moveModal.exam, folderId: newFolderId });
    }
    setMoveModal({ isOpen: false, exam: null });
  };

  const openMixModal = () => {
    const defaultType = localExams.some(exam => exam.examType === 'HSA') ? 'HSA' : 'TSA';
    setMixExamType(defaultType);
    setMixSearch('');
    setMixSelectedIds([]);
    setMixQuotas({ ...MIX_INITIAL_QUOTAS });
    setMixError('');
    setMixModalOpen(true);
  };

  const handleMixExamTypeChange = (type) => {
    setMixExamType(type);
    setMixSearch('');
    setMixSelectedIds([]);
    setMixError('');
  };

  const handleMixQuotaChange = (type, value) => {
    const nextValue = value === '' ? 0 : Number(value);
    setMixQuotas(prev => ({ ...prev, [type]: nextValue }));
    setMixError('');
  };

  const handleToggleMixSource = (examId) => {
    setMixSelectedIds(prev => (
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    ));
    setMixError('');
  };

  const handleSubmitMix = () => {
    const result = createMixedExamQuestions({
      exams: localExams,
      examType: mixExamType,
      sourceExamIds: mixSelectedIds,
      quotas: mixQuotas,
    });

    if (result.error) {
      setMixError(result.error);
      return;
    }

    onCreateMixedExam?.({
      examType: mixExamType,
      sourceExams: selectedMixExams,
      questions: result.questions,
    });
    setMixModalOpen(false);
  };

  // Render a single Exam row
  const renderExam = (exam, index, parentFolderId) => {
    const sc = SUBJECT_COLORS[exam.subject] || 'from-gray-500/20 to-gray-600/20 text-gray-400 border-gray-500/30';
    const isDragged = draggedItem?.id === exam.id;
    
    return (
      <div key={exam.id}
        draggable={isEditingOrder}
        onDragStart={(e) => handleDragStart(e, 'exam', exam, parentFolderId)}
        onDragOver={(e) => handleDragOver(e, 'exam', exam, parentFolderId)}
        onDragEnd={handleDragEnd}
        className={`
          md:grid gap-3 md:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors items-center group
          flex flex-col md:flex-row bg-white/[0.01]
          ${isEditingOrder ? 'md:grid-cols-[40px_1fr_120px_100px_80px_100px] cursor-grab active:cursor-grabbing' : 'md:grid-cols-[1fr_120px_100px_80px_100px_56px]'}
          ${isDragged ? 'opacity-50 bg-white/5' : ''}
          ${parentFolderId ? 'pl-8 sm:pl-12' : ''}
        `}>
        
        {isEditingOrder && (
          <div className="text-white/20 group-hover:text-white/50 transition-colors">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        
        {/* Title */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{exam.title}</p>
          <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {exam.duration} phút
            <span className="text-white/10">·</span>
            <Calendar className="w-3 h-3" /> {exam.createdAt ? exam.createdAt.split('T')[0] : ''}
          </p>
        </div>
        
        {/* Mobile meta row */}
        <div className="flex items-center gap-3 flex-wrap md:hidden w-full mt-2">
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r ${sc} border`}>
            {exam.subject}
          </span>
          <span className="text-xs text-white/40">{exam.totalQ} câu · {exam.year}</span>
          <button onClick={() => !isEditingOrder && onTogglePublish(exam.id)}
            disabled={isEditingOrder}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              exam.published
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
            {exam.published ? 'Published' : 'Draft'}
          </button>
          {!isEditingOrder && (
            <div className="ml-auto flex items-center gap-1 relative">
               <button onClick={() => setOpenMenu(openMenu === exam.id ? null : exam.id)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenu === exam.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-white/10 bg-[#14142a] shadow-2xl shadow-black/50 py-1 animate-scaleIn">
                      <button onClick={() => { onEdit(exam); setOpenMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <Pencil className="w-4 h-4" /> Chỉnh sửa
                      </button>
                      <button onClick={() => { setMoveModal({ isOpen: true, exam }); setOpenMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <ArrowRightLeft className="w-4 h-4" /> Chuyển thư mục
                      </button>
                      <button onClick={() => { onDelete(exam.id); setOpenMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" /> Xoá
                      </button>
                    </div>
                  </>
                )}
            </div>
          )}
        </div>

        {/* Desktop-only columns */}
        <div className="hidden md:block">
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r ${sc} border`}>
            {exam.subject}
          </span>
          <span className="block text-[10px] text-white/30 mt-1">{exam.examType}</span>
        </div>
        <span className="hidden md:block text-sm text-white/60 font-medium">{exam.totalQ} câu</span>
        <span className="hidden md:block text-sm text-white/60 font-medium">{exam.year}</span>
        <div className="hidden md:block">
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
        
        {/* Actions - desktop */}
        {!isEditingOrder && (
        <div className="hidden md:flex items-center gap-1 relative">
          <button onClick={() => window.open(`/de-thi/${exam.id}`, '_blank')}
            className="p-2 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors" title="Xem trước">
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
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-white/10 bg-[#14142a] shadow-2xl shadow-black/50 py-1 animate-scaleIn">
                  <button onClick={() => { onEdit(exam); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <Pencil className="w-4 h-4" /> Chỉnh sửa
                  </button>
                  <button onClick={() => { setMoveModal({ isOpen: true, exam }); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <ArrowRightLeft className="w-4 h-4" /> Chuyển thư mục
                  </button>
                  <button onClick={() => { onDelete(exam.id); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" /> Xoá
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    );
  };

  const renderFolder = (folder) => {
    const isExpanded = expandedFolders[folder.id];
    const isDragged = draggedItem?.id === folder.id;
    const folderExams = filteredExams.filter(e => e.folderId === folder.id);
    const VisIcon = VISIBILITY_CONFIG[folder.visibility || 'public'].icon;
    const visColor = VISIBILITY_CONFIG[folder.visibility || 'public'].color;

    return (
      <div key={folder.id} className="border-b border-white/10">
        <div 
          draggable={isEditingOrder}
          onDragStart={(e) => handleDragStart(e, 'folder', folder)}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedItem?.type === 'exam') {
              // Allow dropping exam onto folder
            } else {
              handleDragOver(e, 'folder', folder);
            }
          }}
          onDrop={(e) => handleDropOnFolder(e, folder)}
          onDragEnd={handleDragEnd}
          className={`flex items-center justify-between px-4 sm:px-6 py-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors ${isDragged ? 'opacity-50' : ''} ${draggedItem?.type === 'exam' ? 'border-2 border-transparent hover:border-indigo-500/50 hover:bg-indigo-500/10' : ''}`}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
            {isEditingOrder && <GripVertical className="w-5 h-5 text-white/30 cursor-grab" />}
            <button className="p-1 rounded-md hover:bg-white/10 text-white/60">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <Folder className="w-5 h-5 text-indigo-400" fill="currentColor" fillOpacity={0.2} />
            <span className="min-w-0 truncate font-bold text-white text-sm sm:text-base">{folder.name}</span>
            {folder.subject && <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{folder.subject}</span>}
            {folder.examType && <span className="text-xs text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">{folder.examType}</span>}
            {folder.year && <span className="text-xs text-white/50">{folder.year}</span>}
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{folderExams.length} đề</span>
            <VisIcon className={`w-3.5 h-3.5 ml-2 ${visColor}`} title={VISIBILITY_CONFIG[folder.visibility || 'public'].label} />
          </div>
          
          {!isEditingOrder && (
            <div className="flex items-center relative">
              <button onClick={() => setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
              {openFolderMenu === folder.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFolderMenu(null)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-white/10 bg-[#14142a] shadow-2xl shadow-black/50 py-1 animate-scaleIn">
                    <button onClick={() => { setFolderModal({ isOpen: true, data: folder }); setOpenFolderMenu(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button onClick={() => { onDeleteFolder(folder.id); setOpenFolderMenu(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Xoá
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="bg-black/20">
            {folderExams.length > 0 ? (
              folderExams.map((exam, idx) => renderExam(exam, idx, folder.id))
            ) : (
              <div className="py-4 px-12 text-xs text-white/30 italic">Thư mục trống</div>
            )}
          </div>
        )}
      </div>
    );
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
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 w-full xl:w-auto opacity-100 transition-opacity" style={{ opacity: isEditingOrder ? 0.5 : 1, pointerEvents: isEditingOrder ? 'none' : 'auto' }}>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm đề thi..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isEditingOrder ? (
            <>
              <button onClick={cancelOrder}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs sm:text-sm font-semibold transition-all">
                <X className="w-4 h-4" /> Hủy
              </button>
              <button onClick={saveOrder} disabled={isSavingOrder}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-lg ${
                  isSavingOrder 
                    ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10'
                }`}>
                {isSavingOrder ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingOrder ? 'Đang lưu...' : 'Lưu thứ tự'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setFolderModal({ isOpen: true, data: null })}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs sm:text-sm font-semibold transition-all border border-white/10">
                <Folder className="w-4 h-4" /> <span className="hidden sm:inline">Tạo thư mục</span>
              </button>
              <button onClick={() => setIsEditingOrder(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs sm:text-sm font-semibold transition-all border border-white/10">
                <GripVertical className="w-4 h-4" /> <span className="hidden sm:inline">Sắp xếp</span>
              </button>
              <button onClick={openMixModal} disabled={mixableExamCount === 0}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                  mixableExamCount === 0
                    ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 hover:text-cyan-200 border-cyan-500/20'
                }`}>
                <Shuffle className="w-4 h-4" /> <span className="hidden sm:inline">Tạo đề xáo</span>
              </button>
              <button onClick={onCreateNew}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25">
                <Plus className="w-4 h-4" />
                Tạo đề mới
              </button>
            </>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Header - hidden on mobile */}
        <div className={`hidden md:grid gap-4 px-6 py-3 border-b border-white/10 text-xs font-semibold text-white/30 uppercase tracking-wider ${isEditingOrder ? 'grid-cols-[40px_1fr_120px_100px_80px_100px]' : 'grid-cols-[1fr_120px_100px_80px_100px_56px]'}`}>
          {isEditingOrder && <span></span>}
          <span>Đề thi & Thư mục</span>
          <span>Môn / Kì thi</span>
          <span>Câu hỏi</span>
          <span>Năm</span>
          <span>Trạng thái</span>
          {!isEditingOrder && <span></span>}
        </div>

        {/* Content */}
        <div className="flex flex-col">
          {isSearching ? (
            // Flat list when searching
            filteredExams.length > 0 ? (
              filteredExams.map((exam, index) => renderExam(exam, index, null))
            ) : (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm text-white/40">Không tìm thấy kết quả nào</p>
              </div>
            )
          ) : (
            // Tree view when not searching
            <>
              {localFolders.map(folder => renderFolder(folder))}
              {localExams.filter(e => !e.folderId).map((exam, index) => renderExam(exam, index, null))}
              
              {localFolders.length === 0 && localExams.length === 0 && (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-white/40">Chưa có đề thi hay thư mục nào</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mixed Exam Modal */}
      {mixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-cyan-300" /> Tạo đề xáo
                </h3>
                <p className="mt-1 text-xs text-white/35">Chọn nhiều đề nguồn cùng loại và nhập số lượng câu cần lấy.</p>
              </div>
              <button onClick={() => setMixModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0">
              <div className="p-5 border-b lg:border-b-0 lg:border-r border-white/10 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Loại đề mới</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MIX_EXAM_TYPES.map(type => (
                      <button key={type} type="button" onClick={() => handleMixExamTypeChange(type)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          mixExamType === type
                            ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40'
                            : 'bg-white/5 text-white/45 border-white/10 hover:text-white/70'
                        }`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Quota câu hỏi</label>
                    <span className={`text-xs font-bold ${mixExamType === 'TSA' && mixQuotaTotal !== 100 ? 'text-amber-300' : 'text-cyan-300'}`}>
                      Tổng {mixQuotaTotal}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {MIX_QUESTION_TYPES.map(type => (
                      <div key={type} className="grid grid-cols-[1fr_92px] gap-2 items-center">
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-sm font-semibold text-white/75">{type}</p>
                          <p className="text-[11px] text-white/30">{MIX_TYPE_LABELS[type]}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={mixQuotas[type]}
                          onChange={e => handleMixQuotaChange(type, e.target.value)}
                          className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-right focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    ))}
                  </div>
                  {mixExamType === 'TSA' && mixQuotaTotal !== 100 && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>TSA cần tổng đúng 100 câu để giữ cấu trúc 40/20/40.</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Nguồn đã chọn</span>
                    <span className="text-xs font-bold text-white/70">{selectedMixExams.length} đề</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MIX_QUESTION_TYPES.map(type => (
                      <span key={type} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/55">
                        {type}: {selectedMixCounts[type]}
                      </span>
                    ))}
                  </div>
                </div>

                {mixError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 whitespace-pre-wrap">
                    {mixError}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Đề nguồn {mixExamType}</p>
                    <p className="text-xs text-white/35">{mixSourceExams.length} đề phù hợp bộ lọc</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={mixSearch}
                      onChange={e => setMixSearch(e.target.value)}
                      placeholder="Tìm đề nguồn..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/10">
                  {mixSourceExams.length > 0 ? (
                    mixSourceExams.map((exam) => {
                      const checked = mixSelectedIds.includes(exam.id);
                      return (
                        <label key={exam.id}
                          className={`flex items-start gap-3 border-b border-white/5 px-4 py-3 cursor-pointer transition-colors ${
                            checked ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'
                          }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleMixSource(exam.id)}
                            className="mt-1 h-4 w-4 accent-cyan-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white/85 truncate">{exam.title}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/35">
                              <span>{exam.subject || 'Không rõ môn'}</span>
                              <span>·</span>
                              <span>{exam.totalQ || 0} câu</span>
                              <span>·</span>
                              <span>{exam.year || 'Không rõ năm'}</span>
                              {exam.published ? (
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Published</span>
                              ) : (
                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-300">Draft</span>
                              )}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="py-14 text-center text-sm text-white/35">
                      Không có đề {mixExamType} phù hợp.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                  <button type="button" onClick={() => setMixModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
                    Hủy
                  </button>
                  <button type="button" onClick={handleSubmitMix}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/20 font-semibold">
                    <Shuffle className="w-4 h-4" /> Tạo bản nháp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder Modal */}
      {folderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white">{folderModal.data ? 'Chỉnh sửa thư mục' : 'Tạo thư mục mới'}</h3>
              <button onClick={() => setFolderModal({ isOpen: false, data: null })} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Tên thư mục</label>
                <input required type="text" name="name" defaultValue={folderModal.data?.name || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                  placeholder="Ví dụ: Đề thi THPT Quốc gia..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Môn học</label>
                  <select name="subject" defaultValue={folderModal.data?.subject || ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#14142a] border border-white/10 text-white focus:border-indigo-500 outline-none">
                    <option value="">Không chọn</option>
                    {SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Kì thi</label>
                  <select name="examType" defaultValue={folderModal.data?.examType || ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#14142a] border border-white/10 text-white focus:border-indigo-500 outline-none">
                    <option value="">Không chọn</option>
                    {EXAM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Năm</label>
                  <select name="year" defaultValue={folderModal.data?.year || ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#14142a] border border-white/10 text-white focus:border-indigo-500 outline-none">
                    <option value="">Không chọn</option>
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Quyền truy cập</label>
                <select name="visibility" defaultValue={folderModal.data?.visibility || 'public'}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#14142a] border border-white/10 text-white focus:border-indigo-500 outline-none">
                  <option value="public">Công khai (Hiển thị bình thường)</option>
                  <option value="private">Riêng tư (Chỉ Admin thấy)</option>
                  <option value="locked">Khóa (Yêu cầu mở khóa)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setFolderModal({ isOpen: false, data: null })}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
                  Hủy
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25 font-semibold">
                  {folderModal.data ? 'Lưu thay đổi' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Exam Modal */}
      {moveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white">Chuyển thư mục</h3>
              <button onClick={() => setMoveModal({ isOpen: false, exam: null })} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMoveExam} className="p-5 space-y-4">
              <p className="text-sm text-white/60 mb-4">Chọn thư mục đích cho đề thi: <strong className="text-white">{moveModal.exam?.title}</strong></p>
              <div>
                <select name="folderId" defaultValue={moveModal.exam?.folderId || 'root'}
                  className="w-full px-4 py-3 rounded-xl bg-[#14142a] border border-white/10 text-white focus:border-indigo-500 outline-none">
                  <option value="root">-- Không thuộc thư mục nào --</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-white/10">
                <button type="button" onClick={() => setMoveModal({ isOpen: false, exam: null })}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
                  Hủy
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25 font-semibold">
                  Di chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
