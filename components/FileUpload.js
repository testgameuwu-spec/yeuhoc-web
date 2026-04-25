'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

export default function FileUpload({ onFileLoaded }) {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        setError('');

        if (!file.name.endsWith('.txt')) {
            setError('Chỉ hỗ trợ file .txt');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('File quá lớn (tối đa 5MB)');
            return;
        }

        setFileName(file.name);

        try {
            const text = await file.text();
            onFileLoaded(text, file.name);
        } catch {
            setError('Không thể đọc file. Vui lòng thử lại.');
        }
    }, [onFileLoaded]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 ease-out
          ${isDragging
                        ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-lg shadow-indigo-500/20'
                        : 'border-white/20 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10'
                    }
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".txt"
                    onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                />

                <div className="flex flex-col items-center gap-4 text-center">
                    <div className={`
            rounded-full p-4 transition-all duration-300
            ${isDragging ? 'bg-indigo-500/20 scale-110' : 'bg-white/10'}
          `}>
                        {fileName ? (
                            <FileText className="w-10 h-10 text-emerald-400" />
                        ) : (
                            <Upload className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-indigo-400' : 'text-white/60'}`} />
                        )}
                    </div>

                    {fileName ? (
                        <>
                            <p className="text-lg font-medium text-emerald-400">{fileName}</p>
                            <p className="text-sm text-white/50">Nhấn để chọn file khác</p>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-lg font-medium text-white/80">
                                    Kéo thả file <span className="text-indigo-400">.txt</span> vào đây
                                </p>
                                <p className="text-sm text-white/40 mt-1">hoặc nhấn để chọn file</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Animated border glow effect */}
                {isDragging && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse pointer-events-none" />
                )}
            </div>

            {error && (
                <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
