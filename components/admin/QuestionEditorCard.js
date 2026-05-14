'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Trash2, ChevronDown, ChevronUp, GripVertical, Plus, X,
  Image as ImageIcon, FileText, CheckCircle2, Type,
  ToggleLeft, AlertCircle, BookOpen, ArrowUpDown
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { getDragBlankIds, normalizeMAAnswer, parseDragAnswer } from '@/lib/questionResult';
import { getInlineImageMarkerIds, parseImageMap } from '@/components/ContentWithInlineImage';

const TYPE_STYLES = {
  MCQ: { label: 'Trắc nghiệm', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: CheckCircle2 },
  MA:  { label: 'Chọn nhiều đáp án', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30', icon: CheckCircle2 },
  TF:  { label: 'Đúng / Sai',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: ToggleLeft },
  SA:  { label: 'Tự luận ngắn', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Type },
  DRAG: { label: 'Kéo thả', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: ArrowUpDown },
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

const isPreviewImageSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  return src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/') || src.startsWith('http');
};

const compactImageMap = (imageMap) => {
  const entries = Object.entries(imageMap || {}).filter(([, value]) => Boolean(value));
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

function serializeDragAnswer(answerMap, blankIds = []) {
  const keys = blankIds.length > 0 ? blankIds : Object.keys(answerMap || {});
  return keys
    .map((key) => {
      const value = answerMap?.[key];
      return value && /^[A-Z]$/.test(value) ? `${key}-${value}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

export default function QuestionEditorCard({ question, index, totalQuestions, allQuestions, onUpdate, onDelete, onReorder, isDragged, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [expanded, setExpanded] = useState(true);
  const [showSolution, setShowSolution] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [selectedImageMarkerId, setSelectedImageMarkerId] = useState(null);

  const q = question;
  const imageMarkers = getInlineImageMarkerIds(q.content);
  const hasImageMarker = imageMarkers.length > 0;
  const activeImageMarkerId = imageMarkers.includes(selectedImageMarkerId)
    ? selectedImageMarkerId
    : (imageMarkers[0] || null);
  const imageMap = parseImageMap(q.image);
  const singleImage = isPreviewImageSrc(q.image)
    ? q.image
    : Object.values(imageMap).find(isPreviewImageSrc);
  const typeStyle = TYPE_STYLES[q.type] || TYPE_STYLES.MCQ;
  const TypeIcon = typeStyle.icon;
  const maAnswerLetters = normalizeMAAnswer(q.answer);
  const dragBlankIds = q.type === 'DRAG' ? getDragBlankIds(q.content) : [];
  const dragAnswerMap = q.type === 'DRAG' ? parseDragAnswer(q.answer) : {};

  // ── Generic field updater ──
  const update = useCallback((field, value) => {
    onUpdate({ ...q, [field]: value });
  }, [q, onUpdate]);

  const updateMultiple = useCallback((updates) => {
    onUpdate({ ...q, ...updates });
  }, [q, onUpdate]);

  const applyImageFile = useCallback((file, markerId = null) => {
    if (!file || !file.type.startsWith('image/')) return;

    if (markerId || imageMarkers.length > 0) {
      const targetMarker = markerId || imageMarkers[0];
      const nextImageMap = { ...parseImageMap(q.image) };
      if (nextImageMap.default && imageMarkers.length > 0 && !imageMarkers.some(id => nextImageMap[id])) {
        nextImageMap[imageMarkers[0]] = nextImageMap.default;
      }
      delete nextImageMap.default;
      nextImageMap[targetMarker] = URL.createObjectURL(file);

      updateMultiple({
        image: compactImageMap(nextImageMap),
        imageFiles: { ...(q.imageFiles || {}), [targetMarker]: file },
      });
      return;
    }

    updateMultiple({ imageFile: file, image: URL.createObjectURL(file) });
  }, [imageMarkers, q.image, q.imageFiles, updateMultiple]);

  const removeMarkerImage = useCallback((markerId) => {
    const nextImageMap = { ...parseImageMap(q.image) };
    delete nextImageMap.default;
    delete nextImageMap[markerId];

    const nextImageFiles = { ...(q.imageFiles || {}) };
    delete nextImageFiles[markerId];

    updateMultiple({
      image: compactImageMap(nextImageMap),
      imageFiles: Object.keys(nextImageFiles).length > 0 ? nextImageFiles : undefined,
    });
  }, [q.image, q.imageFiles, updateMultiple]);

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
    if (q.type === 'MCQ') {
      if (q.answer === removedLetter) {
        newAnswer = 'A';
      } else if (OPTION_LETTERS.indexOf(q.answer) > i) {
        newAnswer = OPTION_LETTERS[OPTION_LETTERS.indexOf(q.answer) - 1];
      }
    } else if (q.type === 'MA') {
      newAnswer = maAnswerLetters.reduce((letters, letter) => {
        const answerIndex = OPTION_LETTERS.indexOf(letter);
        if (answerIndex === i) return letters;
        letters.push(answerIndex > i ? OPTION_LETTERS[answerIndex - 1] : letter);
        return letters;
      }, []).sort().join(',');
    } else if (q.type === 'DRAG') {
      const nextAnswerMap = Object.entries(dragAnswerMap).reduce((map, [blankId, letter]) => {
        const answerIndex = OPTION_LETTERS.indexOf(letter);
        if (answerIndex === i) return map;
        map[blankId] = answerIndex > i ? OPTION_LETTERS[answerIndex - 1] : letter;
        return map;
      }, {});
      newAnswer = serializeDragAnswer(nextAnswerMap, dragBlankIds);
    }
    onUpdate({ ...q, options: newOpts, answer: newAnswer });
  };

  const handleMAToggleAnswer = (letter) => {
    const next = new Set(maAnswerLetters);
    if (next.has(letter)) next.delete(letter);
    else next.add(letter);
    update('answer', [...next].sort().join(','));
  };

  const handleDragAnswerChange = (blankId, letter) => {
    const nextAnswerMap = { ...dragAnswerMap };
    if (letter) nextAnswerMap[blankId] = letter;
    else delete nextAnswerMap[blankId];
    update('answer', serializeDragAnswer(nextAnswerMap, dragBlankIds));
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
    if (newType === 'MCQ') {
      if (!q.options || q.options.length === 0) {
        base.options = ['', '', '', ''];
      }
      base.answer = normalizeMAAnswer(q.answer)[0] || 'A';
    }
    if (newType === 'MA') {
      if (!q.options || q.options.length === 0) {
        base.options = ['', '', '', ''];
      }
      base.answer = normalizeMAAnswer(q.answer).join(',');
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
    if (newType === 'DRAG') {
      if (!q.options || q.options.length === 0) {
        base.options = ['', '', '', '', ''];
      }
      base.answer = q.answer || '1-A';
      if (!q.content) {
        base.content = 'Kéo thả đáp án vào ô trống: [[1]]';
      }
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
    applyImageFile(file, activeImageMarkerId);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          applyImageFile(file, activeImageMarkerId);
          break;
        }
      }
    }
  };

  return (
    <div 
      id={`editor-question-${q.id}`}
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
        {q.type === 'TEXT' && (
          <BookOpen className="w-4 h-4 text-white/30 shrink-0" />
        )}
        <select
          value={index}
          onChange={(e) => {
            e.stopPropagation();
            if (onReorder) onReorder(index, Number(e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          className="px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-bold focus:outline-none focus:border-indigo-500/40 hover:border-white/20 hover:text-white/70 transition-all appearance-none cursor-pointer"
          style={{ minWidth: 62, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 4 18 9'/%3E%3Cpolyline points='6 15 12 20 18 15'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '14px', paddingRight: 20 }}
          title="Chọn vị trí để sắp xếp lại"
        >
          {Array.from({ length: totalQuestions || 0 }, (_, i) => (
            <option key={i} value={i} className="bg-[#14142a]">
              Câu {i + 1}
            </option>
          ))}
        </select>

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

          {/* ── MA Options ── */}
          {q.type === 'MA' && (
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                Đáp án <span className="text-white/15 normal-case">(có thể chọn nhiều đáp án đúng)</span>
              </label>
              <div className="space-y-2">
                {(q.options || []).map((opt, i) => {
                  const letter = OPTION_LETTERS[i];
                  const isCorrect = maAnswerLetters.includes(letter);
                  return (
                    <div key={i} className="flex items-center gap-2 group">
                      <button onClick={() => handleMAToggleAnswer(letter)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
                          isCorrect
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/20'
                            : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60 hover:border-white/20'
                        }`}
                        title={isCorrect ? 'Đáp án đúng' : 'Chọn làm đáp án đúng'}>
                        {letter}
                      </button>
                      <input type="text" value={opt} onChange={e => handleOptionChange(i, e.target.value)}
                        placeholder={`Nhập đáp án ${letter}...`}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none transition-all ${
                          isCorrect
                            ? 'bg-sky-500/5 border-sky-500/20 text-white focus:border-sky-500/40'
                            : 'bg-white/5 border-white/10 text-white/80 placeholder-white/20 focus:border-indigo-500/50'
                        }`} />
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
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-sky-300 hover:bg-sky-500/10 transition-colors border border-transparent hover:border-sky-500/20">
                <Plus className="w-3 h-3" /> Thêm đáp án
              </button>
            </div>
          )}

          {/* ── DRAG Options ── */}
          {q.type === 'DRAG' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                  Ngân hàng đáp án kéo thả
                </label>
                <div className="space-y-2">
                  {(q.options || []).map((opt, i) => {
                    const letter = OPTION_LETTERS[i];
                    return (
                      <div key={i} className="flex items-center gap-2 group">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 flex-shrink-0">
                          {letter}
                        </span>
                        <input type="text" value={opt} onChange={e => handleOptionChange(i, e.target.value)}
                          placeholder={`Đáp án kéo thả ${letter}...`}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-all" />
                        {(q.options || []).length > 1 && (
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
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors border border-transparent hover:border-cyan-500/20">
                  <Plus className="w-3 h-3" /> Thêm đáp án kéo thả
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                  Đáp án đúng <span className="text-white/15 normal-case">(lấy tự động từ các ô [[1]], [[2]] trong nội dung)</span>
                </label>
                {dragBlankIds.length > 0 ? (
                  <div className="space-y-2">
                    {dragBlankIds.map((blankId) => {
                      const selectedLetter = dragAnswerMap[blankId] || '';
                      return (
                        <div key={blankId} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <span className="inline-flex w-fit items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                            [[{blankId}]]
                          </span>
                          <select
                            value={selectedLetter}
                            onChange={e => handleDragAnswerChange(blankId, e.target.value)}
                            className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-[#10182a] border border-white/10 text-white/80 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
                          >
                            <option value="" className="bg-[#14142a]">Chưa chọn đáp án</option>
                            {(q.options || []).map((opt, i) => {
                              const letter = OPTION_LETTERS[i];
                              const usedByOtherBlank = Object.entries(dragAnswerMap).some(([key, value]) => key !== blankId && value === letter);
                              return (
                                <option key={letter} value={letter} disabled={usedByOtherBlank} className="bg-[#14142a]">
                                  {letter} - {opt || 'Chưa nhập nội dung đáp án'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                    <div className="text-[11px] text-white/25">
                      Đang lưu dạng: <span className="font-mono text-cyan-300/80">{serializeDragAnswer(dragAnswerMap, dragBlankIds) || 'Chưa chọn'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Thêm ô thả vào nội dung câu hỏi bằng cú pháp [[1]], [[2]] để chọn đáp án đúng tại đây.
                  </div>
                )}
              </div>
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
            {(q.needsImageReview || hasImageMarker) && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {q.needsImageReview
                    ? (q.aiImageNote || 'AI phát hiện câu này có hình. Vui lòng kiểm tra hoặc tải ảnh đúng trước khi lưu.')
                    : 'Nội dung có ký hiệu ảnh như ((1)), ((2)). Vui lòng kiểm tra và tải ảnh minh hoạ tương ứng trước khi lưu.'}
                </span>
              </div>
            )}
            {hasImageMarker ? (
              <>
                <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {imageMarkers.map((markerId) => {
                    const markerImage = imageMap[markerId] || (markerId === imageMarkers[0] ? imageMap.default : null);
                    const hasMarkerImage = isPreviewImageSrc(markerImage);
                    const isActiveImageMarker = markerId === activeImageMarkerId;

                    return (
                      <div
                        key={markerId}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedImageMarkerId(markerId)}
                        onFocus={() => setSelectedImageMarkerId(markerId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedImageMarkerId(markerId);
                          }
                        }}
                        className={`rounded-xl border p-3 transition-all ${
                          isActiveImageMarker
                            ? 'border-indigo-500/70 bg-indigo-500/15 shadow-sm shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                            : 'border-white/10 bg-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-lg border px-2 py-1 font-mono text-xs font-bold ${
                              isActiveImageMarker
                                ? 'border-indigo-400/70 bg-indigo-500/25 text-indigo-200'
                                : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                            }`}>
                              (({markerId}))
                            </span>
                            {isActiveImageMarker && (
                              <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          {hasMarkerImage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMarkerImage(markerId);
                              }}
                              className="rounded-lg p-1.5 text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title={`Xoá ảnh vị trí ${markerId}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <label className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-all ${
                          isActiveImageMarker
                            ? 'border-indigo-400/60 bg-indigo-950/20 text-indigo-200 hover:bg-indigo-500/20'
                            : 'border-white/10 bg-white/5 text-white/40 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300'
                        }`}>
                          {hasMarkerImage ? (
                            <Image
                              src={markerImage}
                              alt={`Ảnh vị trí ${markerId}`}
                              width={260}
                              height={150}
                              unoptimized
                              className="max-h-28 w-auto max-w-full rounded-lg object-contain"
                            />
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5" />
                              <span className="text-xs font-medium">Chọn ảnh cho vị trí {markerId}</span>
                            </>
                          )}
                          <span className="text-[11px] font-medium text-white/30">
                            {hasMarkerImage ? 'Bấm để đổi ảnh hoặc Ctrl+V để dán ảnh' : `Bấm để tải ảnh ((${markerId})) hoặc Ctrl+V để dán ảnh`}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              setSelectedImageMarkerId(markerId);
                              applyImageFile(e.target.files?.[0], markerId);
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="max-w-3xl text-[11px] leading-relaxed text-white/30">
                  Đang chọn (({activeImageMarkerId})). Bấm ô khác hoặc Ctrl+V để dán ảnh vào đúng vị trí.
                </p>
              </>
            ) : (
              <>
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
                    {isDragging ? 'Thả ảnh vào đây...' : (singleImage ? 'Kéo thả, click hoặc Ctrl+V để đổi ảnh khác' : 'Kéo thả, click hoặc Ctrl+V để tải ảnh minh hoạ lên')}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => applyImageFile(e.target.files?.[0])} />
                </label>

                {singleImage && (
                  <div className="relative w-fit">
                    <Image src={singleImage} alt="Preview" width={320} height={192} unoptimized className="max-w-xs max-h-48 rounded-xl border border-white/10 object-contain bg-white/5" />
                    <button onClick={() => { updateMultiple({ imageFile: null, image: null }); }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      title="Xoá ảnh">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
