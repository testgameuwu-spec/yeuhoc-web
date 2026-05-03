'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, CreditCard } from 'lucide-react';

export default function DonateWidget({ user }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const formRef = useRef(null);

  const getMemo = () => {
    if (!user) return 'UNGHO';

    let parts = [];
    if (user.email) {
      parts.push(user.email.split('@')[0]);
    }

    const name = user.user_metadata?.full_name;
    if (name) {
      const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      parts.push(normalized);
    }

    if (parts.length > 0) {
      return parts.join(' ').toUpperCase().substring(0, 40);
    }

    return user.id.substring(0, 6).toUpperCase();
  };

  const memo = getMemo();

  useEffect(() => {
    if (checkoutData && formRef.current) {
      formRef.current.submit();
    }
  }, [checkoutData]);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const response = await fetch('/yeuhoc/api/checkout/sepay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 20000,
          description: memo,
          redirectUrl: window.location.origin + '/yeuhoc'
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCheckoutData(data);
      } else {
        alert('Lỗi khởi tạo cổng thanh toán: ' + data.message);
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error(error);
      alert('Đã xảy ra lỗi kết nối, vui lòng thử lại.');
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden group">
      {/* Decorative background blur */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-200/50 rounded-full blur-2xl group-hover:bg-indigo-300/50 transition-colors" />
      <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-purple-200/50 rounded-full blur-2xl group-hover:bg-purple-300/50 transition-colors" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">Tiếp thêm động lực</h3>
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Ủng hộ dự án</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
          Mỗi bát phở của bạn là nguồn động lực to lớn giúp <strong className="text-indigo-600 font-bold">YeuHoc</strong> duy trì máy chủ và phát triển thêm nhiều tính năng mới!
        </p>

        <button
          onClick={handleCheckout}
          disabled={isCheckingOut}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isCheckingOut ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {isCheckingOut ? 'Đang chuyển hướng...' : 'Thanh toán qua SePay (20.000đ)'}
        </button>

        {/* Hidden Form for SePay Checkout Redirection */}
        {checkoutData && (
          <form action={checkoutData.checkoutURL} method="POST" ref={formRef} className="hidden">
            {Object.keys(checkoutData.checkoutFormfields).map(field => (
              <input type="hidden" key={field} name={field} value={checkoutData.checkoutFormfields[field]} />
            ))}
          </form>
        )}
      </div>
    </div>
  );
}
