'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Search, RefreshCw, Calendar, CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react';

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reidentifying, setReidentifying] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message, details }
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sepay_transactions')
        .select('*, profiles(full_name, email, avatar_url)')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        // Supabase có thể trả lỗi nếu chưa có bảng, do đó ta ko crash app
        setTransactions([]);
        return;
      }
      setTransactions(data || []);
    } catch (error) {
      console.error('Exception fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFetchTimer = setTimeout(fetchTransactions, 0);

    const channel = supabase
      .channel('sepay_transactions_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sepay_transactions' },
        (payload) => {
          // When a new transaction comes in, add it to the top of the list
          // Lấy thêm thông tin profile cho giao dịch mới
          if (payload.new.user_id) {
            supabase.from('profiles').select('full_name, email, avatar_url').eq('id', payload.new.user_id).single()
              .then(({ data: profileData }) => {
                 const newTx = { ...payload.new, profiles: profileData };
                 setTransactions((prev) => [newTx, ...prev]);
              });
          } else {
             setTransactions((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialFetchTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTransactions = transactions.filter(t => 
    t.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.account_number?.includes(searchTerm) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/10 p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <CreditCard className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Lịch sử giao dịch (SePay)
            </h2>
            <p className="text-sm text-white/60 max-w-xl">
              Quản lý các thông báo biến động số dư được gửi tự động từ SePay qua Webhooks.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setReidentifying(true);
                setToast(null);
                try {
                  const res = await fetch('/api/admin/reidentify-transactions', { method: 'POST' });
                  const result = await res.json();
                  if (result.success) {
                    setToast({
                      type: 'success',
                      message: result.updated > 0
                        ? `Đã nhận diện thành công ${result.updated} giao dịch!`
                        : 'Không có giao dịch nào cần nhận diện.',
                      details: `${result.updated}/${result.total} giao dịch được cập nhật`
                    });
                    if (result.updated > 0) fetchTransactions();
                  } else {
                    setToast({ type: 'error', message: 'Lỗi nhận diện', details: result.message || 'Không rõ nguyên nhân' });
                  }
                } catch (e) {
                  setToast({ type: 'error', message: 'Lỗi kết nối', details: e.message });
                } finally {
                  setReidentifying(false);
                  setTimeout(() => setToast(null), 6000);
                }
              }}
              disabled={reidentifying || loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium transition-colors"
              title="Nhận diện lại user cho các giao dịch đang hiện 'Khách vãng lai'"
            >
              <UserCheck className={`w-4 h-4 ${reidentifying ? 'animate-pulse' : ''}`} />
              {reidentifying ? 'Đang xử lý...' : 'Nhận diện lại'}
            </button>
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 animate-fadeIn transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <AlertCircle className="w-5 h-5 text-red-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
              {toast.message}
            </p>
            {toast.details && (
              <p className="text-xs text-white/50 mt-0.5">{toast.details}</p>
            )}
          </div>
          <button onClick={() => setToast(null)} className="text-white/30 hover:text-white/60 transition-colors p-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col" style={{ maxHeight: '70vh', minHeight: 300 }}>
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, tên user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/40">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/40 text-sm">
              Không tìm thấy giao dịch nào. Nếu bạn chưa chạy lệnh SQL tạo bảng, hãy chạy file tạo bảng trong thư mục migrations.
            </div>
          ) : (
            <>
              {/* ── MOBILE: Card Layout ── */}
              <div className="sm:hidden divide-y divide-white/5">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-white/5 transition-colors space-y-3">
                    {/* Row 1: User + Amount */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {tx.profiles ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                              {tx.profiles.avatar_url ? (
                                <Image src={tx.profiles.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-indigo-400 font-bold text-xs">{tx.profiles.full_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white/90 text-sm truncate">{tx.profiles.full_name}</div>
                              <div className="text-[10px] text-white/40 truncate">{tx.profiles.email}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <span className="text-white/30 text-xs">?</span>
                            </div>
                            <span className="text-white/40 italic text-sm">Khách vãng lai</span>
                          </>
                        )}
                      </div>
                      <div className={`font-bold text-base flex items-center gap-1 shrink-0 ${tx.transfer_type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.transfer_type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        {tx.transfer_type === 'in' ? '+' : '-'}
                        {new Intl.NumberFormat('vi-VN').format(tx.transfer_amount)}đ
                      </div>
                    </div>

                    {/* Row 2: Content */}
                    <div className="text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2 break-all">
                      {tx.content || '—'}
                    </div>

                    {/* Row 3: Time + Bank */}
                    <div className="flex items-center justify-between text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tx.transaction_date).toLocaleString('vi-VN')}
                      </span>
                      <span>{tx.gateway} {tx.code ? `· ${tx.code}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP: Table Layout ── */}
              <table className="hidden sm:table w-full text-left text-sm text-white/70">
                <thead className="text-xs uppercase bg-white/5 text-white/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">Thời gian</th>
                    <th className="px-4 py-3 font-medium">Người gửi</th>
                    <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                    <th className="px-4 py-3 font-medium">Nội dung</th>
                    <th className="px-4 py-3 font-medium">Ngân hàng / Mã GD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-white/80">
                          <Calendar className="w-4 h-4 text-white/40" />
                          {new Date(tx.transaction_date).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tx.profiles ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                              {tx.profiles.avatar_url ? (
                                <Image src={tx.profiles.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-indigo-400 font-bold text-xs">{tx.profiles.full_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white/90">{tx.profiles.full_name}</div>
                              <div className="text-[10px] text-white/40">{tx.profiles.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/40 italic flex items-center gap-1">Khách vãng lai</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className={`font-bold flex items-center justify-end gap-1 ${tx.transfer_type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.transfer_type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          {tx.transfer_type === 'in' ? '+' : '-'}
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.transfer_amount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-white/80" title={tx.content}>
                        {tx.content}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white/70">{tx.gateway}</div>
                        <div className="text-[10px] text-white/30 truncate max-w-[120px]">#{tx.id} {tx.code ? `- ${tx.code}` : ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
