'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SystemSettings({ showAlert }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'Hệ thống đang bảo trì, vui lòng quay lại sau.',
    showNotice: false,
    noticeMessage: ''
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'general')
        .single();
      
      if (data && data.value) {
        setSettings(prev => ({ ...prev, ...data.value }));
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: 'general', value: settings, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    
    setSaving(false);
    
    if (error) {
      console.error('Error saving settings:', error);
      showAlert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.');
    } else {
      showAlert('Thành công', 'Đã lưu cài đặt hệ thống.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-white/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        Đang tải cấu hình...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            Cài đặt chung
          </h1>
          <p className="text-white/50 text-sm mt-1">Quản lý các cấu hình toàn cục của hệ thống</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Lưu thay đổi
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Maintenance Mode */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Chế độ bảo trì
              </h3>
              <p className="text-sm text-white/50 mb-4">
                Khi bật tính năng này, người dùng bình thường sẽ không thể truy cập hệ thống. Chỉ admin mới có thể vào.
              </p>
              
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-white/80">Nội dung thông báo bảo trì</label>
                <textarea
                  value={settings.maintenanceMessage}
                  onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                  disabled={!settings.maintenanceMode}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[100px] disabled:opacity-50"
                  placeholder="Nhập thông báo hiển thị cho người dùng..."
                />
              </div>
            </div>
            
            <div className="pt-1">
              <button
                onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  settings.maintenanceMode ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/10'
                }`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-300 ${
                  settings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Global Notice */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-blue-400" />
                Thông báo toàn trang
              </h3>
              <p className="text-sm text-white/50 mb-4">
                Hiển thị một banner thông báo ở đầu tất cả các trang. Dùng để thông báo lịch nghỉ, sự kiện, v.v.
              </p>
              
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-white/80">Nội dung thông báo</label>
                <textarea
                  value={settings.noticeMessage}
                  onChange={(e) => handleChange('noticeMessage', e.target.value)}
                  disabled={!settings.showNotice}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[100px] disabled:opacity-50"
                  placeholder="Nhập nội dung banner thông báo..."
                />
              </div>
            </div>
            
            <div className="pt-1">
              <button
                onClick={() => handleChange('showNotice', !settings.showNotice)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  settings.showNotice ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/10'
                }`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-300 ${
                  settings.showNotice ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
