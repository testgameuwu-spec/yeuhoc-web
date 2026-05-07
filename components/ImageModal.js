'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

export default function ImageModal({ isOpen, onClose, src, alt }) {
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="relative max-w-4xl max-h-[90vh] animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <Image
                    src={src}
                    alt={alt}
                    width={1200}
                    height={800}
                    className="max-h-[85vh] w-auto rounded-xl object-contain"
                />
            </div>
        </div>
    );
}
