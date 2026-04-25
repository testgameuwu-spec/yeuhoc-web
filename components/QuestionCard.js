'use client';

import { useState } from 'react';
import MathRenderer from './MathRenderer';
import ImageModal from './ImageModal';
import { Image as ImageIcon, CheckCircle2, XCircle, ChevronDown, ChevronUp, Flag } from 'lucide-react';

const TYPE_LABEL = { MCQ: 'Trắc nghiệm', TF: 'Đúng / Sai', SA: 'Trả lời ngắn' };

export default function QuestionCard({
    question,
    index,
    selectedAnswer,
    onAnswerChange,
    showResult = false,
    disabled = false,
    isBookmarked = false,
    onToggleBookmark = null,
}) {
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const { id, type, content, options, answer, solution, image } = question;

    // ── MCQ correctness ──
    const isMCQCorrect = type === 'MCQ' && showResult && selectedAnswer === answer;

    // ── TF answer stored as object { a: 'D', b: 'S', ... } ──
    const tfAnswer = (type === 'TF' && answer && typeof answer === 'object') ? answer : {};
    const tfSelected = (type === 'TF' && selectedAnswer && typeof selectedAnswer === 'object') ? selectedAnswer : {};
    const handleTFChange = (stmtKey, val) => {
        if (disabled) return;
        onAnswerChange({ ...tfSelected, [stmtKey]: val });
    };

    // ── SA correctness ──
    const isSACorrect = type === 'SA' && showResult &&
        (selectedAnswer || '').trim().toLowerCase() === (answer || '').trim().toLowerCase();

    // border color of whole card when result shown
    const cardBorder = showResult
        ? (type === 'MCQ' ? (isMCQCorrect ? 'correct' : 'wrong')
            : type === 'SA' ? (isSACorrect ? 'correct' : 'wrong')
                : '')
        : '';

    return (
        <div
            className="et-q-card"
            style={
                showResult && cardBorder
                    ? { borderColor: cardBorder === 'correct' ? 'var(--et-green)' : 'var(--et-red)' }
                    : {}
            }
        >
            {/* ── Header ── */}
            <div className="et-q-card-hd">
                <div className="et-q-badge">
                    <span className="et-q-num-badge">{index + 1}</span>
                    <span className="et-q-type-badge">{TYPE_LABEL[type] || type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {!showResult && onToggleBookmark && (
                        <button
                            onClick={onToggleBookmark}
                            title="Đánh dấu câu hỏi này"
                            style={{
                                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                                color: isBookmarked ? '#d97706' : '#9ca3af',
                                display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                            }}
                        >
                            <Flag width={18} height={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    {showResult && type === 'MCQ' && (
                        isMCQCorrect
                            ? <CheckCircle2 style={{ color: 'var(--et-green)', width: 18, height: 18 }} />
                            : <XCircle style={{ color: 'var(--et-red)', width: 18, height: 18 }} />
                    )}
                    {showResult && type === 'SA' && (
                        isSACorrect
                            ? <CheckCircle2 style={{ color: 'var(--et-green)', width: 18, height: 18 }} />
                            : <XCircle style={{ color: 'var(--et-red)', width: 18, height: 18 }} />
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="et-q-card-body">
                {/* Question text */}
                <div className="et-q-text">
                    <MathRenderer text={content} />
                </div>

                {/* Image */}
                {image && (
                    <div style={{ marginBottom: 14 }}>
                        <button
                            onClick={() => setImageModalOpen(true)}
                            style={{
                                background: 'none', border: '1px solid var(--et-gray-200)',
                                borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0,
                                display: 'block',
                            }}
                        >
                            <img
                                src={image}
                                alt={`Hình minh họa câu ${index + 1}`}
                                style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        </button>
                    </div>
                )}

                {/* ── MCQ options ── */}
                {type === 'MCQ' && Array.isArray(options) && options.length > 0 && (
                    <div className="et-mc-opts">
                        {options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const isSelected = selectedAnswer === letter;
                            const isCorrectOpt = showResult && letter === answer;
                            const isWrongSel = showResult && isSelected && !isCorrectOpt;
                            const cls = isCorrectOpt ? 'correct' : isWrongSel ? 'wrong' : isSelected ? 'sel' : '';
                            return (
                                <label
                                    key={i}
                                    className={`et-mc-opt ${cls}`}
                                    style={{ cursor: disabled ? 'default' : 'pointer' }}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${id}`}
                                        value={letter}
                                        checked={isSelected}
                                        onChange={() => !disabled && onAnswerChange(letter)}
                                        disabled={disabled}
                                        style={{ display: 'none' }}
                                    />
                                    <span className={`et-mc-ltr`}>{letter}</span>
                                    <span className="et-mc-text"><MathRenderer text={opt} /></span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {/* ── TF (Đúng/Sai) table ── */}
                {type === 'TF' && (
                    <TFTable
                        statements={question.statements || []}
                        tfAnswer={tfAnswer}
                        tfSelected={tfSelected}
                        showResult={showResult}
                        disabled={disabled}
                        onChange={handleTFChange}
                    />
                )}

                {/* ── Short Answer ── */}
                {type === 'SA' && (
                    <div style={{ marginTop: 8 }}>
                        <input
                            type="text"
                            value={selectedAnswer || ''}
                            onChange={e => onAnswerChange(e.target.value)}
                            disabled={disabled}
                            placeholder="Nhập đáp án của bạn..."
                            className={`et-short-inp${showResult ? (isSACorrect ? ' correct' : ' wrong') : ''}`}
                        />
                        {showResult && !isSACorrect && answer && (
                            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--et-green)', fontWeight: 600 }}>
                                Đáp án đúng: <MathRenderer text={answer} />
                            </p>
                        )}
                    </div>
                )}

                {/* ── Solution ── */}
                {showResult && solution && (
                    <div style={{ marginTop: 14 }}>
                        <button
                            onClick={() => setShowSolution(!showSolution)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                fontSize: 12, color: 'var(--et-blue)', fontWeight: 600,
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', padding: 0,
                            }}
                        >
                            {showSolution ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                            {showSolution ? 'Ẩn lời giải' : 'Xem lời giải'}
                        </button>
                        {showSolution && (
                            <div className="et-solution">
                                <MathRenderer text={solution} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {image && (
                <ImageModal
                    isOpen={imageModalOpen}
                    onClose={() => setImageModalOpen(false)}
                    src={image}
                    alt={`Hình minh họa câu ${index + 1}`}
                />
            )}
        </div>
    );
}

/* ─── TF Table sub-component ─── */
const STMT_LTRS = ['a', 'b', 'c', 'd'];

function TFTable({ statements, tfAnswer, tfSelected, showResult, disabled, onChange }) {
    if (!statements || statements.length === 0) return null;
    return (
        <table className="et-ds-tbl">
            <thead>
                <tr>
                    <th style={{ textAlign: 'left' }}>Phát biểu</th>
                    <th>Đúng</th>
                    <th>Sai</th>
                </tr>
            </thead>
            <tbody>
                {statements.map((stmt, i) => {
                    const key = STMT_LTRS[i] || String(i);
                    const correctVal = tfAnswer[key]; // 'D' or 'S'
                    const selectedVal = tfSelected[key];
                    const isOk = showResult && selectedVal === correctVal;
                    return (
                        <tr key={i} className={showResult ? (isOk ? 'ok' : 'fail') : ''}>
                            <td>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: 'var(--et-gray-200)', fontSize: 10, fontWeight: 700,
                                    color: 'var(--et-gray-600)', marginRight: 6,
                                }}>{key}</span>
                                <MathRenderer text={stmt.text || stmt} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <TFRadio
                                    val="D" selected={selectedVal === 'D'}
                                    correct={showResult && correctVal === 'D'}
                                    wrong={showResult && selectedVal === 'D' && correctVal !== 'D'}
                                    onClick={() => onChange(key, 'D')} disabled={disabled}
                                />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <TFRadio
                                    val="S" selected={selectedVal === 'S'}
                                    correct={showResult && correctVal === 'S'}
                                    wrong={showResult && selectedVal === 'S' && correctVal !== 'S'}
                                    onClick={() => onChange(key, 'S')} disabled={disabled}
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function TFRadio({ selected, correct, wrong, onClick, disabled }) {
    const bg = correct ? 'var(--et-green)' : wrong ? 'var(--et-red)' : selected ? 'var(--et-blue)' : '#fff';
    const border = correct ? 'var(--et-green)' : wrong ? 'var(--et-red)' : selected ? 'var(--et-blue)' : '#ccc';
    return (
        <button
            onClick={!disabled ? onClick : undefined}
            style={{
                width: 20, height: 20, borderRadius: '50%',
                border: `2px solid ${border}`,
                background: bg, cursor: disabled ? 'default' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
            }}
        >
            {selected && <svg viewBox="0 0 10 10" style={{ width: 8, height: 8 }}><polyline points="1,5 4,8 9,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
        </button>
    );
}
