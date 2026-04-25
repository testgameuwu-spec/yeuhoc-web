'use client';

import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

export default function ResultsView({ questions, answers, onReset }) {
    const total = questions.length;
    let correct = 0;

    questions.forEach(q => {
        const ua = answers[q.id] || '';
        if (q.type === 'MCQ') {
            if (ua === q.answer) correct++;
        } else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
            // TF: count full-correct only
            const tfSel = typeof ua === 'object' ? ua : {};
            const allOk = Object.keys(q.answer).every(k => tfSel[k] === q.answer[k]);
            if (allOk) correct++;
        } else {
            if ((ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase()) correct++;
        }
    });

    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    const grade = pct >= 80 ? 'Giỏi' : pct >= 60 ? 'Khá' : pct >= 40 ? 'Trung bình' : 'Cần cố gắng';
    const pass  = pct >= 50;

    return (
        <div className="et-score-card">
            <div className="et-score-num">{correct}/{total}</div>
            <div className="et-score-lbl">Số câu đúng</div>
            <div
                className={`et-result-badge ${pass ? 'et-badge-pass' : 'et-badge-fail'}`}
                style={{ marginTop: 8 }}
            >
                {pct}% — {grade}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--et-green)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--et-green)' }}>{correct}</span>
                    <span style={{ color: 'var(--et-gray-400)', fontSize: 12 }}>Đúng</span>
                </div>
                <div style={{ width: 1, background: 'var(--et-gray-200)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <XCircle style={{ width: 18, height: 18, color: 'var(--et-red)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--et-red)' }}>{total - correct}</span>
                    <span style={{ color: 'var(--et-gray-400)', fontSize: 12 }}>Sai</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button className="et-btn-outline" onClick={onReset}>
                    <RotateCcw style={{ width: 13, height: 13 }} />
                    Làm lại
                </button>
            </div>
        </div>
    );
}
