'use client';

import { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const DEFAULT_ZOOM = 1;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

export default function ImageModal({ isOpen, onClose, src, alt }) {
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);

    const handleClose = useCallback(() => {
        setZoom(DEFAULT_ZOOM);
        onClose();
    }, [onClose]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') handleClose();
    }, [handleClose]);

    const zoomOut = useCallback(() => {
        setZoom((value) => clampZoom(value - ZOOM_STEP));
    }, []);

    const zoomIn = useCallback(() => {
        setZoom((value) => clampZoom(value + ZOOM_STEP));
    }, []);

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

    const canZoomOut = zoom > MIN_ZOOM;
    const canZoomIn = zoom < MAX_ZOOM;
    const buttonClassName = 'p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10';
    const closeButtonClassName = 'p-2 rounded-full bg-red-500/90 border border-red-400/70 text-white hover:bg-red-600 transition-colors';

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={handleClose}
        >
            <div
                className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-black/35 p-1 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={zoomOut}
                    disabled={!canZoomOut}
                    className={buttonClassName}
                    title="Thu nhỏ ảnh"
                    aria-label="Thu nhỏ ảnh"
                >
                    <Minus className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    onClick={zoomIn}
                    disabled={!canZoomIn}
                    className={buttonClassName}
                    title="Phóng to ảnh"
                    aria-label="Phóng to ảnh"
                >
                    <Plus className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    className={closeButtonClassName}
                    title="Đóng ảnh"
                    aria-label="Đóng ảnh"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div
                className="max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-auto animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={src}
                    alt={alt}
                    width={1200}
                    height={800}
                    sizes="(max-width: 1024px) 90vw, 1024px"
                    className="h-auto max-w-none rounded-xl object-contain"
                    style={{
                        width: `min(${1024 * zoom}px, ${90 * zoom}vw)`,
                        maxHeight: zoom === DEFAULT_ZOOM ? '85vh' : 'none',
                    }}
                />
            </div>
        </div>
    );
}
