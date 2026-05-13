'use client';

import { useState, useEffect, useRef } from 'react';

export default function Timer({ initialMinutes = 30, initialSeconds = null, onTimeUp, onTick, isRunning = true, compact = false }) {
    const totalDuration = initialMinutes * 60;

    // Anchor-based timing: track when the timer started and how many seconds were on the clock
    const anchorRef = useRef(null);        // { startedAt: number, startValue: number }
    const onTickRef = useRef(onTick);
    const onTimeUpRef = useRef(onTimeUp);
    const [displaySeconds, setDisplaySeconds] = useState(() =>
        initialSeconds !== null ? initialSeconds : totalDuration
    );
    const timeUpFiredRef = useRef(false);

    // Keep callback refs fresh without causing re-renders
    useEffect(() => { onTickRef.current = onTick; }, [onTick]);
    useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

    // When initialSeconds changes from parent (e.g. resume), reset the anchor
    const prevInitialSecondsRef = useRef(initialSeconds);
    useEffect(() => {
        const nextVal = initialSeconds !== null ? initialSeconds : initialMinutes * 60;
        // Only reset if the value actually changed from outside
        if (prevInitialSecondsRef.current !== initialSeconds) {
            prevInitialSecondsRef.current = initialSeconds;
            setDisplaySeconds(nextVal);
            timeUpFiredRef.current = false;
            // Reset anchor so next tick calculates from new value
            if (isRunning) {
                anchorRef.current = { startedAt: Date.now(), startValue: nextVal };
            } else {
                anchorRef.current = null;
            }
        }
    }, [initialSeconds, initialMinutes, isRunning]);

    // Core timing loop using Date.now() anchoring
    useEffect(() => {
        if (!isRunning) {
            // When paused, clear anchor (will re-anchor on resume)
            anchorRef.current = null;
            return;
        }

        // Set anchor to current display value
        const startValue = displaySeconds;
        anchorRef.current = { startedAt: Date.now(), startValue };

        const tick = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const elapsed = Math.floor((Date.now() - anchor.startedAt) / 1000);
            const newVal = Math.max(0, anchor.startValue - elapsed);

            setDisplaySeconds(prev => {
                if (prev === newVal) return prev;
                return newVal;
            });

            if (newVal <= 0 && !timeUpFiredRef.current) {
                timeUpFiredRef.current = true;
                onTimeUpRef.current?.();
            }
        };

        // Use a faster interval (250ms) to reduce perceived lag
        // The actual displayed value still only changes once per second due to Math.floor
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning]);

    // Notify parent whenever displayed seconds changes
    useEffect(() => {
        onTickRef.current?.(displaySeconds);
    }, [displaySeconds]);

    const pct = totalDuration > 0 ? (displaySeconds / totalDuration) * 100 : 100;
    const minutes = Math.floor(displaySeconds / 60);
    const seconds = displaySeconds % 60;
    const warnCls = pct <= 10 ? 'danger' : pct <= 25 ? 'warn' : '';

    if (compact) {
        return (
            <div className={`font-bold tabular-nums ${warnCls === 'danger' ? 'text-red-500 animate-pulse' : warnCls === 'warn' ? 'text-amber-500' : 'text-indigo-600'}`} style={warnCls ? undefined : { color: 'var(--tsa-timer-color, #4f46e5)' }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
        );
    }

    return (
        <div className="et-timer-block">
            <div className="et-timer-lbl">⏱ Thời gian còn lại</div>
            <div className={`et-timer-disp ${warnCls}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
        </div>
    );
}
