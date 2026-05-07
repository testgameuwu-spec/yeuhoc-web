'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Edit3, Loader2, Plus, Power, Search, Trash2, XCircle
} from 'lucide-react';
import { deleteTargetExam, getTargetExams, saveTargetExam } from '@/lib/targetExamStore';

const emptyForm = {
  id: null,
  name: '',
  examDate: '',
  isActive: true,
};

function formatDate(dateString) {
  if (!dateString) return 'Chưa đặt ngày';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('vi-VN');
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = dateString.split('-').map(Number);
  const examDate = new Date(year, month - 1, day);
  return Math.round((examDate - todayLocal) / 86400000);
}

function countdownLabel(dateString) {
  const diff = daysUntil(dateString);
  if (diff === null) return 'Chưa đặt ngày';
  if (diff === 0) return 'Diễn ra hôm nay';
  if (diff > 0) return `Còn ${diff} ngày`;
  return `Đã diễn ra ${Math.abs(diff)} ngày trước`;
}

export default function TargetExamManagement({ showAlert, showConfirm }) {
  const [targetExams, setTargetExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const fetchTargetExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTargetExams({ includeInactive: true });
      setTargetExams(data);
    } catch (error) {
      showAlert?.('Lỗi tải kỳ thi', `${error.message}\n\nHãy chạy migration tạo bảng target_exams trên Supabase.`);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTargetExams();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTargetExams]);

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targetExams;
    return targetExams.filter((exam) => exam.name.toLowerCase().includes(q));
  }, [search, targetExams]);

  const upcomingCount = targetExams.filter((exam) => exam.isActive && daysUntil(exam.examDate) >= 0).length;
  const activeCount = targetExams.filter((exam) => exam.isActive).length;

  const openCreateForm = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (exam) => {
    setForm({
      id: exam.id,
      name: exam.name,
      examDate: exam.examDate,
      isActive: exam.isActive,
    });
    setFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || !form.examDate) {
      showAlert?.('Thiếu thông tin', 'Vui lòng nhập tên kỳ thi và ngày thi.');
      return;
    }

    setSaving(true);
    try {
      await saveTargetExam({ ...form, name });
      setFormOpen(false);
      setForm(emptyForm);
      await fetchTargetExams();
      showAlert?.('Thành công', 'Đã lưu kỳ thi mục tiêu.');
    } catch (error) {
      showAlert?.('Lỗi lưu kỳ thi', error.message || 'Không thể lưu kỳ thi mục tiêu.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (exam) => {
    try {
      await saveTargetExam({ ...exam, isActive: !exam.isActive });
      await fetchTargetExams();
      showAlert?.('Thành công', exam.isActive ? 'Đã tắt kỳ thi.' : 'Đã bật kỳ thi.');
    } catch (error) {
      showAlert?.('Lỗi cập nhật', error.message || 'Không thể cập nhật trạng thái kỳ thi.');
    }
  };

  const handleDelete = (exam) => {
    showConfirm?.(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa kỳ thi "${exam.name}"?\n\nCác lựa chọn của user gắn với kỳ thi này cũng sẽ bị xóa.`,
      async () => {
        try {
          await deleteTargetExam(exam.id);
          await fetchTargetExams();
          showAlert?.('Thành công', 'Đã xóa kỳ thi mục tiêu.');
        } catch (error) {
          showAlert?.('Lỗi xóa kỳ thi', error.message || 'Không thể xóa kỳ thi mục tiêu.');
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/35">Tổng kỳ thi</p>
          <p className="mt-2 text-3xl font-black text-white">{targetExams.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/70">Đang bật</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-300/70">Sắp diễn ra</p>
          <p className="mt-2 text-3xl font-black text-indigo-300">{upcomingCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              Kỳ thi mục tiêu
            </h2>
            <p className="text-sm text-white/40 mt-1">Quản lý danh sách kỳ thi để user chọn làm mục tiêu ôn luyện.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kỳ thi..."
                className="w-full sm:w-64 pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-400 hover:to-purple-500 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tạo kỳ thi
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="divide-y divide-white/10">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white truncate">{exam.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                      exam.isActive
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        : 'bg-white/5 text-white/35 border-white/10'
                    }`}>
                      {exam.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/45">
                    <span>{formatDate(exam.examDate)}</span>
                    <span>{countdownLabel(exam.examDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(exam)}
                    className={`p-2 rounded-xl border transition-colors ${
                      exam.isActive
                        ? 'text-amber-300 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15'
                        : 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                    }`}
                    title={exam.isActive ? 'Tắt kỳ thi' : 'Bật kỳ thi'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(exam)}
                    className="p-2 rounded-xl text-indigo-300 border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 transition-colors"
                    title="Sửa kỳ thi"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam)}
                    className="p-2 rounded-xl text-rose-300 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 transition-colors"
                    title="Xóa kỳ thi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <CalendarDays className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-white/50">Chưa có kỳ thi mục tiêu nào.</p>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#14142a] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5">{form.id ? 'Chỉnh sửa kỳ thi' : 'Tạo kỳ thi mục tiêu'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Tên kỳ thi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="VD: THPT Quốc gia 2026"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Ngày thi</label>
                <input
                  type="date"
                  value={form.examDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, examDate: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <span>
                  <span className="block text-sm font-semibold text-white">Đang active</span>
                  <span className="block text-xs text-white/35 mt-0.5">User có thể chọn kỳ thi này.</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="w-5 h-5 accent-indigo-500"
                />
              </label>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
