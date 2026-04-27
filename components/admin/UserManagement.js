'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users, Search, MoreVertical, Trash2, Shield, ShieldCheck,
  Mail, Calendar, Activity, UserPlus, ChevronDown, Ban,
  TrendingUp, Award, Clock, History, X, BookOpen, ChevronRight
} from 'lucide-react';
import QuestionCard from '@/components/QuestionCard';
import Pagination from '@/components/Pagination';

const ROLE_STYLES = {
  admin: {
    label: 'Admin',
    classes: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: ShieldCheck,
  },
  student: {
    label: 'Học sinh',
    classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    icon: Shield,
  },
};

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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | attempts | createdAt
  const [openMenu, setOpenMenu] = useState(null);
  const [filterRole, setFilterRole] = useState('all'); // all | admin | user
  const [historyUser, setHistoryUser] = useState(null); // Trạng thái cho modal lịch sử
  const [userAttempts, setUserAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchUsers();

    // Lắng nghe thay đổi real-time từ Supabase
    const profilesChannel = supabase
      .channel('realtime_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers(false); // Không cần hiện loading spinner khi update ngầm
      })
      .subscribe();

    const attemptsChannel = supabase
      .channel('realtime_attempts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, () => {
        fetchUsers(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(attemptsChannel);
    };
  }, []);

  const fetchWithTimeout = (promise, ms = 8000) => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), ms));
    return Promise.race([promise, timeout]);
  };

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: profiles, error } = await fetchWithTimeout(
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      );
        
      const { data: attempts } = await fetchWithTimeout(
        supabase.from('exam_attempts').select('user_id')
      );

      const attemptCounts = {};
      if (attempts) {
        attempts.forEach(a => {
          attemptCounts[a.user_id] = (attemptCounts[a.user_id] || 0) + 1;
        });
      }
        
      if (error) {
        console.error("Fetch profiles error:", error);
      } else if (profiles) {
        setUsers(profiles.map(u => ({
          id: u.id,
          name: u.full_name || 'Người dùng ẩn danh',
          email: u.email,
          role: u.role,
          createdAt: new Date(u.created_at).toLocaleDateString('vi-VN'),
          attempts: attemptCounts[u.id] || 0,
          avatar: null,
          is_banned: u.is_banned || false
        })));
      }
    } catch (err) {
      console.error("Lỗi ngoại lệ khi fetch users:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      showAlert("Lỗi", error.message + "\n(Có thể do chưa cấp quyền Admin update trong RLS Policy)");
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showAlert('Thành công', `Đã đổi vai trò thành ${newRole === 'admin' ? 'Admin' : 'Học sinh'}!`);
    }
    setOpenMenu(null);
  };

  const handleToggleBan = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) {
      showAlert('Lỗi', error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
      showAlert('Thành công', `Đã ${!currentStatus ? 'khóa' : 'mở khóa'} tài khoản này!`);
    }
    setOpenMenu(null);
  };

  const handleDeleteUser = async (userId) => {
    showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này? Thao tác này không thể hoàn tác!', async () => {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
      
      if (error) {
        if (error.message && error.message.includes('does not exist')) {
          showAlert("Lỗi", "Bạn chưa tạo hàm xóa trên Supabase. Vui lòng chạy đoạn SQL (delete_user_by_admin) trong mục SQL Editor!");
        } else {
          showAlert("Lỗi khi xóa", error.message);
        }
      } else {
        setUsers(users.filter(u => u.id !== userId));
        showAlert("Thành công", "Đã xóa hoàn toàn tài khoản khỏi hệ thống (có thể đăng ký lại email này)!");
      }
    });
    setOpenMenu(null);
  };

  useEffect(() => {
    if (historyUser) {
      const fetchAttempts = async () => {
        setLoadingAttempts(true);
        const { data, error } = await supabase
          .from('exam_attempts')
          .select(`
            *,
            exams (
              title,
              subject
            )
          `)
          .eq('user_id', historyUser.id)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setUserAttempts(data);
        }
        setLoadingAttempts(false);
      };
      fetchAttempts();
    } else {
      setUserAttempts([]);
      setSelectedAttempt(null);
      setAttemptDetails(null);
    }
  }, [historyUser]);

  const handleViewAttemptDetails = async (attempt) => {
    setSelectedAttempt(attempt);
    setLoadingDetails(true);
    const { data: examData, error } = await supabase
      .from('exams')
      .select('*, questions(*)')
      .eq('id', attempt.exam_id)
      .single();
    
    if (examData) {
      setAttemptDetails({
        exam: examData,
        answers: attempt.user_answers || {}
      });
    } else {
      showAlert("Lỗi", "Tải chi tiết đề thi thất bại hoặc đề thi đã bị xóa.");
    }
    setLoadingDetails(false);
  };

  const enrichedUsers = users;

  const filtered = enrichedUsers
    .filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'attempts') return b.attempts - a.attempts;
      if (sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const visibleUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, sortBy]);

  const totalAttempts = users.reduce((s, u) => s + (u.attempts || 0), 0);
  const avgAttempts = users.length > 0 ? (totalAttempts / users.length).toFixed(1) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng người dùng', value: users.length, color: 'from-indigo-500 to-purple-500', icon: Users },
          { label: 'Tổng lượt thi', value: totalAttempts, color: 'from-emerald-500 to-cyan-500', icon: Activity },
          { label: 'TB lượt/người', value: avgAttempts, color: 'from-amber-500 to-orange-500', icon: TrendingUp },
          { label: 'Tích cực nhất', value: users.length > 0 ? users.reduce((max, u) => u.attempts > max.attempts ? u : max, users[0]).name.split(' ').pop() : '—', color: 'from-pink-500 to-rose-500', icon: Award },
        ].map(stat => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
            <div className="relative flex items-center gap-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-white/40 font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm người dùng..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          {/* Role filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'student', label: 'Học sinh' },
              { key: 'admin', label: 'Admin' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterRole(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRole === f.key ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/60'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">Sắp xếp:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white/70 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
            <option value="name" className="bg-[#14142a]">Tên</option>
            <option value="attempts" className="bg-[#14142a]">Lượt thi</option>
            <option value="createdAt" className="bg-[#14142a]">Ngày tham gia</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] pb-24 overflow-visible">
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_100px_100px_56px] gap-4 px-6 py-3 border-b border-white/10 text-xs font-semibold text-white/30 uppercase tracking-wider">
          <span>Người dùng</span>
          <span>Email</span>
          <span>Lượt thi</span>
          <span>Vai trò</span>
          <span></span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-white/40">Đang tải danh sách người dùng...</p>
          </div>
        ) : visibleUsers.length > 0 ? visibleUsers.map(user => {
          const role = ROLE_STYLES[user.role] || ROLE_STYLES.student;
          const RoleIcon = role.icon;
          const initials = user.name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

          return (
            <div key={user.id}
              className="grid grid-cols-[1fr_140px_100px_100px_56px] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors items-center group">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold transition-colors ${user.is_banned ? 'text-white/40 line-through' : 'text-white/90 group-hover:text-white'}`}>
                      {user.name}
                    </p>
                    {user.is_banned && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Bị khóa</span>}
                  </div>
                  <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {user.createdAt}
                  </p>
                </div>
              </div>
              {/* Email */}
              <span className="text-xs text-white/50 truncate" title={user.email}>{user.email}</span>
              {/* Attempts */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 max-w-[60px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${Math.min(100, (user.attempts / Math.max(1, ...users.map(u => u.attempts))) * 100)}%` }} />
                </div>
                <span className="text-sm text-white/60 font-medium">{user.attempts}</span>
              </div>
              {/* Role */}
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${role.classes}`}>
                  <RoleIcon className="w-3 h-3" />
                  {role.label}
                </span>
              </div>
              {/* Actions */}
              <div className="relative">
                <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenu === user.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-white/10 bg-[#14142a] shadow-2xl shadow-black/50 py-1 animate-scaleIn">
                      <button onClick={() => { setHistoryUser(user); setOpenMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <History className="w-3.5 h-3.5" /> Lịch sử làm bài
                      </button>
                      <button onClick={() => handleToggleRole(user.id, user.role)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <ShieldCheck className="w-3.5 h-3.5" /> Đổi vai trò ({user.role === 'admin' ? 'Hạ quyền' : 'Lên Admin'})
                      </button>
                      <button onClick={() => handleToggleBan(user.id, user.is_banned)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${user.is_banned ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'}`}>
                        <Ban className="w-3.5 h-3.5" /> {user.is_banned ? 'Mở khóa tài khoản' : 'Khoá tài khoản'}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/5">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa tài khoản
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-sm text-white/40">Không tìm thấy người dùng nào</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="mt-4 mb-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            variant="dark"
          />
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-white/20">
          Hiển thị {filtered.length} / {users.length} người dùng
        </p>
      </div>
      {/* History Modal */}
      {historyUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl rounded-2xl bg-[#14142a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-white">Lịch sử làm bài</h3>
                <p className="text-sm text-white/40">Học sinh: {historyUser.name} ({historyUser.email})</p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {selectedAttempt ? (
                <div>
                  <button onClick={() => { setSelectedAttempt(null); setAttemptDetails(null); }} className="mb-4 text-xs font-semibold text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                    <X className="w-3 h-3" /> Quay lại danh sách
                  </button>
                  {loadingDetails ? (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-white/60">Đang tải chi tiết bài làm...</p>
                    </div>
                  ) : attemptDetails?.exam?.questions ? (
                    <div className="space-y-6">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                        <h4 className="font-bold text-white mb-2">{attemptDetails.exam.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <span>Điểm: <span className="font-bold text-emerald-400">{selectedAttempt.score?.toFixed(1)}</span></span>
                          <span>Đúng: <span className="font-bold text-white/90">{selectedAttempt.correct_answers}/{selectedAttempt.total_questions}</span></span>
                          <span>Thời gian: {Math.floor(selectedAttempt.time_spent / 60)}p {selectedAttempt.time_spent % 60}s</span>
                        </div>
                      </div>
                      {attemptDetails.exam.questions.map((q, i) => (
                        <div key={q.id || i} className="bg-white rounded-xl overflow-hidden">
                          <QuestionCard
                            question={q}
                            index={i}
                            selectedAnswer={attemptDetails.answers[q.id] || (q.type === 'TF' ? {} : '')}
                            onAnswerChange={() => {}}
                            showResult
                            disabled
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-white/40">Không có dữ liệu chi tiết cho bài thi này.</div>
                  )}
                </div>
              ) : loadingAttempts ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-white/60">Đang tải lịch sử làm bài...</p>
                </div>
              ) : userAttempts.length > 0 ? (
                <div className="space-y-4">
                  {userAttempts.map(attempt => (
                    <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{attempt.exams?.title || 'Đề thi đã bị xóa'}</h4>
                        <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {attempt.exams?.subject || 'Không rõ'}</span>
                          <span>•</span>
                          <span>{new Date(attempt.created_at).toLocaleDateString('vi-VN')} {new Date(attempt.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-white/30 mb-0.5">Số điểm</p>
                          <p className="font-black text-emerald-400">{attempt.score?.toFixed(1) || 0}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                          <p className="text-xs text-white/30 mb-0.5">Đúng</p>
                          <p className="font-bold text-white/90">{attempt.correct_answers}/{attempt.total_questions}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                          <p className="text-xs text-white/30 mb-0.5">Thời gian</p>
                          <p className="font-bold text-white/90">{Math.floor(attempt.time_spent / 60)}p {attempt.time_spent % 60}s</p>
                        </div>
                        <button
                          onClick={() => handleViewAttemptDetails(attempt)}
                          className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1"
                        >
                          Chi tiết <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/60 font-medium">Học sinh chưa có lịch sử làm bài</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button onClick={() => setHistoryUser(null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
    </div>
  );
}
