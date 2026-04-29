'use client';

import { useState, useCallback } from 'react';
import {
  Trash2, ChevronDown, ChevronUp, GripVertical, Plus, X,
  Image as ImageIcon, FileText, CheckCircle2, XCircle, Type,
  ToggleLeft, Hash, AlertCircle, BookOpen
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import MathRenderer from '@/components/MathRenderer';

const TYPE_STYLES = {
  MCQ: { label: 'Trắc nghiệm', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: CheckCircle2 },
  TF:  { label: 'Đúng / Sai',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: ToggleLeft },
  SA:  { label: 'Tự luận ngắn', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Type },
  TEXT: { label: 'Ngữ cảnh', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: FileText },
};

const LEVELS = ['Dễ', 'Trung bình', 'Khó', 'VD', 'TH'];

const LEVEL_COLORS = {
  'Dễ': 'text-emerald-400',
  'Trung bình': 'text-blue-400',
  'Khó': 'text-amber-400',
  'VD': 'text-orange-400',
  'TH': 'text-red-400',
};

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function QuestionEditorCard({ question, index, allQuestions, onUpdate, onDelete, isDragged, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [expanded, setExpanded] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggable, setDraggable] = useState(false);

  const q = question;
  const typeStyle = TYPE_STYLES[q.type] || TYPE_STYLES.MCQ;
  const TypeIcon = typeStyle.icon;

  // ── Generic field updater ──
  const update = useCallback((field, value) => {
    onUpdate({ ...q, [field]: value });
  }, [q, onUpdate]);

  const updateMultiple = useCallback((updates) => {
    onUpdate({ ...q, ...updates });
  }, [q, onUpdate]);

  // ── MCQ helpers ──
  const handleOptionChange = (i, value) => {
    const newOpts = [...(q.options || [])];
    newOpts[i] = value;
    update('options', newOpts);
  };

  const handleAddOption = () => {
    const newOpts = [...(q.options || []), ''];
    update('options', newOpts);
  };

  const handleRemoveOption = (i) => {
    const newOpts = (q.options || []).filter((_, idx) => idx !== i);
    // Adjust answer if needed
    const removedLetter = OPTION_LETTERS[i];
    let newAnswer = q.answer;
    if (q.answer === removedLetter) {
      newAnswer = 'A';
    } else if (OPTION_LETTERS.indexOf(q.answer) > i) {
      newAnswer = OPTION_LETTERS[OPTION_LETTERS.indexOf(q.answer) - 1];
    }
    onUpdate({ ...q, options: newOpts, answer: newAnswer });
  };

  // ── TF helpers ──
  const tfSubs = q.tfSubQuestions || [
    { content: '', answer: true },
    { content: '', answer: true },
    { content: '', answer: true },
    { content: '', answer: true },
  ];

  const handleTfSubChange = (i, field, value) => {
    const newSubs = [...tfSubs];
    newSubs[i] = { ...newSubs[i], [field]: value };
    update('tfSubQuestions', newSubs);
  };

  const handleAddTfSub = () => {
    update('tfSubQuestions', [...tfSubs, { content: '', answer: true }]);
  };

  const handleRemoveTfSub = (i) => {
    update('tfSubQuestions', tfSubs.filter((_, idx) => idx !== i));
  };

  // ── Type change ──
  const handleTypeChange = (newType) => {
    const base = { ...q, type: newType };
    if (newType === 'MCQ' && (!q.options || q.options.length === 0)) {
      base.options = ['', '', '', ''];
      base.answer = 'A';
    }
    if (newType === 'TF' && (!q.tfSubQuestions || q.tfSubQuestions.length === 0)) {
      base.tfSubQuestions = [
        { content: '', answer: true },
        { content: '', answer: true },
        { content: '', answer: true },
        { content: '', answer: true },
      ];
    }
    if (newType === 'SA') {
      base.answer = q.answer || '';
    }
    onUpdate(base);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      updateMultiple({ imageFile: file, image: URL.createObjectURL(file) });
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          updateMultiple({ imageFile: file, image: URL.createObjectURL(file) });
          break;
        }
      }
    }
  };

  return (
    <div 
      className={`rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all hover:border-white/15 ${isDragged ? 'opacity-50 scale-[0.98] shadow-lg shadow-indigo-500/20 z-10 relative' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, index);
      }}
      onDragOver={(e) => {
        if (onDragOver) onDragOver(e, index);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return;
        if (onDrop) onDrop(e, index);
      }}
      onDragEnd={(e) => {
        setDraggable(false);
        if (onDragEnd) onDragEnd(e);
      }}
      onPaste={handlePaste}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}>
        <div 
          className="p-1 -ml-1 cursor-grab active:cursor-grabbing"
          onMouseEnter={() => setDraggable(true)}
          onMouseLeave={() => setDraggable(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-white/15 flex-shrink-0" />
        </div>
        {q.type === 'TEXT' ? (
          <div className="w-8 flex justify-center items-center">
            <BookOpen className="w-4 h-4 text-white/30" />
          </div>
        ) : (
          <span className="text-sm font-black text-white/30 w-8">#{index + 1}</span>
        )}

        {/* Type badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeStyle.color}`}>
          <TypeIcon className="w-3 h-3" />
          {typeStyle.label}
        </span>

        {/* Level badge */}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[q.level] || 'text-white/40'}`}>
          {q.level || 'TB'}
        </span>

        {/* Preview of content */}
        <span className="flex-1 text-xs text-white/30 truncate ml-2">
          {q.content ? q.content.slice(0, 80) + (q.content.length > 80 ? '…' : '') : 'Chưa có nội dung'}
        </span>

        {/* Expand/collapse */}
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors"
            title="Xoá câu hỏi">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </div>

      {/* ── Body ── */}
      {expanded && (
        <div className="p-5 space-y-5 animate-fadeIn">
          {/* Row 1: Type + Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Question Type */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Loại câu hỏi</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TYPE_STYLES).map(([key, style]) => {
                  const Icon = style.icon;
                  return (
                    <button key={key} onClick={() => handleTypeChange(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        q.type === key
                          ? style.color
                          : 'bg-white/5 text-white/30 border-white/10 hover:text-white/50'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Level */}
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Mức độ</label>
              <select value={q.level || 'Trung bình'} onChange={e => update('level', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                {LEVELS.map(l => <option key={l} value={l} className="bg-[#14142a]">{l}</option>)}
              </select>
            </div>
            {/* ID */}
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">ID</label>
              <input type="text" value={q.id || ''} onChange={e => update('id', e.target.value)}
                placeholder="VD: MATH_001"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs focus:outline-none focus:border-indigo-500/50 transition-all font-mono" />
            </div>
            {/* Linked To */}
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Nằm trong ngữ cảnh</label>
              <select value={q.linkedTo || ''} onChange={e => update('linkedTo', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                <option value="" className="bg-[#14142a]">Không liên kết (Câu hỏi độc lập)</option>
                {(allQuestions || [])
                  .filter(parent => parent.id !== q.id && parent.type === 'TEXT')
                  .map(parent => (
                    <option key={parent.id} value={parent.id} className="bg-[#14142a]">
                      ID: {parent.id} — {(parent.content || '').slice(0, 30)}...
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                Nội dung câu hỏi <span className="text-white/15 normal-case">(hỗ trợ LaTeX $...$)</span>
              </label>
              <textarea value={q.content || ''} onChange={e => update('content', e.target.value)}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                placeholder="Nhập nội dung câu hỏi..."
                rows={4}
                className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y leading-relaxed" />
            </div>
            {/* Preview LaTeX */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-sm text-white/80 overflow-y-auto max-h-[300px]">
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider block mb-2">Xem trước</span>
              <MathRenderer text={q.content} />
            </div>
          </div>

          {/* ── MCQ Options ── */}
          {q.type === 'MCQ' && (
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Đáp án</label>
              <div className="space-y-2">
                {(q.options || []).map((opt, i) => {
                  const letter = OPTION_LETTERS[i];
                  const isCorrect = q.answer === letter;
                  return (
                    <div key={i} className="flex items-center gap-2 group">
                      {/* Select correct answer */}
                      <button onClick={() => update('answer', letter)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                            : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60 hover:border-white/20'
                        }`}
                        title={isCorrect ? 'Đáp án đúng' : 'Chọn làm đáp án đúng'}>
                        {letter}
                      </button>
                      {/* Option text */}
                      <input type="text" value={opt} onChange={e => handleOptionChange(i, e.target.value)}
                        placeholder={`Nhập đáp án ${letter}...`}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none transition-all ${
                          isCorrect
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-white focus:border-emerald-500/40'
                            : 'bg-white/5 border-white/10 text-white/80 placeholder-white/20 focus:border-indigo-500/50'
                        }`} />
                      {/* Remove option */}
                      {(q.options || []).length > 2 && (
                        <button onClick={() => handleRemoveOption(i)}
                          className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={handleAddOption}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors border border-transparent hover:border-indigo-500/20">
                <Plus className="w-3 h-3" /> Thêm đáp án
              </button>
            </div>
          )}

          {/* ── TF Sub-questions ── */}
          {q.type === 'TF' && (
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                Các lệnh hỏi con ({tfSubs.length})
              </label>
              <div className="space-y-2">
                {tfSubs.map((sub, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    {/* Sub-question number */}
                    <span className="w-6 text-center text-xs font-bold text-white/20 flex-shrink-0">{String.fromCharCode(97 + i)})</span>
                    {/* Content */}
                    <input type="text" value={sub.content} onChange={e => handleTfSubChange(i, 'content', e.target.value)}
                      placeholder={`Nội dung lệnh hỏi ${i + 1}...`}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all" />
                    {/* Toggle Đúng / Sai */}
                    <button onClick={() => handleTfSubChange(i, 'answer', !sub.answer)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all min-w-[60px] text-center ${
                        sub.answer
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                      {sub.answer ? 'Đúng' : 'Sai'}
                    </button>
                    {/* Remove */}
                    {tfSubs.length > 1 && (
                      <button onClick={() => handleRemoveTfSub(i)}
                        className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleAddTfSub}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20">
                <Plus className="w-3 h-3" /> Thêm lệnh hỏi
              </button>
            </div>
          )}

          {/* ── SA Answer ── */}
          {q.type === 'SA' && (
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                Đáp án chấp nhận <span className="text-white/15 normal-case">(text hoặc số)</span>
              </label>
              <input type="text" value={q.answer || ''} onChange={e => update('answer', e.target.value)}
                placeholder="VD: 42 hoặc x = 5"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
            </div>
          )}

          {/* ── Solution (collapsible) ── */}
          {q.type !== 'TEXT' && (
            <div>
              <button onClick={() => setShowSolution(!showSolution)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors mb-1.5">
                {showSolution ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Lời giải {q.solution ? '✓' : ''}
              </button>
              {showSolution && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <textarea value={q.solution || ''} onChange={e => update('solution', e.target.value)}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    placeholder="Nhập lời giải chi tiết (hỗ trợ LaTeX)..."
                    rows={4}
                    className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm placeholder-white/15 focus:outline-none focus:border-indigo-500/50 transition-all resize-y" />
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-sm text-white/80 overflow-y-auto max-h-[300px]">
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider block mb-2">Xem trước Lời giải</span>
                    <MathRenderer text={q.solution} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Image ── */}
          <div className="space-y-3">
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 w-full sm:w-[400px] py-6 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 scale-[1.01]'
                  : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <ImageIcon className={`w-6 h-6 transition-transform ${isDragging ? '-translate-y-1' : ''}`} />
              <span className="text-xs font-medium text-center">
                {isDragging ? 'Thả ảnh vào đây...' : (q.image ? 'Kéo thả hoặc click để đổi ảnh khác' : 'Kéo thả hoặc click để tải ảnh minh hoạ lên')}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  updateMultiple({ imageFile: file, image: URL.createObjectURL(file) });
                }
              }} />
            </label>
            
            {q.image && (
              <div className="relative w-fit">
                <img src={q.image} alt="Preview" className="max-w-xs max-h-48 rounded-xl border border-white/10 object-contain bg-white/5" />
                <button onClick={() => { updateMultiple({ imageFile: null, image: null }); }}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  title="Xoá ảnh">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
