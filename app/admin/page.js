'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseQuizText } from '@/lib/parser';
import { getAllExams, saveExam, deleteExam, togglePublish, seedIfEmpty, updateExamsOrder } from '@/lib/examStore';
import FileUpload from '@/components/FileUpload';
import AdminSidebar from '@/components/admin/AdminSidebar';
import ExamList from '@/components/admin/ExamList';
import ExamEditor from '@/components/admin/ExamEditor';
import ScoringConfig from '@/components/admin/ScoringConfig';
import UserManagement from '@/components/admin/UserManagement';
import {
  BookOpen, Plus, ArrowLeft,
} from 'lucide-react';
import UserProfile from '@/components/UserProfile';
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
  const [activeTab, setActiveTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        setExams(allExams);
      }
      init();
    }
  }, [activeTab]);

  // Refresh exams list from store
  const refreshExams = async () => setExams(await getAllExams());

  const handleFileLoaded = useCallback((text, name) => {
    setParseError('');
    try {
      const parsed = parseQuizText(text);
      if (parsed.length === 0) {
        setParseError('Không tìm thấy câu hỏi nào. Kiểm tra định dạng file.');
        return;
      }
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
  }, []);

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingExam(null);
    setParsedQuestions([]);
    setParseError('');
  };

  const handleEditExam = (exam) => {
    setEditingExam({ ...exam, questions: exam.questions || [] });
    setIsCreating(true);
  };

  const handleBackToList = () => {
    setIsCreating(false);
    setEditingExam(null);
    setParsedQuestions([]);
    setParseError('');
  };

  const handleSaveExam = async (examData) => {
    try {
      // 1. Pre-process and upload images to Supabase Storage
      const updatedQuestions = [...examData.questions];
      for (let i = 0; i < updatedQuestions.length; i++) {
        const q = updatedQuestions[i];
        if (q.imageFile) {
          const fileExt = q.imageFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `images/${fileName}`; // Lưu vào folder images/ trong bucket
          
          const { error: uploadError } = await supabase.storage
            .from('exam-images') // Bucket name
            .upload(filePath, q.imageFile);
            
          if (uploadError) {
             throw new Error(`Lỗi tải ảnh (Câu ${i+1}): ` + uploadError.message + '\n\n💡 Vui lòng đảm bảo bạn đã tạo Bucket tên "exam-images" và public trên Supabase.');
          }
          
          const { data } = supabase.storage.from('exam-images').getPublicUrl(filePath);
          q.image = data.publicUrl;
          delete q.imageFile;
        }
      }
      examData.questions = updatedQuestions;

      // 2. Save Exam
      await saveExam(examData);
      await refreshExams();
      handleBackToList();
      showAlert('Thành công', 'Lưu đề thi thành công!');
    } catch (error) {
      console.error("Save exam error:", error);
      showAlert('Lỗi', 'Lỗi khi lưu đề thi: ' + (error.message || JSON.stringify(error)));
    }
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

  // Determine what to render in main content
  const renderContent = () => {
    if (activeTab === 'exams') {
      if (isCreating) {
        return (
          <ExamEditor
            exam={editingExam}
            questions={parsedQuestions}
            onSave={handleSaveExam}
            onBack={handleBackToList}
            onFileLoaded={handleFileLoaded}
            parseError={parseError}
          />
        );
      }
      return (
        <ExamList
          exams={exams}
          onEdit={handleEditExam}
          onDelete={handleDeleteExam}
          onTogglePublish={handleTogglePublish}
          onCreateNew={handleCreateNew}
          onUpdateOrder={handleUpdateOrder}
        />
      );
    }
    if (activeTab === 'scoring') {
      return <ScoringConfig />;
    }
    if (activeTab === 'users') {
      return <UserManagement />;
    }
    return null;
  };

  return (
    <main className="min-h-screen flex">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setIsCreating(false); setEditingExam(null); }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-white/8" style={{ isolation: 'isolate' }}>
          <div className="px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCreating && (
                <button onClick={handleBackToList} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-bold text-white">
                {activeTab === 'exams' ? (isCreating ? (editingExam?.id ? 'Chỉnh sửa đề thi' : 'Tạo đề mới') : 'Quản lý đề thi') :
                 activeTab === 'scoring' ? 'Cấu hình điểm số' :
                 'Quản lý người dùng'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.open('/yeuhoc/', '_blank')} 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                title="Về trang chủ"
              >
                <BookOpen className="w-4 h-4" /> Về trang chủ
              </button>
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="p-8 animate-fadeIn">
          {renderContent()}
        </div>
      </div>
      {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
    </main>
  );
}
