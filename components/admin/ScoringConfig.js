'use client';

import { useState } from 'react';
import {
  Trophy, Save, RotateCcw, Info, ChevronDown, ChevronRight,
  GraduationCap, Calculator, CheckCircle2, ToggleLeft, Type
} from 'lucide-react';

// ── Scoring presets matching the product spec ──
const PRESETS = [
  {
    id: 'thpt_toan',
    name: 'THPT Toán',
    examType: 'THPT',
    subject: 'Toán',
    description: '12 MCQ + 4 TF (×4 lệnh) + 6 SA = 10đ',
    config: {
      mcq: { pointsPerQuestion: 0.25 },
      sa:  { pointsPerQuestion: 0.5 },
      tf:  { scale: [0.1, 0.25, 0.5, 1.0] },  // 1/4 correct → 0.1, 2/4 → 0.25, ...
    },
    breakdown: [
      { type: 'MCQ', count: 12, perQ: '0.25đ', total: '3đ' },
      { type: 'TF',  count: '4 câu × 4 lệnh', perQ: '0.1 / 0.25 / 0.5 / 1.0đ', total: '4đ' },
      { type: 'SA',  count: 6, perQ: '0.5đ', total: '3đ' },
    ],
    totalScore: 10,
  },
  {
    id: 'thpt_ly_hoa',
    name: 'THPT Lý & Hoá',
    examType: 'THPT',
    subject: 'Lý / Hoá',
    description: '18 MCQ + 4 TF (×4 lệnh) + 6 SA = 10đ',
    config: {
      mcq: { pointsPerQuestion: 0.25 },
      sa:  { pointsPerQuestion: 0.25 },
      tf:  { scale: [0.1, 0.25, 0.5, 1.0] },
    },
    breakdown: [
      { type: 'MCQ', count: 18, perQ: '0.25đ', total: '4.5đ' },
      { type: 'TF',  count: '4 câu × 4 lệnh', perQ: '0.1 / 0.25 / 0.5 / 1.0đ', total: '4đ' },
      { type: 'SA',  count: 6, perQ: '0.25đ', total: '1.5đ' },
    ],
    totalScore: 10,
  },
  {
    id: 'hsa',
    name: 'HSA',
    examType: 'HSA',
    subject: 'Chung',
    description: 'Mỗi câu đúng tính điểm riêng, TF tính theo lệnh hỏi',
    config: {
      mcq: { pointsPerQuestion: 1 },
      sa:  { pointsPerQuestion: 1 },
      tf:  { scale: [0.25, 0.25, 0.25, 0.25] },  // independent per sub-question
    },
    breakdown: [
      { type: 'MCQ', count: 'Tuỳ đề', perQ: '1đ/câu', total: '—' },
      { type: 'TF',  count: 'Tuỳ đề', perQ: '0.25đ/lệnh hỏi', total: '—' },
      { type: 'SA',  count: 'Tuỳ đề', perQ: '1đ/câu', total: '—' },
    ],
    totalScore: null,
  },
];

export default function ScoringConfig() {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [customConfig, setCustomConfig] = useState({ ...PRESETS[0].config });
  const [isCustom, setIsCustom] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomConfig({ ...preset.config });
    setIsCustom(false);
    setSaved(false);
  };

  const handleConfigChange = (type, field, value) => {
    setIsCustom(true);
    setSaved(false);
    setCustomConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleTfScaleChange = (index, value) => {
    setIsCustom(true);
    setSaved(false);
    const newScale = [...customConfig.tf.scale];
    newScale[index] = Number(value);
    setCustomConfig(prev => ({
      ...prev,
      tf: { ...prev.tf, scale: newScale },
    }));
  };

  const handleReset = () => {
    setCustomConfig({ ...selectedPreset.config });
    setIsCustom(false);
    setSaved(false);
  };

  const handleSave = () => {
    // TODO: persist to Supabase scoring_presets table
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const activeConfig = customConfig;

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Page description */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cấu hình điểm số</h3>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Chọn preset điểm theo kì thi hoặc tuỳ chỉnh thủ công. Cấu hình này sẽ áp dụng mặc định khi tạo đề thi mới.
              Admin có thể override cho từng đề cụ thể.
            </p>
          </div>
        </div>
      </div>

      {/* Preset selector */}
      <div className="space-y-3">
        <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider">Chọn preset</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map(preset => {
            const isActive = selectedPreset.id === preset.id && !isCustom;
            return (
              <button key={preset.id} onClick={() => handleSelectPreset(preset)}
                className={`relative overflow-hidden rounded-2xl p-5 border text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                }`}>
                {/* Glow */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 opacity-10 rounded-full -translate-y-6 translate-x-6" />
                )}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-white/30'}`} />
                    <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/70'}`}>{preset.name}</span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed">{preset.description}</p>
                  {preset.totalScore && (
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className={`text-lg font-black ${isActive ? 'text-indigo-400' : 'text-white/50'}`}>{preset.totalScore}</span>
                      <span className="text-[10px] text-white/30">điểm</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {isCustom && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Bạn đang tuỳ chỉnh — cấu hình đã thay đổi so với preset "{selectedPreset.name}"
          </div>
        )}
      </div>

      {/* Scoring breakdown table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <button onClick={() => setExpandedInfo(!expandedInfo)}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/8 hover:bg-white/[0.02] transition-colors">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Bảng điểm — {selectedPreset.name}
          </span>
          {expandedInfo ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </button>

        {expandedInfo && (
          <div className="animate-fadeIn">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-px bg-white/5">
              {['Loại câu', 'Số câu', 'Điểm / câu', 'Tổng'].map(h => (
                <div key={h} className="px-5 py-2.5 bg-[#0e0e22] text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                  {h}
                </div>
              ))}
            </div>
            {/* Rows */}
            {selectedPreset.breakdown.map((row, i) => {
              const TypeIcon = row.type === 'MCQ' ? CheckCircle2 : row.type === 'TF' ? ToggleLeft : Type;
              return (
                <div key={i} className="grid grid-cols-4 gap-px bg-white/5">
                  <div className="px-5 py-3 bg-[#0c0c20] flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 text-indigo-400/60" />
                    <span className="text-sm font-semibold text-white/80">{row.type}</span>
                  </div>
                  <div className="px-5 py-3 bg-[#0c0c20] text-sm text-white/60">{row.count}</div>
                  <div className="px-5 py-3 bg-[#0c0c20] text-sm text-white/60">{row.perQ}</div>
                  <div className="px-5 py-3 bg-[#0c0c20] text-sm font-bold text-white/80">{row.total}</div>
                </div>
              );
            })}
            {/* Total row */}
            {selectedPreset.totalScore && (
              <div className="grid grid-cols-4 gap-px bg-white/5">
                <div className="col-span-3 px-5 py-3 bg-[#0e0e22] text-sm font-bold text-white/50 text-right uppercase tracking-wider">Tổng điểm</div>
                <div className="px-5 py-3 bg-[#0e0e22]">
                  <span className="text-lg font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{selectedPreset.totalScore}đ</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editable config */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-400" /> Tuỳ chỉnh điểm số
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* MCQ */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" /> MCQ
            </div>
            <div>
              <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1">Điểm / câu</label>
              <input type="number" step={0.05} min={0}
                value={activeConfig.mcq.pointsPerQuestion}
                onChange={e => handleConfigChange('mcq', 'pointsPerQuestion', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
            </div>
          </div>

          {/* SA */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <Type className="w-4 h-4 text-emerald-400" /> Tự luận ngắn (SA)
            </div>
            <div>
              <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1">Điểm / câu</label>
              <input type="number" step={0.05} min={0}
                value={activeConfig.sa.pointsPerQuestion}
                onChange={e => handleConfigChange('sa', 'pointsPerQuestion', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
            </div>
          </div>

          {/* TF */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <ToggleLeft className="w-4 h-4 text-amber-400" /> Đúng / Sai (TF)
            </div>
            <div>
              <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Thang điểm theo số lệnh đúng</label>
              <div className="grid grid-cols-2 gap-2">
                {activeConfig.tf.scale.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 font-mono w-8">{i + 1}/{activeConfig.tf.scale.length}:</span>
                    <input type="number" step={0.05} min={0}
                      value={v}
                      onChange={e => handleTfScaleChange(i, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TF scoring explanation */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">📖 Giải thích thang điểm TF (THPT)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['1/4 lệnh đúng → 0.1đ', '2/4 lệnh đúng → 0.25đ', '3/4 lệnh đúng → 0.5đ', '4/4 lệnh đúng → 1.0đ'].map((text, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/8 text-xs text-white/40 text-center">
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <button onClick={handleReset}
          disabled={!isCustom}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            isCustom
              ? 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
              : 'bg-white/[0.02] text-white/15 border-white/5 cursor-not-allowed'
          }`}>
          <RotateCcw className="w-4 h-4" /> Reset về preset
        </button>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${
            saved
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-emerald-500/25 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 text-white'
          }`}>
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Đã lưu!</>
          ) : (
            <><Save className="w-4 h-4" /> Lưu cấu hình</>
          )}
        </button>
      </div>
    </div>
  );
}
