'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
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
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || typeof document === 'undefined') return null;

    const canZoomOut = zoom > MIN_ZOOM;
    const canZoomIn = zoom < MAX_ZOOM;
    const zoomPercent = `${Math.round(zoom * 100)}%`;
    const buttonClassName = 'p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10';
    const closeButtonClassName = 'p-2 rounded-full bg-red-500/90 border border-red-400/70 text-white hover:bg-red-600 transition-colors';

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] bg-black/35 backdrop-blur-lg animate-fadeIn"
            onClick={handleClose}
        >
            <div
                className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-black/45 p-1 backdrop-blur-sm"
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
                <span
                    className="min-w-14 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-center text-sm font-bold tabular-nums text-white"
                    aria-live="polite"
                >
                    {zoomPercent}
                </span>
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
                className="h-full w-full overflow-auto animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex min-h-full min-w-full items-center justify-center p-4">
                    <Image
                        src={src}
                        alt={alt}
                        width={1600}
                        height={1200}
                        sizes="100vw"
                        className="h-auto max-w-none rounded-xl object-contain"
                        style={{
                            width: `min(${1200 * zoom}px, ${100 * zoom}vw)`,
                            maxWidth: zoom === DEFAULT_ZOOM ? 'calc(100vw - 2rem)' : 'none',
                            maxHeight: zoom === DEFAULT_ZOOM ? 'calc(100dvh - 2rem)' : 'none',
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
