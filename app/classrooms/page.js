'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Search, BookOpen, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import GlobalSiteWrapper from '@/components/GlobalSiteWrapper';

export default function StudentClassrooms() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchMyClassrooms();
  }, []);

  const fetchMyClassrooms = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch classrooms the user is a member of
      const { data, error } = await supabase
        .from('classroom_members')
        .select(`
          status,
          classrooms (
            id,
            name,
            description,
            profiles:teacher_id (full_name)
          )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setClassrooms(data || []);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Find classroom by code
      const { data: clsData, error: clsError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (clsError || !clsData) {
        alert('Mã lớp học không hợp lệ hoặc lớp không tồn tại.');
        setIsJoining(false);
        return;
      }

      // Check if already requested/joined
      const { data: existingMember } = await supabase
        .from('classroom_members')
        .select('status')
        .eq('classroom_id', clsData.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        alert(`Bạn đã tham gia hoặc gửi yêu cầu tham gia lớp này rồi (Trạng thái: ${existingMember.status}).`);
        setIsJoining(false);
        return;
      }

      // Insert request
      const { error: joinError } = await supabase
        .from('classroom_members')
        .insert({
          classroom_id: clsData.id,
          user_id: user.id,
          status: 'pending' // requires teacher approval
        });

      if (joinError) throw joinError;

      alert(`Đã gửi yêu cầu tham gia lớp "${clsData.name}". Vui lòng chờ giáo viên duyệt.`);
      setJoinCode('');
      fetchMyClassrooms();
    } catch (error) {
      console.error('Join class error:', error);
      alert('Đã xảy ra lỗi: ' + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <GlobalSiteWrapper>
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 max-w-6xl mx-auto min-h-screen">
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Lớp học của tôi</h1>
          <p className="text-white/60">Tham gia lớp học để nhận đề thi, thông báo từ giáo viên và thi đấu cùng bạn bè.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Join Class */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Tham gia lớp mới</h2>
              </div>
              <form onSubmit={handleJoinClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Nhập mã lớp học</label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="VD: A1B2C3"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-lg uppercase text-center tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining || !joinCode}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isJoining ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                  Tham gia ngay
                </button>
              </form>
            </div>
          </div>

          {/* List Classes */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 min-h-[400px]">
              <h2 className="text-xl font-bold text-white mb-6">Danh sách lớp học</h2>
              
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-white/40">Đang tải danh sách...</p>
                </div>
              ) : classrooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classrooms.map((member, i) => {
                    const cls = member.classrooms;
                    const isPending = member.status === 'pending';
                    const isApproved = member.status === 'approved';
                    
                    return (
                      <div key={cls.id || i} className={`relative rounded-2xl border ${isApproved ? 'border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.08]' : 'border-white/5 opacity-75'} bg-white/5 p-5 transition-all group overflow-hidden`}>
                        {isPending && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-bl-xl border-b border-l border-amber-500/20">
                            ĐANG CHỜ DUYỆT
                          </div>
                        )}
                        <h3 className="font-bold text-white text-lg mb-1 mt-2 line-clamp-1" title={cls.name}>{cls.name}</h3>
                        <p className="text-sm text-white/50 mb-4 line-clamp-1">GV: {cls.profiles?.full_name || 'Không rõ'}</p>
                        
                        {isApproved ? (
                          <button onClick={() => router.push(`/classrooms/${cls.id}`)} className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl font-semibold transition-colors border border-indigo-500/20">
                            Vào lớp <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button disabled className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-white/5 text-white/30 rounded-xl font-semibold cursor-not-allowed">
                            <Clock className="w-4 h-4" /> Đang chờ duyệt
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/60 font-medium mb-2">Bạn chưa tham gia lớp học nào</p>
                  <p className="text-sm text-white/40">Nhập mã lớp học do giáo viên cung cấp ở bên cạnh để tham gia.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </GlobalSiteWrapper>
  );
}
