'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkTeacher = async () => {
      // 1. Lấy thông tin user hiện tại đang đăng nhập
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Chưa đăng nhập -> đá về trang login
        router.push('/login');
        return;
      }

      const userId = session.user.id;

      // 2. Truy vấn vào bảng profiles để xem role của user này
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      // 3. Kiểm tra quyền giáo viên (cho phép cả admin)
      if (error || !profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
        alert("Bạn không có quyền truy cập trang Giáo viên!");
        router.push('/');
        return;
      }

      // 4. Đúng là giáo viên/admin thì cho phép hiển thị nội dung
      setIsAuthorized(true);
    };

    checkTeacher();
  }, [router]);

  // Trong lúc đang kiểm tra, hiển thị màn hình chờ
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f1a]">
        <div className="text-lg font-medium text-gray-600 dark:text-gray-300">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  // Nếu có quyền, hiển thị các component con
  return <>{children}</>;
}
