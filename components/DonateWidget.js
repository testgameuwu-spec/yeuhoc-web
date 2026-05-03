'use client';

import { useState } from 'react';
import { Heart, Copy, CheckCircle2, QrCode } from 'lucide-react';

export default function DonateWidget({ user }) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const BANK_INFO = {
    bankId: 'MBBank',
    bankName: 'MB Bank',
    accountName: 'PHAM DUY MINH',
    accountNumber: '0971928106',
  };

  const memo = 'DONATE YEUHOC';

  // Tạo mã QR bằng SePay API
  const qrUrl = `https://qr.sepay.vn/img?acc=${BANK_INFO.accountNumber}&bank=${BANK_INFO.bankId}&amount=20000&des=${encodeURIComponent(memo)}`;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_INFO.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden group">
      {/* Decorative background blur */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-200/50 rounded-full blur-2xl group-hover:bg-rose-300/50 transition-colors" />
      <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-orange-200/50 rounded-full blur-2xl group-hover:bg-orange-300/50 transition-colors" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">Tiếp thêm động lực</h3>
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Ủng hộ dự án</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
          Mỗi ly cà phê của bạn là nguồn động lực to lớn giúp <strong className="text-rose-600 font-bold">YeuHoc</strong> duy trì máy chủ và phát triển thêm nhiều tính năng mới!
        </p>

        {showQR ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 animate-fadeIn flex flex-col items-center text-center">
            <img src={qrUrl} alt="QR Code thanh toán SePay" className="w-48 h-48 object-contain mb-3 rounded-lg" />
            <p className="text-xs text-gray-500 mb-1">Quét mã qua ứng dụng ngân hàng</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                Nội dung: <strong className="text-gray-900 ml-1">{memo}</strong>
              </span>
              <button
                onClick={handleCopyMemo}
                className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                title="Sao chép nội dung"
              >
                {copiedMemo ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              Xem thông tin chuyển khoản
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-4 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-rose-100/50">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                Ngân hàng {BANK_INFO.bankName}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900">{BANK_INFO.accountNumber}</div>
                  <div className="text-xs text-gray-500 font-medium">{BANK_INFO.accountName}</div>
                </div>
                <button
                  onClick={handleCopyAccount}
                  className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors shrink-0"
                  title="Sao chép số tài khoản"
                >
                  {copiedAccount ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-rose-100/50">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Nội dung chuyển khoản
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-indigo-600 text-sm break-all">
                  {memo}
                </div>
                <button
                  onClick={handleCopyMemo}
                  className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                  title="Sao chép nội dung"
                >
                  {copiedMemo ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {!showQR && (
          <button
            onClick={() => setShowQR(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-sm shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <QrCode className="w-4 h-4" /> Hiện mã QR
          </button>
        )}
      </div>
    </div>
  );
}
