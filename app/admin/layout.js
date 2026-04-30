'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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

      // 3. Kiểm tra nếu không có profile, có lỗi, hoặc role không phải là 'admin'
      if (error || !profile || profile.role !== 'admin') {
        alert("Bạn không có quyền truy cập trang Quản trị!");
        router.push('/');
        return;
      }

      // 4. Đúng là admin thì cho phép hiển thị nội dung
      setIsAuthorized(true);
    };

    checkAdmin();
  }, [router]);

  // Trong lúc đang kiểm tra, hiển thị màn hình chờ (tránh bị chớp giao diện)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  // Nếu là admin, hiển thị các component con
  return <>{children}</>;
}
