'use client';

import { AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { getQuestionResultState } from '@/lib/questionResult';

function getPointValue(value, fallback) {
    if (Number.isFinite(Number(value))) return Number(value);
    if (Number.isFinite(Number(value?.pointsPerQuestion))) return Number(value.pointsPerQuestion);
    return fallback;
}

function getTfScale(value, fallback) {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
    if (Array.isArray(value?.scale)) return value.scale.map(Number).filter(Number.isFinite);
    return fallback;
}

// Score ring component
function ScoreRing({ score, maxScore }) {
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    const max = maxScore > 0 ? maxScore : 10;
    const pct = Math.min(100, Math.max(0, (score / max) * 100));
    const dashOffset = circ - (pct / 100) * circ;
    const color = pct >= 80 ? '#17a86a' : pct >= 60 ? '#3b6fd4' : pct >= 40 ? '#d97706' : '#e5534b';

    return (
        <div style={{ position: 'relative', width: 136, height: 136, margin: '0 auto' }}>
            <svg width="136" height="136" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="68" cy="68" r={radius} fill="none" stroke="var(--app-surface-3)" strokeWidth="11" />
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
                <div style={{ fontSize: maxScore > 10 ? 24 : 30, fontWeight: 800, color, lineHeight: 1 }}>{score.toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}</div>
                <div style={{ fontSize: 11, color: 'var(--app-muted)', fontWeight: 600, marginTop: 2 }}>/ {maxScore}</div>
            </div>
        </div>
    );
}

export default function ResultsView({ questions, answers, onReset, scoringConfig, examType }) {
    const realQs = questions.filter(q => q.type !== 'TEXT');
    const total = realQs.length;
    let correct = 0;
    let unanswered = 0;
    let score = 0;
    let maxScore = 0;

    realQs.forEach(q => {
        const ua = answers[q.id] ?? (q.type === 'MA' ? [] : ((q.type === 'TF' || q.type === 'DRAG') ? {} : ''));
        const resultState = getQuestionResultState(q, ua);
        if (resultState === 'unanswered') unanswered++;
        
        if (q.type === 'MCQ' || q.type === 'MA') {
            const point = getPointValue(q.type === 'MA' ? (scoringConfig?.ma ?? scoringConfig?.mcq) : scoringConfig?.mcq, 1);
            maxScore += point;
            if (resultState === 'correct') {
                correct++;
                score += point;
            }
        } else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
            const tfScale = getTfScale(scoringConfig?.tf, [0.25, 0.25, 0.25, 1]);
            maxScore += tfScale[3] || 1;
            const tfSel = typeof ua === 'object' ? ua : {};
            let subCorrect = 0;
            const keys = Object.keys(q.answer);
            keys.forEach(k => {
                if (tfSel[k] === q.answer[k]) subCorrect++;
            });
            if (subCorrect === keys.length) correct++;
            if (scoringConfig && subCorrect > 0) {
                score += tfScale[subCorrect - 1] || 0;
            } else if (!scoringConfig && subCorrect === keys.length) {
                score += 1;
            }
        } else {
            const point = getPointValue(scoringConfig?.sa, 1);
            maxScore += point;
            if (resultState === 'correct') {
                correct++;
                score += point;
            }
        }
    });

    if (!scoringConfig) {
        score = total > 0 ? (correct / total) * 10 : 0;
        maxScore = 10;
    }

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const grade = pct >= 80 ? 'Giỏi' : pct >= 60 ? 'Khá' : pct >= 40 ? 'Trung bình' : 'Cần cố gắng';
    const pass = pct >= 50;

    return (
        <div className="et-score-card" style={{ padding: '32px 28px' }}>
            {/* Score ring */}
            <ScoreRing score={score} maxScore={maxScore} />

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
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--app-muted)', fontWeight: 500 }}>
                Điểm số của bạn
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--app-border)', margin: '20px 0' }} />

            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--et-green)' }} />
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--et-green)' }}>{correct}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 3 }}>Câu đúng</div>
                </div>

                <div style={{ width: 1, background: 'var(--app-border)' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <XCircle style={{ width: 16, height: 16, color: 'var(--et-red)' }} />
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--et-red)' }}>{total - correct - unanswered}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 3 }}>Câu sai</div>
                </div>

                <div style={{ width: 1, background: 'var(--app-border)' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <AlertTriangle style={{ width: 16, height: 16, color: 'var(--et-amber)' }} />
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--et-amber)' }}>{unanswered}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 3 }}>Chưa làm</div>
                </div>

                <div style={{ width: 1, background: 'var(--app-border)' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--app-text-soft)' }}>{total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 3 }}>Tỉ lệ đúng</div>
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
