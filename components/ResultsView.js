'use client';

import { CheckCircle2, XCircle, RotateCcw, Star } from 'lucide-react';

// Score ring component
function ScoreRing({ score }) {
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, (score / 10) * 100));
    const dashOffset = circ - (pct / 100) * circ;
    const color = pct >= 80 ? '#17a86a' : pct >= 60 ? '#3b6fd4' : pct >= 40 ? '#d97706' : '#e5534b';

    return (
        <div style={{ position: 'relative', width: 136, height: 136, margin: '0 auto' }}>
            <svg width="136" height="136" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="68" cy="68" r={radius} fill="none" stroke="#f0f2f6" strokeWidth="11" />
                <circle
                    cx="68" cy="68" r={radius} fill="none"
                    stroke={color} strokeWidth="11"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{score.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#9aa3b2', fontWeight: 600, marginTop: 2 }}>/ 10</div>
            </div>
        </div>
    );
}

export default function ResultsView({ questions, answers, onReset }) {
    const total = questions.length;
    let correct = 0;

    questions.forEach(q => {
        const ua = answers[q.id] || '';
        if (q.type === 'MCQ') {
            if (ua === q.answer) correct++;
        } else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
            const tfSel = typeof ua === 'object' ? ua : {};
            const allOk = Object.keys(q.answer).every(k => tfSel[k] === q.answer[k]);
            if (allOk) correct++;
        } else {
            if ((ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase()) correct++;
        }
    });

    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const score = total > 0 ? (correct / total) * 10 : 0;
    const grade = pct >= 80 ? 'Giỏi' : pct >= 60 ? 'Khá' : pct >= 40 ? 'Trung bình' : 'Cần cố gắng';
    const pass = pct >= 50;
    const gradeColor = pct >= 80 ? '#17a86a' : pct >= 60 ? '#3b6fd4' : pct >= 40 ? '#d97706' : '#e5534b';

    return (
        <div className="et-score-card" style={{ padding: '32px 28px' }}>
            {/* Score ring */}
            <ScoreRing score={score} />

            {/* Grade badge */}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                <span
                    className={`et-result-badge ${pass ? 'et-badge-pass' : 'et-badge-fail'}`}
                    style={{ fontSize: 13, fontWeight: 700, padding: '5px 16px' }}
                >
                    {grade}
                </span>
            </div>

            {/* Main label */}
            <div style={{ marginTop: 8, fontSize: 13, color: '#9aa3b2', fontWeight: 500 }}>
                Điểm số của bạn
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#f0f2f6', margin: '20px 0' }} />

            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--et-green)' }} />
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--et-green)' }}>{correct}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 3 }}>Câu đúng</div>
                </div>

                <div style={{ width: 1, background: '#f0f2f6' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <XCircle style={{ width: 16, height: 16, color: 'var(--et-red)' }} />
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--et-red)' }}>{total - correct}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 3 }}>Câu sai</div>
                </div>

                <div style={{ width: 1, background: '#f0f2f6' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#5a6478' }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 3 }}>Tỉ lệ đúng</div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 22 }}>
                <button className="et-btn-outline" onClick={onReset}>
                    <RotateCcw style={{ width: 13, height: 13 }} />
                    Làm lại
                </button>
            </div>
        </div>
    );
}
