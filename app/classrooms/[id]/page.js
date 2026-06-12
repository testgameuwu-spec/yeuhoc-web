'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BookOpen, FileText, Bell, Trophy, Clock, PlayCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import GlobalSiteWrapper from '@/components/GlobalSiteWrapper';

export default function StudentClassroomDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams'); // exams, leaderboard, announcements
  const [exams, setExams] = useState([]);
  
  useEffect(() => {
    fetchClassData();
  }, [id]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Verify membership and get class info
      const { data: memberData, error: memError } = await supabase
        .from('classroom_members')
        .select(`
          status,
          classrooms (
            id, name, description,
            profiles:teacher_id (full_name)
          )
        `)
        .eq('classroom_id', id)
        .eq('user_id', user.id)
        .single();

      if (memError || !memberData || memberData.status !== 'approved') {
        alert('Bạn chưa được duyệt vào lớp học này hoặc lớp không tồn tại.');
        router.push('/classrooms');
        return;
      }

      setClassroom(memberData.classrooms);

      // 2. Fetch Exams for this class (only published)
      const { data: examsData, error: examsError } = await supabase
        .from('classroom_exams')
        .select('id, title, subject, time_limit, created_at')
        .eq('classroom_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      setExams(examsData || []);

    } catch (err) {
      console.error('Error fetching class:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlobalSiteWrapper>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </GlobalSiteWrapper>
    );
  }

  if (!classroom) return null;

  return (
    <GlobalSiteWrapper>
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 max-w-5xl mx-auto min-h-screen animate-fadeIn">
        
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/classrooms')} className="mb-6 flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách lớp
          </button>
          
          <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{classroom.name}</h1>
                <p className="text-indigo-200/80 mb-4">{classroom.description}</p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 w-fit text-sm font-semibold border border-indigo-500/20">
                  <BookOpen className="w-4 h-4" /> Giáo viên: {classroom.profiles?.full_name || 'Không rõ'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10 w-fit mb-8 overflow-x-auto max-w-full">
          {[
            { key: 'exams', label: 'Bài tập / Đề thi', icon: FileText },
            { key: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
            { key: 'announcements', label: 'Thông báo', icon: Bell },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Danh sách Đề thi</h2>
            {exams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map(exam => (
                  <div key={exam.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/30 hover:bg-white/[0.08] transition-all flex flex-col group">
                    <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{exam.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-white/50 mb-6 mt-auto">
                      <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {exam.subject || 'Khác'}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {exam.time_limit || '--'} phút</span>
                    </div>
                    <button 
                      onClick={() => alert('Chức năng làm bài thi trong lớp đang được hoàn thiện.')} 
                      className="w-full py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-5 h-5" /> Bắt đầu làm bài
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60 font-medium">Chưa có đề thi nào được giao</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <Trophy className="w-16 h-16 text-yellow-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Bảng Xếp Hạng Lớp</h3>
            <p className="text-white/50 max-w-sm mx-auto">Chức năng bảng xếp hạng điểm số đang được phát triển.</p>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <Bell className="w-16 h-16 text-indigo-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Thông báo lớp học</h3>
            <p className="text-white/50 max-w-sm mx-auto">Chưa có thông báo nào từ giáo viên.</p>
          </div>
        )}

      </div>
    </GlobalSiteWrapper>
  );
}
