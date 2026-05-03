'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Search, RefreshCw, Calendar } from 'lucide-react';

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    fetchTransactions();

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

      <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, tên user, mã thanh toán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-white/70">
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
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-white/40">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-white/40">
                    Không tìm thấy giao dịch nào. Nếu bạn chưa chạy lệnh SQL tạo bảng, hãy chạy file tạo bảng trong thư mục migrations.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
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
                              <img src={tx.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
