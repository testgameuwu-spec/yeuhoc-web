'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import QuestionEditorCard from '@/components/admin/QuestionEditorCard';
import { DEFAULT_QUESTION_LEVEL } from '@/lib/questionLevels';
import { parseImageMap } from '@/components/ContentWithInlineImage';
import {
  Plus, Save, ArrowLeft, FileText, Eye, EyeOff, Trash2, Clock, BookOpen, Pencil
} from 'lucide-react';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hoá Học', 'Tiếng Anh', 'Tư duy định lượng', 'Tư duy định tính', 'Khác'];
const DEFAULT_SCORING = { mcq: 0.25, ma: 0.25, sa: 0.5, tf: [0.1, 0.25, 0.5, 1.0] };

const createEmptyQuestion = (type = 'MCQ') => ({
  id: `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  level: DEFAULT_QUESTION_LEVEL,
  content: '',
  options: type === 'MCQ' || type === 'MA' ? ['', '', '', ''] : null,
  answer: type === 'MA' ? [] : type === 'TF' ? [false, false, false, false] : '',
  solution: '',
  image: null,
});

const isPendingImageFile = (file) => Boolean(file && typeof file.name === 'string');

async function uploadQuestionImages(questions) {
  const updated = questions.map((q) => ({ ...q }));

  for (let i = 0; i < updated.length; i += 1) {
    const question = updated[i];

    const uploadFile = async (file) => {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `exams/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('classroom-images').upload(filePath, file);
      if (error) throw new Error(`Lỗi tải ảnh câu ${i + 1}: ${error.message}`);
      const { data } = supabase.storage.from('classroom-images').getPublicUrl(filePath);
      return data.publicUrl;
    };

    if (isPendingImageFile(question.imageFile)) {
      question.image = await uploadFile(question.imageFile);
      delete question.imageFile;
    }

    if (question.imageFiles && typeof question.imageFiles === 'object') {
      const imageMap = parseImageMap(question.image);
      for (const [markerId, file] of Object.entries(question.imageFiles)) {
        if (isPendingImageFile(file)) {
          imageMap[markerId] = await uploadFile(file);
        }
      }
      const entries = Object.entries(imageMap).filter(([, value]) => Boolean(value));
      question.image = entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : null;
      delete question.imageFiles;
    }
  }

  return updated.map((q) => {
    const { imageFile, imageFiles, ...rest } = q;
    return rest;
  });
}

export default function ClassroomExamManagement({ classroomId, showAlert, showConfirm }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subject: 'Toán',
    description: '',
    timeLimit: 45,
    isPublished: false,
    questions: [],
  });
  const [draggedIndex, setDraggedIndex] = useState(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classroom_exams')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      console.error('Fetch classroom exams error:', err);
      showAlert('Lỗi', 'Không thể tải danh sách đề thi.');
    } finally {
      setLoading(false);
    }
  }, [classroomId, showAlert]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const openCreate = () => {
    setIsEditorOpen(true);
    setEditingExam(null);
    setForm({
      title: '',
      subject: 'Toán',
      description: '',
      timeLimit: 45,
      isPublished: false,
      questions: [createEmptyQuestion('MCQ')],
    });
  };

  const openEdit = (exam) => {
    setIsEditorOpen(true);
    setEditingExam(exam);
    setForm({
      title: exam.title || '',
      subject: exam.subject || 'Toán',
      description: exam.description || '',
      timeLimit: exam.time_limit || 45,
      isPublished: Boolean(exam.is_published),
      questions: Array.isArray(exam.questions) && exam.questions.length > 0
        ? exam.questions
        : [createEmptyQuestion('MCQ')],
    });
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingExam(null);
    setForm({
      title: '',
      subject: 'Toán',
      description: '',
      timeLimit: 45,
      isPublished: false,
      questions: [],
    });
  };

  const updateQuestion = (index, updated) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? updated : q)),
    }));
  };

  const deleteQuestion = (index) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const reorderQuestion = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    setForm((prev) => {
      const next = [...prev.questions];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, questions: next };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tiêu đề đề thi.');
      return;
    }
    if (form.questions.length === 0) {
      showAlert('Lỗi', 'Đề thi cần ít nhất một câu hỏi.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Bạn cần đăng nhập lại.');

      const processedQuestions = await uploadQuestionImages(form.questions);
      const payload = {
        classroom_id: classroomId,
        title: form.title.trim(),
        subject: form.subject,
        description: form.description.trim() || null,
        time_limit: Number(form.timeLimit) || 45,
        scoring_config: DEFAULT_SCORING,
        is_published: form.isPublished,
        questions: processedQuestions,
        created_by: user.id,
      };

      if (editingExam?.id) {
        const { error } = await supabase
          .from('classroom_exams')
          .update(payload)
          .eq('id', editingExam.id);
        if (error) throw error;
        showAlert('Thành công', 'Đã cập nhật đề thi.');
      } else {
        const { error } = await supabase.from('classroom_exams').insert(payload);
        if (error) throw error;
        showAlert('Thành công', 'Đã tạo đề thi mới.');
      }

      closeEditor();
      fetchExams();
    } catch (err) {
      console.error('Save classroom exam error:', err);
      showAlert('Lỗi', err.message || 'Không thể lưu đề thi.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      const { error } = await supabase
        .from('classroom_exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);
      if (error) throw error;
      fetchExams();
    } catch (err) {
      showAlert('Lỗi', 'Không thể đổi trạng thái xuất bản: ' + err.message);
    }
  };

  const handleDelete = (exam) => {
    showConfirm('Xóa đề thi', `Xóa vĩnh viễn đề "${exam.title}"?`, async () => {
      const { error } = await supabase.from('classroom_exams').delete().eq('id', exam.id);
      if (error) {
        showAlert('Lỗi', 'Không thể xóa đề thi: ' + error.message);
      } else {
        showAlert('Thành công', 'Đã xóa đề thi.');
        fetchExams();
      }
    });
  };

  if (isEditorOpen) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={closeEditor}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu đề thi'}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="text-lg font-bold text-white">{editingExam ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Tiêu đề</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                placeholder="Ví dụ: Kiểm tra 15 phút chương 1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Môn học</span>
              <select
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject} className="bg-[#14142a]">{subject}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Thời gian (phút)</span>
              <input
                type="number"
                min="1"
                value={form.timeLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                className="rounded border-white/20"
              />
              <span className="text-sm text-white/80">Xuất bản cho học sinh trong lớp</span>
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">Mô tả (tuỳ chọn)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold">Câu hỏi ({form.questions.length})</h4>
          <div className="flex flex-wrap gap-2">
            {['MCQ', 'MA', 'TF', 'SA', 'TEXT'].map((type) => (
              <button
                key={type}
                onClick={() => setForm((prev) => ({ ...prev, questions: [...prev.questions, createEmptyQuestion(type)] }))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
              >
                + {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {form.questions.map((question, index) => (
            <QuestionEditorCard
              key={question.id || index}
              question={question}
              index={index}
              totalQuestions={form.questions.length}
              allQuestions={form.questions}
              onUpdate={(updated) => updateQuestion(index, updated)}
              onDelete={() => deleteQuestion(index)}
              onReorder={reorderQuestion}
              isDragged={draggedIndex === index}
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedIndex !== null && draggedIndex !== index) reorderQuestion(draggedIndex, index);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Đề thi của lớp</h3>
          <p className="text-sm text-white/50">Tạo và giao đề cho học sinh đã được duyệt.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo đề mới
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-white/50">Đang tải đề thi...</div>
      ) : exams.length > 0 ? (
        <div className="space-y-3">
          {exams.map((exam) => {
            const questionCount = Array.isArray(exam.questions)
              ? exam.questions.filter((q) => q?.type !== 'TEXT').length
              : 0;
            return (
              <div key={exam.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white truncate">{exam.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${exam.is_published ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                      {exam.is_published ? 'Đã xuất bản' : 'Nháp'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {exam.subject || 'Không rõ'}</span>
                    <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {questionCount} câu</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.time_limit || 45} phút</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleTogglePublish(exam)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title={exam.is_published ? 'Ẩn đề' : 'Xuất bản'}>
                    {exam.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(exam)} className="p-2 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300" title="Sửa đề">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(exam)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400" title="Xóa đề">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Chưa có đề thi nào trong lớp này.</p>
        </div>
      )}
    </div>
  );
}
