'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { parseQuizText } from '@/lib/parser';
import { getAllExams, saveExam, deleteExam, togglePublish, seedIfEmpty, updateExamsOrder, getAllFolders, createFolder, updateFolder, deleteFolder, updateFoldersOrder } from '@/lib/examStore';
import FileUpload from '@/components/FileUpload';
import AdminSidebar from '@/components/admin/AdminSidebar';
import ExamList from '@/components/admin/ExamList';
import ExamEditor from '@/components/admin/ExamEditor';
import ScoringConfig from '@/components/admin/ScoringConfig';
import UserManagement from '@/components/admin/UserManagement';
import ReportManagement from '@/components/admin/ReportManagement';
import OcrLogManagement from '@/components/admin/OcrLogManagement';
import TransactionManagement from '@/components/admin/TransactionManagement';
import PracticeProgressManagement from '@/components/admin/PracticeProgressManagement';
import AdminOverview from '@/components/admin/AdminOverview';
import TargetExamManagement from '@/components/admin/TargetExamManagement';
import { parseImageMap } from '@/components/ContentWithInlineImage';
import { TSA_TOTAL_DURATION_MINUTES } from '@/lib/examScoring';
import {
  BookOpen, Plus, ArrowLeft, Menu,
} from 'lucide-react';
import UserProfile from '@/components/UserProfile';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';

// ── Custom UI Modal cho Admin ──
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
          <button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md">
            {type === 'confirm' ? 'Xác nhận' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Seed data (only used if store is empty)
const SEED_EXAMS = [
  { id: 1, title: 'Đề thi THPT QG 2024 — Toán', subject: 'Toán', examType: 'THPT', year: 2024, duration: 90, published: true, totalQ: 22, createdAt: '2024-06-15', questions: [] },
  { id: 2, title: 'Đề thi THPT QG 2024 — Vật Lý', subject: 'Vật Lý', examType: 'THPT', year: 2024, duration: 50, published: true, totalQ: 28, createdAt: '2024-06-15', questions: [] },
  { id: 3, title: 'Đề thi HSA 2024 — Tư duy định lượng', subject: 'Tư duy định lượng', examType: 'HSA', year: 2024, duration: 60, published: false, totalQ: 35, createdAt: '2024-05-20', questions: [] },
  { id: 4, title: 'Đề thi THPT QG 2023 — Hoá Học', subject: 'Hoá Học', examType: 'THPT', year: 2023, duration: 50, published: true, totalQ: 28, createdAt: '2023-06-10', questions: [] },
];

const MOCK_USERS = [
  { id: 1, name: 'Nguyễn Văn An', email: 'an@gmail.com', createdAt: '2024-01-15', attempts: 12, avatar: null },
  { id: 2, name: 'Trần Thị Bình', email: 'binh@gmail.com', createdAt: '2024-02-20', attempts: 8, avatar: null },
  { id: 3, name: 'Lê Minh Châu', email: 'chau@gmail.com', createdAt: '2024-03-10', attempts: 25, avatar: null },
  { id: 4, name: 'Phạm Đức Duy', email: 'duy@gmail.com', createdAt: '2024-04-05', attempts: 3, avatar: null },
  { id: 5, name: 'Hoàng Thu Hà', email: 'ha@gmail.com', createdAt: '2024-04-18', attempts: 15, avatar: null },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [examEditorTab, setExamEditorTab] = useState('settings');
  const [exams, setExams] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackedOcrRequestId, setTrackedOcrRequestId] = useState('');
  const [mixedDrafts, setMixedDrafts] = useState([]);
  const [activeMixedDraftId, setActiveMixedDraftId] = useState(null);

  // Upload & parse flow
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseError, setParseError] = useState('');

  // Modal state
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Load exams from store when tab becomes active
  useEffect(() => {
    if (activeTab === 'exams') {
      async function init() {
        const allExams = await getAllExams();
        const allFolders = await getAllFolders();
        setExams(allExams);
        setFolders(allFolders);
      }
      init();
    }
  }, [activeTab]);

  // Refresh exams list from store
  const refreshExams = async () => setExams(await getAllExams());
  const refreshFolders = async () => setFolders(await getAllFolders());

  const clearMixedDrafts = useCallback(() => {
    setMixedDrafts([]);
    setActiveMixedDraftId(null);
  }, []);

  const handleFileLoaded = useCallback((text, name) => {
    setParseError('');
    try {
      const parsed = parseQuizText(text);
      if (parsed.length === 0) {
        setParseError('Không tìm thấy câu hỏi nào. Kiểm tra định dạng file.');
        return;
      }
      clearMixedDrafts();
      setParsedQuestions(parsed);
      setIsCreating(true);
      setEditingExam({
        id: null,
        title: name.replace('.txt', ''),
        subject: 'Toán',
        examType: 'THPT',
        year: 2024,
        duration: 90,
        published: false,
        questions: parsed,
        scoringConfig: null,
      });
    } catch (err) {
      setParseError('Lỗi khi đọc file: ' + err.message);
    }
  }, [clearMixedDrafts]);

  const handleCreateNew = () => {
    clearMixedDrafts();
    setIsCreating(true);
    setEditingExam(null);
    setParsedQuestions([]);
    setParseError('');
  };

  const handleCreateMixedExam = ({ examType, sourceExams, drafts }) => {
    const firstSource = sourceExams?.[0] || {};
    const timestamp = new Date().toLocaleString('vi-VN', { hour12: false });
    const nextDrafts = (drafts || []).map((draft, index) => ({
      id: null,
      clientId: draft.clientId,
      label: draft.label || `Đề xáo ${index + 1}`,
      title: `Đề xáo ${examType} ${index + 1} - ${timestamp}`,
      subject: firstSource.subject || (examType === 'HSA' ? 'Tư duy định lượng' : 'Khác'),
      examType,
      year: firstSource.year || new Date().getFullYear(),
      duration: examType === 'TSA' ? TSA_TOTAL_DURATION_MINUTES : (firstSource.duration || 60),
      published: false,
      note: '',
      folderId: null,
      questions: draft.questions || [],
      scoringConfig: null,
      antiCheatEnabled: firstSource.antiCheatEnabled !== false,
    }));

    setParsedQuestions([]);
    setParseError('');
    setTrackedOcrRequestId('');
    setExamEditorTab('questions');
    setEditingExam(null);
    setMixedDrafts(nextDrafts);
    setActiveMixedDraftId(nextDrafts[0]?.clientId || null);
    setIsCreating(true);
  };

  const openExamTabForOcrRequest = (requestId) => {
    if (!requestId) return;
    if (!isCreating) {
      clearMixedDrafts();
      setIsCreating(true);
      setEditingExam({
        id: null,
        title: '',
        subject: 'Toán',
        examType: 'THPT',
        year: 2024,
        duration: 90,
        published: false,
        questions: [],
        scoringConfig: null,
      });
    }
    setExamEditorTab('upload');
    setTrackedOcrRequestId(requestId);
    setActiveTab('exams');
  };

  const handleEditExam = (exam) => {
    clearMixedDrafts();
    setEditingExam({ ...exam, questions: exam.questions || [] });
    setIsCreating(true);
  };

  const handleEditExamById = async (examId, questionIdToScroll) => {
    let exam = exams.find(e => e.id === examId);
    if (!exam) {
      try {
        const { data } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (data) exam = data;
      } catch (err) {
        console.error("Error fetching exam:", err);
      }
    }
    
    if (exam) {
      handleEditExam(exam);
      setActiveTab('exams');
      
      if (questionIdToScroll) {
        setExamEditorTab('questions');
        setTimeout(() => {
          const el = document.getElementById(`editor-question-${questionIdToScroll}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-[#0b0b19]', 'transition-all');
            setTimeout(() => el.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-[#0b0b19]'), 3000);
          }
        }, 500);
      } else {
        setExamEditorTab('settings');
      }
    } else {
      showAlert('Lỗi', "Không tìm thấy đề thi này (có thể đã bị xóa)!");
    }
  };

  const handleBackToList = () => {
    setIsCreating(false);
    setEditingExam(null);
    clearMixedDrafts();
    setParsedQuestions([]);
    setParseError('');
  };

  const handleSaveExam = async (examData, { stayInEditor = false, suppressSuccess = false } = {}) => {
    try {
      // 1. Pre-process and upload images to Supabase Storage
      const updatedQuestions = [...examData.questions];
      for (let i = 0; i < updatedQuestions.length; i++) {
        const q = updatedQuestions[i];
        const uploadImageFile = async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `images/${fileName}`; // Lưu vào folder images/ trong bucket
          
          const { error: uploadError } = await supabase.storage
            .from('exam-images') // Bucket name
            .upload(filePath, file);
            
          if (uploadError) {
             throw new Error(`Lỗi tải ảnh (Câu ${i+1}): ` + uploadError.message + '\n\n💡 Vui lòng đảm bảo bạn đã tạo Bucket tên "exam-images" và public trên Supabase.');
          }
          
          const { data } = supabase.storage.from('exam-images').getPublicUrl(filePath);
          return data.publicUrl;
        };

        if (q.imageFiles && typeof q.imageFiles === 'object') {
          const nextImageMap = { ...parseImageMap(q.image) };

          for (const [markerId, file] of Object.entries(q.imageFiles)) {
            if (!file || typeof file.name !== 'string') continue;
            nextImageMap[markerId] = await uploadImageFile(file);
          }

          const persistedImageMap = Object.fromEntries(
            Object.entries(nextImageMap).filter(([, value]) => (
              typeof value === 'string'
              && (value.startsWith('/') || value.startsWith('http'))
            ))
          );

          q.image = Object.keys(persistedImageMap).length > 0 ? JSON.stringify(persistedImageMap) : null;
          delete q.imageFiles;
          delete q.imageFile;
        } else if (q.imageFile) {
          q.image = await uploadImageFile(q.imageFile);
          delete q.imageFile;
        } else if (q.image && typeof q.image === 'object') {
          const persistedImageMap = Object.fromEntries(
            Object.entries(parseImageMap(q.image)).filter(([, value]) => (
              typeof value === 'string'
              && (value.startsWith('/') || value.startsWith('http'))
            ))
          );
          q.image = Object.keys(persistedImageMap).length > 0 ? JSON.stringify(persistedImageMap) : null;
        }
      }
      examData.questions = updatedQuestions;

      // 2. Save Exam
      await saveExam(examData);
      await refreshExams();
      if (!stayInEditor) {
        handleBackToList();
      }
      if (!suppressSuccess) {
        showAlert('Thành công', 'Lưu đề thi thành công!');
      }
      return true;
    } catch (error) {
      console.error("Save exam error:", error);
      showAlert('Lỗi', 'Lỗi khi lưu đề thi: ' + (error.message || JSON.stringify(error)));
      return false;
    }
  };

  const handleMixedDraftChange = useCallback((draftData) => {
    if (!activeMixedDraftId) return;
    setMixedDrafts(prev => prev.map((draft) => (
      draft.clientId === activeMixedDraftId
        ? { ...draft, ...draftData, clientId: draft.clientId, label: draft.label }
        : draft
    )));
  }, [activeMixedDraftId]);

  const handleSaveMixedDraft = async (examData) => {
    const saved = await handleSaveExam(examData, { stayInEditor: true, suppressSuccess: true });
    if (!saved) return;

    const currentIndex = mixedDrafts.findIndex(draft => draft.clientId === activeMixedDraftId);
    const nextDrafts = mixedDrafts.filter(draft => draft.clientId !== activeMixedDraftId);

    if (nextDrafts.length === 0) {
      setMixedDrafts([]);
      setActiveMixedDraftId(null);
      handleBackToList();
      showAlert('Thành công', 'Đã lưu tất cả đề xáo!');
      return;
    }

    const nextActiveDraft = nextDrafts[Math.min(Math.max(currentIndex, 0), nextDrafts.length - 1)];
    setMixedDrafts(nextDrafts);
    setActiveMixedDraftId(nextActiveDraft.clientId);
  };

  const handleDeleteExam = async (examId) => {
    await deleteExam(examId);
    await refreshExams();
  };

  const handleTogglePublish = async (examId) => {
    await togglePublish(examId);
    await refreshExams();
  };

  const handleUpdateOrder = async (orderedExams) => {
    try {
      // Create updates payload: [{id, order_index}]
      const updates = orderedExams.map((exam, idx) => ({ id: exam.id, order_index: idx }));
      await updateExamsOrder(updates);
      await refreshExams();
      showAlert('Thành công', 'Lưu thứ tự đề thi thành công!');
    } catch (error) {
      console.error('Update order error:', error);
      showAlert('Lỗi', 'Không thể lưu thứ tự: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleCreateFolder = async (folderData) => {
    try {
      await createFolder(folderData);
      await refreshFolders();
      showAlert('Thành công', 'Tạo thư mục thành công!');
    } catch (error) {
      console.error('Create folder error:', error);
      showAlert('Lỗi', 'Lỗi khi tạo thư mục: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateFolder = async (id, folderData) => {
    try {
      await updateFolder(id, folderData);
      await refreshFolders();
      showAlert('Thành công', 'Cập nhật thư mục thành công!');
    } catch (error) {
      console.error('Update folder error:', error);
      showAlert('Lỗi', 'Lỗi khi cập nhật thư mục: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDeleteFolder = async (id) => {
    try {
      await deleteFolder(id);
      await refreshFolders();
      await refreshExams(); // Also refresh exams in case their folder_id was nullified
      showAlert('Thành công', 'Đã xóa thư mục!');
    } catch (error) {
      console.error('Delete folder error:', error);
      showAlert('Lỗi', 'Lỗi khi xóa thư mục: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleUpdateFoldersOrder = async (orderedFolders) => {
    try {
      const updates = orderedFolders.map((folder, idx) => ({ id: folder.id, order_index: idx }));
      await updateFoldersOrder(updates);
      await refreshFolders();
    } catch (error) {
      console.error('Update folder order error:', error);
      showAlert('Lỗi', 'Lỗi khi lưu thứ tự thư mục: ' + (error.message || JSON.stringify(error)));
    }
  };

  const activeMixedDraft = useMemo(() => (
    mixedDrafts.find(draft => draft.clientId === activeMixedDraftId) || mixedDrafts[0] || null
  ), [activeMixedDraftId, mixedDrafts]);

  // Determine what to render in main content
  const renderContent = () => {
    if (activeTab === 'overview') {
      return <AdminOverview onNavigate={setActiveTab} />;
    }
    if (activeTab === 'exams') {
      if (isCreating) {
        if (mixedDrafts.length > 0 && activeMixedDraft) {
          return (
            <div className="space-y-5">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-100">Các đề xáo đang chờ lưu</p>
                    <p className="text-xs text-cyan-200/60">Lưu tab hiện tại xong hệ thống sẽ tự chuyển sang tab kế tiếp.</p>
                  </div>
                  <span className="text-xs font-semibold text-cyan-100/80">{mixedDrafts.length} đề còn lại</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mixedDrafts.map((draft) => {
                    const realCount = (draft.questions || []).filter(question => question.type !== 'TEXT').length;
                    const active = draft.clientId === activeMixedDraft.clientId;
                    return (
                      <button
                        key={draft.clientId}
                        type="button"
                        onClick={() => setActiveMixedDraftId(draft.clientId)}
                        className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition-all ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10'
                            : 'border-white/10 bg-white/5 text-white/50 hover:text-white/75'
                        }`}
                      >
                        <span className="block font-bold">{draft.label}</span>
                        <span className="block text-[11px] opacity-70">{realCount} câu</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <ExamEditor
                key={activeMixedDraft.clientId}
                exam={activeMixedDraft}
                folders={folders}
                onSave={handleSaveMixedDraft}
                onBack={handleBackToList}
                onFileLoaded={handleFileLoaded}
                parseError={parseError}
                defaultTab={examEditorTab}
                trackedOcrRequestId={trackedOcrRequestId}
                onTrackedOcrRequestChange={setTrackedOcrRequestId}
                onDraftChange={handleMixedDraftChange}
              />
            </div>
          );
        }
        return (
          <ExamEditor
            exam={editingExam}
            folders={folders}
            questions={parsedQuestions}
            onSave={handleSaveExam}
            onBack={handleBackToList}
            onFileLoaded={handleFileLoaded}
            parseError={parseError}
            defaultTab={examEditorTab}
            trackedOcrRequestId={trackedOcrRequestId}
            onTrackedOcrRequestChange={setTrackedOcrRequestId}
          />
        );
      }
      return (
        <ExamList
          exams={exams}
          folders={folders}
          onEdit={handleEditExam}
          onDelete={handleDeleteExam}
          onTogglePublish={handleTogglePublish}
          onCreateNew={handleCreateNew}
          onUpdateOrder={handleUpdateOrder}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          onUpdateFoldersOrder={handleUpdateFoldersOrder}
          onSaveExam={handleSaveExam}
          onCreateMixedExam={handleCreateMixedExam}
        />
      );
    }
    if (activeTab === 'scoring') {
      return <ScoringConfig />;
    }
    if (activeTab === 'targetExams') {
      return <TargetExamManagement showAlert={showAlert} showConfirm={showConfirm} />;
    }
    if (activeTab === 'reports') {
      return <ReportManagement onEditExam={handleEditExamById} showAlert={showAlert} showConfirm={showConfirm} />;
    }
    if (activeTab === 'users') {
      return <UserManagement />;
    }
    if (activeTab === 'ocrLogs') {
      return <OcrLogManagement showAlert={showAlert} onTrackRequest={openExamTabForOcrRequest} />;
    }
    if (activeTab === 'practice') {
      return <PracticeProgressManagement />;
    }
    if (activeTab === 'transactions') {
      return <TransactionManagement />;
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
        <AdminSidebar
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
              {/* Mobile menu button */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              {isCreating && (
                <button onClick={handleBackToList} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-sm sm:text-lg font-bold text-white truncate min-w-0">
                {activeTab === 'overview' ? 'Tổng quan hệ thống' :
                 activeTab === 'exams' ? (isCreating ? (editingExam?.id ? 'Chỉnh sửa đề thi' : 'Tạo đề mới') : 'Quản lý đề thi') :
                 activeTab === 'targetExams' ? 'Quản lý kỳ thi mục tiêu' :
                 activeTab === 'scoring' ? 'Cấu hình điểm số' :
                 activeTab === 'reports' ? 'Quản lý báo cáo câu hỏi' :
                 activeTab === 'ocrLogs' ? 'Theo dõi OCR Logs' :
                 activeTab === 'practice' ? 'Lịch sử ôn luyện' :
                 activeTab === 'transactions' ? 'Lịch sử giao dịch' :
                 'Quản lý người dùng'}
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
