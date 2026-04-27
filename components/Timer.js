'use client';

import { useState, useEffect, useRef } from 'react';

export default function Timer({ initialMinutes = 30, initialSeconds = null, onTimeUp, onTick, isRunning = true }) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds !== null ? initialSeconds : initialMinutes * 60);
    const intervalRef = useRef(null);

    useEffect(() => {
        setSecondsLeft(initialSeconds !== null ? initialSeconds : initialMinutes * 60);
    }, [initialMinutes, initialSeconds]);

    useEffect(() => {
        if (onTick) onTick(secondsLeft);
    }, [secondsLeft]);

    useEffect(() => {
        if (!isRunning) { clearInterval(intervalRef.current); return; }
        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) { clearInterval(intervalRef.current); onTimeUp?.(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [isRunning, onTimeUp]);

    const total   = initialMinutes * 60;
    const pct     = total > 0 ? (secondsLeft / total) * 100 : 100;
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const warnCls = pct <= 10 ? 'danger' : pct <= 25 ? 'warn' : '';

    return (
        <div className="et-timer-block">
            <div className="et-timer-lbl">⏱ Thời gian còn lại</div>
            <div className={`et-timer-disp ${warnCls}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
        </div>
    );
}
