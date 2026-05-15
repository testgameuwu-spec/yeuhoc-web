'use client';

import { useState, useCallback, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import AIExamGenerator from '@/components/admin/AIExamGenerator';
import QuestionEditorCard from '@/components/admin/QuestionEditorCard';
import {
  Save, Eye, EyeOff, Clock, GraduationCap, Calendar,
  BookOpen, Plus, Upload, Settings, ChevronDown, FileText, ShieldAlert, Shuffle, AlertTriangle
} from 'lucide-react';
import { TSA_TOTAL_DURATION_MINUTES, TSA_TOTAL_QUESTIONS } from '@/lib/examScoring';
import { shuffleExamQuestions } from '@/lib/questionShuffle';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hoá Học', 'Tiếng Anh', 'Tư duy định lượng', 'Tư duy định tính', 'Khác'];
const EXAM_TYPES = ['THPT', 'HSA', 'TSA', 'Other'];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const SCORING_PRESETS = {
  'THPT Toán': { mcq: 0.25, ma: 0.25, sa: 0.5, tf: [0.1, 0.25, 0.5, 1.0] },
  'THPT Lý & Hoá': { mcq: 0.25, ma: 0.25, sa: 0.25, tf: [0.1, 0.25, 0.5, 1.0] },
  'HSA': { mcq: 1, ma: 1, sa: 1, tf: [0.25, 0.25, 0.25, 0.25] },
  'TSA': { mcq: 1, ma: 1, sa: 1, tf: [1, 1, 1, 1] },
  'Tuỳ chỉnh': null,
};

const getHsaDurationBySubject = (subj) => {
  const normalized = String(subj || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (normalized === 'toan' || normalized === 'tu duy dinh luong') return 75;
  if (normalized === 'tu duy dinh tinh' || normalized === 'van hoc - ngon ngu') return 60;
  if (normalized === 'tieng anh') return 60;
  return null;
};

export default function ExamEditor({
  exam,
  folders = [],
  questions: initialQuestions,
  onSave,
  onBack,
  onFileLoaded,
  parseError,
  defaultTab = 'settings',
  trackedOcrRequestId = '',
  onTrackedOcrRequestChange = null,
}) {
  const [title, setTitle] = useState(exam?.title || '');
  const [subject, setSubject] = useState(exam?.subject || 'Toán');
  const [examType, setExamType] = useState(exam?.examType || 'THPT');
  const [year, setYear] = useState(exam?.year || 2024);
  const [duration, setDuration] = useState(exam?.duration || 90);
  const [published, setPublished] = useState(exam?.published || false);
  const [note, setNote] = useState(exam?.note || '');
  const [folderId, setFolderId] = useState(exam?.folderId || 'root');
  const [questions, setQuestions] = useState(initialQuestions || exam?.questions || []);
  const [scoringPreset, setScoringPreset] = useState('THPT Toán');
  const [scoringConfig, setScoringConfig] = useState(SCORING_PRESETS['THPT Toán']);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(exam?.antiCheatEnabled !== false);
  const [activeSection, setActiveSection] = useState(defaultTab || (exam ? 'settings' : 'upload')); // upload | settings | questions
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasQuestions = questions.length > 0;
  const realQuestionCount = questions.filter(q => q.type !== 'TEXT').length;

  const updatePreset = useCallback((subj, type) => {
    let preset = 'Tuỳ chỉnh';
    if (type === 'HSA') {
      preset = 'HSA';
    } else if (type === 'TSA') {
      preset = 'TSA';
    } else if (type === 'THPT') {
      if (subj === 'Toán') preset = 'THPT Toán';
      else if (subj === 'Vật Lý' || subj === 'Hoá Học') preset = 'THPT Lý & Hoá';
    }
    
    if (SCORING_PRESETS[preset]) {
      setScoringPreset(preset);
      setScoringConfig({ ...SCORING_PRESETS[preset] });
    }
  }, []);

  // Sync local state when parent passes new exam data (e.g. after file upload)
  useEffect(() => {
    if (exam) {
      const timer = setTimeout(() => {
        setTitle(exam.title || '');
        setSubject(exam.subject || 'Toán');
        setExamType(exam.examType || 'THPT');
        setYear(exam.year || 2024);
        setDuration(exam.duration || 90);
        setPublished(exam.published || false);
        setNote(exam.note || '');
        setFolderId(exam.folderId || 'root');
        setAntiCheatEnabled(exam.antiCheatEnabled !== false);
        if (exam.questions && exam.questions.length > 0) {
          setQuestions(exam.questions);
        }

        // Load saved scoring config
        if (exam.scoringConfig) {
          setScoringConfig(exam.scoringConfig);
          // Attempt to match preset
          let matchedPreset = 'Tuỳ chỉnh';
          for (const [key, preset] of Object.entries(SCORING_PRESETS)) {
            if (preset && JSON.stringify(preset) === JSON.stringify(exam.scoringConfig)) {
              matchedPreset = key;
              break;
            }
          }
          setScoringPreset(matchedPreset);
        } else {
          updatePreset(exam.subject || 'Toán', exam.examType || 'THPT');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [exam, updatePreset]);

  // Sync questions when initialQuestions prop changes (file upload result)
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      const timer = setTimeout(() => {
        setQuestions(initialQuestions);
        setHasUnsavedChanges(true);
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [initialQuestions]);

  // Handle beforeunload to warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handlePresetChange = (preset) => {
    setScoringPreset(preset);
    if (SCORING_PRESETS[preset]) {
      setScoringConfig({ ...SCORING_PRESETS[preset] });
      if (preset === 'HSA') {
        const hsaDuration = getHsaDurationBySubject(subject);
        setExamType('HSA');
        if (hsaDuration) setDuration(hsaDuration);
      } else if (preset === 'TSA') {
        setExamType('TSA');
        setDuration(TSA_TOTAL_DURATION_MINUTES);
      }
      setHasUnsavedChanges(true);
    } else if (preset === 'Tuỳ chỉnh') {
      if (!scoringConfig) {
        setScoringConfig({ mcq: 0.25, ma: 0.25, sa: 0.5, tf: [0.1, 0.25, 0.5, 1.0] });
      }
      setHasUnsavedChanges(true);
    }
  };



  const handleSubjectChange = (e) => {
    const newSubject = e.target.value;
    setSubject(newSubject);
    if (examType === 'HSA') {
      const hsaDuration = getHsaDurationBySubject(newSubject);
      if (hsaDuration) setDuration(hsaDuration);
    }
    setHasUnsavedChanges(true);
    updatePreset(newSubject, examType);
  };

  const handleExamTypeChange = (e) => {
    const newType = e.target.value;
    setExamType(newType);
    if (newType === 'HSA') {
      const hsaDuration = getHsaDurationBySubject(subject);
      if (hsaDuration) setDuration(hsaDuration);
    } else if (newType === 'TSA') {
      setDuration(TSA_TOTAL_DURATION_MINUTES);
    }
    setHasUnsavedChanges(true);
    updatePreset(subject, newType);
  };

  const handleQuestionUpdate = useCallback((index, updatedQ) => {
    setQuestions(prev => prev.map((q, i) => i === index ? updatedQ : q));
    setHasUnsavedChanges(true);
  }, []);

  const handleQuestionDelete = useCallback((index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }, []);

  const handleAddQuestion = () => {
    const newQ = {
      id: `NEW_${Date.now()}`,
      type: 'MCQ',
      level: 'Trung bình',
      content: '',
      options: ['', '', '', ''],
      answer: 'A',
      solution: '',
      image: null,
    };
    setQuestions(prev => [...prev, newQ]);
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    handleReorderQuestion(draggedIndex, index);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getGroupIds = useCallback((qId, questions) => {
    const q = questions.find(x => x.id === qId);
    if (!q) return new Set();
    let parentId = null;
    if (q.type === 'TEXT') parentId = q.id;
    else if (q.linkedTo) parentId = q.linkedTo;
    
    if (parentId) {
      return new Set(questions.filter(x => x.id === parentId || x.linkedTo === parentId).map(x => x.id));
    }
    return new Set([q.id]);
  }, []);

  const handleReorderQuestion = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setQuestions(prev => {
      const sourceItem = prev[fromIndex];
      const targetItem = prev[toIndex];
      if (!sourceItem || !targetItem) return prev;

      const sourceGroupIds = getGroupIds(sourceItem.id, prev);

      // Intra-group reorder (reordering within the same linked group)
      if (sourceGroupIds.has(targetItem.id)) {
        // Prevent moving a child question above its TEXT context
        if (targetItem.type === 'TEXT' && fromIndex > toIndex) {
          return prev;
        }
        // Prevent moving a TEXT context below its child
        if (sourceItem.type === 'TEXT' && fromIndex < toIndex) {
          return prev;
        }
        const newQuestions = [...prev];
        const [moved] = newQuestions.splice(fromIndex, 1);
        newQuestions.splice(toIndex, 0, moved);
        return newQuestions;
      }

      // Inter-group reorder (moving a group entirely)
      const targetGroupIds = getGroupIds(targetItem.id, prev);
      const sourceItems = prev.filter(q => sourceGroupIds.has(q.id));
      const otherItems = prev.filter(q => !sourceGroupIds.has(q.id));
      
      const isMovingDown = fromIndex < toIndex;
      
      let insertIndex;
      if (isMovingDown) {
        // Find the LAST item of the target group in otherItems
        const targetGroupItemsInOther = otherItems.filter(q => targetGroupIds.has(q.id));
        const lastTargetItem = targetGroupItemsInOther[targetGroupItemsInOther.length - 1];
        insertIndex = otherItems.findIndex(q => q.id === lastTargetItem.id) + 1;
      } else {
        // Find the FIRST item of the target group in otherItems
        const firstTargetItem = otherItems.find(q => targetGroupIds.has(q.id));
        insertIndex = otherItems.findIndex(q => q.id === firstTargetItem.id);
      }
      
      return [
        ...otherItems.slice(0, insertIndex),
        ...sourceItems,
        ...otherItems.slice(insertIndex)
      ];
    });
    setHasUnsavedChanges(true);
  }, [getGroupIds]);

  const handleShuffleQuestions = useCallback(() => {
    const confirmMessage = examType === 'TSA'
      ? 'Bạn có chắc chắn muốn xáo trộn câu hỏi? Với TSA, hệ thống chỉ trộn câu trong từng phần 40/20/40. Các câu hỏi chùm luôn đi liền nhau và ngữ cảnh luôn đứng đầu.'
      : 'Bạn có chắc chắn muốn xáo trộn câu hỏi? Các câu hỏi chùm luôn đi liền nhau và ngữ cảnh luôn đứng đầu.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const result = shuffleExamQuestions(questions, { examType });
    if (result.error) {
      window.alert(result.error);
      return;
    }

    setQuestions(result.questions);
    setHasUnsavedChanges(true);
  }, [examType, questions]);

  const handleSave = () => {
    onSave({
      id: exam?.id || null,
      title, subject, examType, year, duration, published, note, folderId: folderId === 'root' ? null : folderId,
      questions, scoringConfig, totalQ: realQuestionCount,
      antiCheatEnabled,
    });
    setHasUnsavedChanges(false);
  };

  const handleAIQuestionsReady = ({ questions: aiQuestions, fileName }) => {
    setQuestions(aiQuestions);
    setHasUnsavedChanges(true);
    if (!title && fileName) {
      setTitle(fileName.replace(/\.[^.]+$/, ''));
    }
    setActiveSection('questions');
  };

  const isTsaExam = examType === 'TSA';
  const showTsaCountWarning = isTsaExam && realQuestionCount !== TSA_TOTAL_QUESTIONS;

  return (
    <div className="space-y-6 w-full">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {[
          { key: 'upload', label: 'Tải đề lên', icon: Upload },
          { key: 'settings', label: 'Cài đặt đề', icon: Settings },
          { key: 'questions', label: `Câu hỏi (${questions.length})`, icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === tab.key
              ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-500/30'
              : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Upload Section ─── */}
      {activeSection === 'upload' && (
        <div className="animate-fadeIn space-y-6">
          <AIExamGenerator
            onQuestionsReady={handleAIQuestionsReady}
            trackedRequestId={trackedOcrRequestId}
            onTrackedRequestIdChange={onTrackedOcrRequestChange}
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Upload file đề thi</h3>
              <p className="text-sm text-white/40">Tải lên file .txt theo định dạng chuẩn để tự động parse câu hỏi</p>
            </div>
            <FileUpload onFileLoaded={(text, name) => {
              onFileLoaded(text, name);
              if (!parseError) setActiveSection('questions');
            }} />
            {parseError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {parseError}
              </div>
            )}
            {hasQuestions && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                ✅ Đã parse thành công <strong>{questions.length}</strong> câu hỏi — chuyển sang tab &quot;Câu hỏi&quot; để chỉnh sửa
              </div>
            )}

            {/* Format Guide */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-sm font-semibold text-white/60 mb-3">📖 Định dạng file .txt</p>
              <pre className="text-xs text-white/40 leading-relaxed font-mono whitespace-pre-wrap">{`====START====
[ID] MATH_001
[TYPE] MCQ
[LEVEL] Khó
[CONTENT] Nội dung câu hỏi, hỗ trợ LaTeX $...$
[OPTIONS]
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
[ANSWER] A
[SOL] Lời giải chi tiết
[IMAGE] url_hoặc_mô_tả
====END====

====START====
[ID] MA_001
[TYPE] MA
[LEVEL] Trung bình
[CONTENT] Chọn tất cả đáp án đúng.
[OPTIONS]
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
[ANSWER] A,C
[SOL] Lời giải chi tiết
====END====

====START====
[ID] DRAG_001
[TYPE] DRAG
[LEVEL] Trung bình
[CONTENT] Nội dung có ô kéo thả dạng [[1]], [[2]]
[OPTIONS]
A. Đáp án kéo thả A
B. Đáp án kéo thả B
C. Đáp án kéo thả C
[ANSWER] 1-A, 2-C
[SOL] Lời giải chi tiết
====END====

Lưu ý: Với DRAG, mỗi chữ cái đáp án chỉ được dùng một lần trong [ANSWER].`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ─── Settings Section ─── */}
      {activeSection === 'settings' && (
        <div className="animate-fadeIn space-y-6">
          {/* Exam Info */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Thông tin đề thi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Tên đề thi</label>
                <input type="text" value={title} onChange={e => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="VD: Đề thi THPT QG 2024 — Toán"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
              </div>
              {/* Folder */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Thư mục lưu trữ</label>
                <select value={folderId} onChange={e => { setFolderId(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                  <option value="root" className="bg-[#14142a]">-- Không thuộc thư mục nào --</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id} className="bg-[#14142a]">{f.name}</option>
                  ))}
                </select>
              </div>
              {/* Note (Admin Only) */}
              <div className="sm:col-span-2 mt-2">
                <label className="block text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  Ghi chú nội bộ (Chỉ Admin thấy)
                </label>
                <textarea value={note} onChange={e => { setNote(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="Thêm ghi chú, nguồn gốc đề thi, các phần cần sửa chữa..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none" />
              </div>
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Môn học</label>
                <select value={subject} onChange={handleSubjectChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                  {SUBJECTS.map(s => <option key={s} value={s} className="bg-[#14142a]">{s}</option>)}
                </select>
              </div>
              {/* Exam Type */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Kì thi</label>
                <select value={examType} onChange={handleExamTypeChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                  {EXAM_TYPES.map(t => <option key={t} value={t} className="bg-[#14142a]">{t}</option>)}
                </select>
              </div>
              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Năm</label>
                <select value={year} onChange={e => { setYear(Number(e.target.value)); setHasUnsavedChanges(true); }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                  {YEARS.map(y => <option key={y} value={y} className="bg-[#14142a]">{y}</option>)}
                </select>
              </div>
              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Thời gian (phút)</label>
                <input type="number" value={duration} onChange={e => { setDuration(Number(e.target.value)); setHasUnsavedChanges(true); }} min={1} max={180}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
              </div>
            </div>
            {showTsaCountWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Preset TSA chuẩn cần {TSA_TOTAL_QUESTIONS} câu theo thứ tự 40/20/40. Đề hiện có {realQuestionCount} câu; hệ thống vẫn cho lưu nhưng khi thi sẽ chia phần theo thứ tự câu hiện có.
                </span>
              </div>
            )}
          </div>

          {/* Scoring Config */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" /> Cấu hình điểm số
            </h3>
            {/* Preset picker */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(SCORING_PRESETS).map(p => (
                <button key={p} onClick={() => handlePresetChange(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${scoringPreset === p
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white/60'
                    }`}>
                  {p}
                </button>
              ))}
            </div>
            {/* Config table */}
            {scoringConfig && (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
                  <div className="p-4 bg-[#0e0e22]">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">MCQ (điểm/câu)</p>
                    <input type="number" step={0.05} value={scoringConfig.mcq}
                      onChange={e => { setScoringPreset('Tuỳ chỉnh'); setScoringConfig(prev => ({ ...prev, mcq: Number(e.target.value) })); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
                  </div>
                  <div className="p-4 bg-[#0e0e22]">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">MA (điểm/câu)</p>
                    <input type="number" step={0.05} value={scoringConfig.ma ?? scoringConfig.mcq ?? 1}
                      onChange={e => { setScoringPreset('Tuỳ chỉnh'); setScoringConfig(prev => ({ ...prev, ma: Number(e.target.value) })); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
                  </div>
                  <div className="p-4 bg-[#0e0e22]">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">SA (điểm/câu)</p>
                    <input type="number" step={0.05} value={scoringConfig.sa}
                      onChange={e => { setScoringPreset('Tuỳ chỉnh'); setScoringConfig(prev => ({ ...prev, sa: Number(e.target.value) })); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
                  </div>
                  <div className="p-4 bg-[#0e0e22]">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">TF thang điểm</p>
                    <div className="grid grid-cols-2 gap-2">
                      {scoringConfig.tf.map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/30">{i + 1}/4:</span>
                          <input type="number" step={0.05} value={v}
                            onChange={e => {
                              const newTf = [...scoringConfig.tf];
                              newTf[i] = Number(e.target.value);
                              setScoringPreset('Tuỳ chỉnh');
                              setScoringConfig(prev => ({ ...prev, tf: newTf }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isTsaExam && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs text-violet-200">
                TSA luôn chấm 1 điểm/câu trên thang 100. TF, MA và DRAG phải đúng toàn bộ ý mới được tính điểm.
              </div>
            )}
          </div>

          {/* Anti-cheat Config */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Chế độ phòng thi
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/8">
              <div className="flex-1 mr-4">
                <div className="text-sm font-semibold text-white/80 mb-1">Cảnh báo vi phạm (Anti-cheat)</div>
                <p className="text-xs text-white/35 leading-relaxed">
                  Khi bật, hệ thống sẽ bắt buộc toàn màn hình, theo dõi chuyển tab và thoát fullscreen.
                  Sau 5 lần vi phạm sẽ tự động nộp bài.
                </p>
              </div>
              <button
                onClick={() => { setAntiCheatEnabled(!antiCheatEnabled); setHasUnsavedChanges(true); }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${
                  antiCheatEnabled
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                    : 'bg-white/15'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  antiCheatEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {!antiCheatEnabled && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Chế độ Anti-cheat đã <strong>tắt</strong>. Học sinh sẽ không bị cảnh báo khi chuyển tab hoặc thoát toàn màn hình trong khi làm bài thi này.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Questions Section ─── */}
      {activeSection === 'questions' && (
        <div className="animate-fadeIn space-y-4">
          {questions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">{realQuestionCount} câu hỏi</p>
                <div className="flex items-center gap-2">
                  <button onClick={handleShuffleQuestions}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
                    title={isTsaExam ? 'Trộn câu hỏi trong từng phần TSA, giữ liền câu chùm' : 'Trộn câu hỏi, giữ liền câu chùm'}>
                    <Shuffle className="w-4 h-4" /> Trộn câu hỏi
                  </button>
                  <button onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-500/50 text-sm font-medium transition-all">
                    <Plus className="w-4 h-4" /> Thêm câu hỏi
                  </button>
                </div>
              </div>
              {questions.map((q, i) => (
                <QuestionEditorCard
                  key={`${q.id}-${i}`}
                  question={q}
                  index={i}
                  totalQuestions={questions.length}
                  onUpdate={(updated) => handleQuestionUpdate(i, updated)}
                  onDelete={() => handleQuestionDelete(i)}
                  onReorder={handleReorderQuestion}
                  isDragged={draggedIndex === i}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  allQuestions={questions}
                />
              ))}
            </>
          ) : (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
              <Upload className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm mb-2">Chưa có câu hỏi nào</p>
              <p className="text-white/25 text-xs mb-6">Upload file .txt hoặc thêm câu hỏi thủ công</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setActiveSection('upload')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25">
                  Upload file
                </button>
                <button onClick={handleAddQuestion}
                  className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/60 text-sm font-semibold hover:text-white hover:bg-white/15 transition-all">
                  Thêm thủ công
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Action Bar ─── */}
      <div className="sticky bottom-0 py-4">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setPublished(!published)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${published
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-white/40 border-white/10'
                }`}>
              {published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {published ? 'Published' : 'Draft'}
            </button>
            <span className="text-xs text-white/30">{realQuestionCount} câu · {duration} phút</span>
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25">
            <Save className="w-4 h-4" />
            Lưu đề thi
          </button>
        </div>
      </div>
    </div>
  );
}
