'use client';

import { useRef, useState } from 'react';
import MathRenderer from './MathRenderer';
import ImageModal from './ImageModal';
import ContentWithInlineImage, { parseImageMap } from './ContentWithInlineImage';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Flag, AlertTriangle, BookMarked } from 'lucide-react';
import { getDragBlankIds, getQuestionResultState, normalizeMAAnswer, parseDragAnswer } from '@/lib/questionResult';

const TYPE_LABEL = { MCQ: 'Trắc Nghiệm', MA: 'Chọn nhiều đáp án', TF: 'Đúng/Sai', SA: 'Trả lời ngắn', DRAG: 'Kéo thả', TEXT: 'Ngữ liệu' };

export default function QuestionCard({
    question,
    index,
    selectedAnswer,
    onAnswerChange,
    showResult = false,
    disabled = false,
    isBookmarked = false,
    onToggleBookmark = null,
    onReport = null,
    onSaveErrorLog = null,
    preloadImages = false,
}) {
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState(null);
    const [showSolution, setShowSolution] = useState(false);
    const [activeDragLetter, setActiveDragLetter] = useState(null);
    const { id, type, content, options, answer, solution, image: rawImage } = question;
    const image = rawImage;
    const hasImage = Object.keys(parseImageMap(rawImage)).length > 0;
    const isTextBlock = type === 'TEXT';
    const shouldShowResultStatus = showResult && !isTextBlock;

    // ── TF answer stored as object { a: 'D', b: 'S', ... } ──
    const tfAnswer = (type === 'TF' && answer && typeof answer === 'object') ? answer : {};
    const tfSelected = (type === 'TF' && selectedAnswer && typeof selectedAnswer === 'object') ? selectedAnswer : {};
    const handleTFChange = (stmtKey, val) => {
        if (disabled) return;
        onAnswerChange({ ...tfSelected, [stmtKey]: val });
    };

    const maAnswer = type === 'MA' ? normalizeMAAnswer(answer) : [];
    const maSelected = type === 'MA' ? normalizeMAAnswer(selectedAnswer) : [];
    const handleMAChange = (letter) => {
        if (disabled) return;
        const selectedSet = new Set(maSelected);
        if (selectedSet.has(letter)) selectedSet.delete(letter);
        else selectedSet.add(letter);
        onAnswerChange([...selectedSet].sort());
    };

    const dragAnswer = type === 'DRAG' ? parseDragAnswer(answer) : {};
    const dragSelected = (type === 'DRAG' && selectedAnswer && typeof selectedAnswer === 'object') ? selectedAnswer : {};
    const handleDragChange = (blankId, letter) => {
        if (disabled) return;
        const next = { ...dragSelected };
        const previousBlank = Object.entries(next).find(([key, value]) => key !== blankId && value === letter)?.[0];
        if (previousBlank) delete next[previousBlank];
        if (letter) next[blankId] = letter;
        else delete next[blankId];
        onAnswerChange(next);
    };

    const resultState = shouldShowResultStatus ? getQuestionResultState(question, selectedAnswer) : '';
    const isCorrect = resultState === 'correct';
    const isWrong = resultState === 'wrong';
    const isUnanswered = resultState === 'unanswered';

    // border color of whole card when result shown
    const cardBorder = showResult ? resultState : '';

    return (
        <div
            className={`et-q-card ${resultState}`}
            style={
                shouldShowResultStatus && cardBorder
                    ? {
                        borderColor: cardBorder === 'correct'
                            ? 'var(--et-green)'
                            : cardBorder === 'unanswered'
                                ? 'var(--et-amber)'
                                : 'var(--et-red)'
                    }
                    : {}
            }
        >
            {/* ── Header ── */}
            <div className="et-q-card-hd">
                <div className="et-q-badge">
                    {!isTextBlock && <span className="et-q-num-badge">{index + 1}</span>}
                    <span className="et-q-type-badge">{TYPE_LABEL[type] || type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {onReport && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReport(question); }}
                            title="Báo cáo câu hỏi có vấn đề"
                            style={{
                                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                                color: '#9ca3af',
                                display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}
                        >
                            <AlertTriangle width={17} height={17} />
                        </button>
                    )}
                    {onSaveErrorLog && !isTextBlock && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSaveErrorLog(question); }}
                            title="Lưu vào Nhật ký lỗi"
                            style={{
                                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                                color: '#9ca3af',
                                display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--home-brand-primary)'}
                            onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}
                        >
                            <BookMarked width={17} height={17} />
                        </button>
                    )}
                    {onToggleBookmark && (
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
                    {shouldShowResultStatus && (
                        <>
                            <span className={`et-result-pill ${resultState}`}>
                                {isUnanswered ? 'Chưa làm' : isCorrect ? 'Đúng' : 'Sai'}
                            </span>
                            {isCorrect && <CheckCircle2 style={{ color: 'var(--et-green)', width: 18, height: 18 }} />}
                            {isWrong && <XCircle style={{ color: 'var(--et-red)', width: 18, height: 18 }} />}
                        </>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="et-q-card-body">
                {/* Question text */}
                {type === 'DRAG' ? (
                    <DragQuestion
                        content={content}
                        options={options || []}
                        selected={dragSelected}
                        answer={dragAnswer}
                        activeLetter={activeDragLetter}
                        setActiveLetter={setActiveDragLetter}
                        showResult={showResult}
                        disabled={disabled}
                        onChange={handleDragChange}
                    />
                ) : (
                    <div className="et-q-text">
                        <ContentWithInlineImage
                            text={content}
                            image={image}
                            alt={`Hình minh họa câu ${index + 1}`}
                            imageWrapperClassName="mb-3"
                            imageClassName="max-h-[220px] w-auto max-w-full object-contain block"
                            imageButtonStyle={{
                                background: 'none',
                                border: '1px solid var(--et-gray-200)',
                                borderRadius: 8,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'block',
                            }}
                            width={700}
                            height={400}
                            sizes="(max-width: 768px) 100vw, 700px"
                            preload={preloadImages}
                            onImageClick={(src) => {
                                setModalImageSrc(src);
                                setImageModalOpen(true);
                            }}
                        />
                    </div>
                )}
                {type === 'DRAG' && hasImage && (
                    <ContentWithInlineImage
                        text=""
                        image={image}
                        alt={`Hình minh họa câu ${index + 1}`}
                        imageWrapperClassName="mb-3"
                        imageClassName="max-h-[220px] w-auto max-w-full object-contain block"
                        imageButtonStyle={{
                            background: 'none',
                            border: '1px solid var(--et-gray-200)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'block',
                        }}
                        width={700}
                        height={400}
                        sizes="(max-width: 768px) 100vw, 700px"
                        preload={preloadImages}
                        onImageClick={(src) => {
                            setModalImageSrc(src);
                            setImageModalOpen(true);
                        }}
                    />
                )}

                {isUnanswered && (
                    <div className="et-result-note unanswered">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <div>
                            <div className="font-bold">Bạn chưa trả lời câu này.</div>
                        </div>
                    </div>
                )}

                {type === 'MA' && !disabled && Array.isArray(options) && options.length > 0 && (
                    <div className="et-ma-instruction" role="note">
                        Lưu ý: Câu này có thể chọn nhiều đáp án. Hãy chọn tất cả đáp án đúng.
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
                                    <div className="et-mc-text"><MathRenderer text={opt} /></div>
                                </label>
                            );
                        })}
                    </div>
                )}

                {/* ── MA options ── */}
                {type === 'MA' && Array.isArray(options) && options.length > 0 && (
                    <div className="et-mc-opts">
                        {options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const isSelected = maSelected.includes(letter);
                            const hasAnswerKey = showResult && maAnswer.length > 0;
                            const isCorrectOpt = hasAnswerKey && maAnswer.includes(letter);
                            const isWrongSelection = hasAnswerKey && isSelected && !isCorrectOpt;
                            const cls = hasAnswerKey ? (isCorrectOpt ? (isSelected ? 'correct' : 'missed-correct') : isWrongSelection ? 'wrong' : '') : isSelected ? 'sel' : '';
                            const resultLabel = !hasAnswerKey
                                ? ''
                                : `${isSelected ? 'Bạn chọn' : 'Bạn không chọn'} / ${isCorrectOpt ? 'Đáp án đúng' : 'Đáp án sai'}`;
                            return (
                                <label
                                    key={i}
                                    className={`et-mc-opt ${cls}`}
                                    style={{ cursor: disabled ? 'default' : 'pointer' }}
                                >
                                    <input
                                        type="checkbox"
                                        name={`question-${id}`}
                                        value={letter}
                                        checked={isSelected}
                                        onChange={() => handleMAChange(letter)}
                                        disabled={disabled}
                                        style={{ display: 'none' }}
                                    />
                                    <span className="et-mc-ltr">{letter}</span>
                                    <div className="et-mc-text with-tag">
                                        <div className="et-mc-text-main"><MathRenderer text={opt} /></div>
                                        {resultLabel && (
                                            <span className={`et-option-tag ${isCorrectOpt ? 'correct' : 'wrong'}`}>
                                                {resultLabel}
                                            </span>
                                        )}
                                    </div>
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
                            value={selectedAnswer ?? ''}
                            onChange={e => onAnswerChange(e.target.value)}
                            disabled={disabled}
                            placeholder="Nhập đáp án của bạn..."
                            className={`et-short-inp${showResult ? (isCorrect ? ' correct' : isUnanswered ? ' unanswered' : ' wrong') : ''}`}
                        />
                        {showResult && !isCorrect && answer && (
                            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--et-green)', fontWeight: 600 }}>
                                <span>Đáp án đúng:</span>
                                <MathRenderer text={answer} />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Solution ── */}
                {showResult && solution && !isTextBlock && (
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
                    src={modalImageSrc}
                    alt={`Hình minh họa câu ${index + 1}`}
                />
            )}
        </div>
    );
}

function DragQuestion({
    content,
    options,
    selected,
    answer,
    activeLetter,
    setActiveLetter,
    showResult,
    disabled,
    onChange,
}) {
    const blanks = getDragBlankIds(content);
    const usedLetters = new Set(Object.values(selected || {}).filter(Boolean));
    const touchDragRef = useRef(null);
    const suppressClickRef = useRef(false);
    const [touchDrag, setTouchDrag] = useState(null);

    const optionText = (letter) => {
        const index = letter ? letter.charCodeAt(0) - 65 : -1;
        return index >= 0 ? (options[index] || letter) : '';
    };

    const handleOptionClick = (letter) => {
        if (disabled) return;
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        setActiveLetter(activeLetter === letter ? null : letter);
    };

    const handleBlankClick = (blankId) => {
        if (disabled) return;
        if (activeLetter) {
            onChange(blankId, activeLetter);
            setActiveLetter(null);
            return;
        }
        if (selected?.[blankId]) onChange(blankId, '');
    };

    const handleDrop = (event, blankId) => {
        if (disabled) return;
        event.preventDefault();
        const letter = event.dataTransfer.getData('text/plain');
        if (letter) onChange(blankId, letter);
        setActiveLetter(null);
    };

    const finishTouchDrag = () => {
        touchDragRef.current = null;
        setTouchDrag(null);
        setActiveLetter(null);
    };

    const getDropBlankId = (x, y) => {
        const target = document.elementFromPoint(x, y);
        return target?.closest('[data-drag-blank-id]')?.dataset.dragBlankId || '';
    };

    const handlePointerDown = (event, letter) => {
        if (disabled || event.pointerType === 'mouse') return;
        touchDragRef.current = {
            letter,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: event.clientX,
            y: event.clientY,
            dragging: false,
            overBlankId: '',
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
        const drag = touchDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const dragging = drag.dragging || Math.hypot(dx, dy) > 6;
        const next = {
            ...drag,
            x: event.clientX,
            y: event.clientY,
            dragging,
            overBlankId: dragging ? getDropBlankId(event.clientX, event.clientY) : '',
        };

        touchDragRef.current = next;
        if (dragging) {
            event.preventDefault();
            setActiveLetter(next.letter);
            setTouchDrag(next);
        }
    };

    const handlePointerUp = (event) => {
        const drag = touchDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        event.currentTarget.releasePointerCapture?.(event.pointerId);
        const overBlankId = drag.dragging ? getDropBlankId(event.clientX, event.clientY) || drag.overBlankId : '';
        if (drag.dragging) {
            event.preventDefault();
            suppressClickRef.current = true;
            window.setTimeout(() => {
                suppressClickRef.current = false;
            }, 0);
            if (overBlankId) onChange(overBlankId, drag.letter);
        }
        finishTouchDrag();
    };

    const handlePointerCancel = (event) => {
        const drag = touchDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        finishTouchDrag();
    };

    const parts = [];
    const regex = /\[\[([^\]\s]+)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content || '')) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'blank', id: match[1].trim() });
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < (content || '').length) {
        parts.push({ type: 'text', text: content.slice(lastIndex) });
    }

    return (
        <div className="et-drag-question">
            <div className="et-drag-content">
                {parts.map((part, index) => {
                    if (part.type === 'text') {
                        return (
                            <span key={`text-${index}`} className="et-drag-text">
                                <MathRenderer text={part.text} />
                            </span>
                        );
                    }

                    const selectedLetter = selected?.[part.id] || '';
                    const correctLetter = answer?.[part.id] || '';
                    const isCorrectBlank = showResult && selectedLetter && selectedLetter === correctLetter;
                    const isWrongBlank = showResult && selectedLetter && correctLetter && selectedLetter !== correctLetter;
                    const isUnansweredBlank = showResult && !selectedLetter;
                    const label = optionText(selectedLetter);
                    const cls = isCorrectBlank ? 'correct' : isWrongBlank ? 'wrong' : isUnansweredBlank ? 'unanswered' : selectedLetter ? 'filled' : '';
                    const isTouchDropTarget = touchDrag?.overBlankId === part.id;

                    return (
                        <span key={`blank-${part.id}-${index}`} className="et-drag-blank-wrap">
                            <button
                                type="button"
                                className={`et-drag-blank ${cls} ${isTouchDropTarget ? 'drop-target' : ''}`}
                                data-drag-blank-id={part.id}
                                onClick={() => handleBlankClick(part.id)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => handleDrop(event, part.id)}
                                disabled={disabled}
                                title={selectedLetter && !disabled ? 'Bấm để xoá đáp án' : 'Thả đáp án vào đây'}
                            >
                                {label ? (
                                    <MathRenderer text={label} />
                                ) : (
                                    <span className="et-drag-placeholder">____</span>
                                )}
                            </button>
                            {showResult && correctLetter && selectedLetter !== correctLetter && (
                                <span className="et-drag-correct">
                                    Đúng: <MathRenderer text={optionText(correctLetter)} />
                                </span>
                            )}
                        </span>
                    );
                })}
                {parts.length === 0 && <MathRenderer text={content} />}
            </div>

            <div className="et-drag-bank" aria-label="Ngân hàng đáp án kéo thả">
                {(options || []).map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    const isActive = activeLetter === letter;
                    const isUsed = usedLetters.has(letter);
                    const isOptionDisabled = disabled || isUsed;
                    return (
                        <button
                            key={letter}
                            type="button"
                            className={`et-drag-chip ${isActive ? 'active' : ''} ${isUsed ? 'used' : ''}`}
                            draggable={!isOptionDisabled}
                            disabled={isOptionDisabled}
                            onClick={() => handleOptionClick(letter)}
                            onPointerDown={(event) => handlePointerDown(event, letter)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', letter);
                                setActiveLetter(letter);
                            }}
                            onDragEnd={() => setActiveLetter(null)}
                            title={disabled ? '' : isUsed ? 'Đáp án này đã được dùng. Bấm ô trống để xoá trước khi dùng lại.' : 'Kéo hoặc bấm để chọn'}
                        >
                            <span className="et-drag-chip-letter">{letter}</span>
                            <span className="et-drag-chip-text"><MathRenderer text={option} /></span>
                        </button>
                    );
                })}
                {blanks.length === 0 && (
                    <div className="et-result-note unanswered">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <div>Chưa tìm thấy ô thả dạng [[1]] trong nội dung câu hỏi.</div>
                    </div>
                )}
            </div>

            {touchDrag?.dragging && (
                <div
                    className="et-drag-chip et-drag-ghost"
                    style={{ left: touchDrag.x, top: touchDrag.y }}
                    aria-hidden="true"
                >
                    <span className="et-drag-chip-letter">{touchDrag.letter}</span>
                    <span className="et-drag-chip-text"><MathRenderer text={optionText(touchDrag.letter)} /></span>
                </div>
            )}
        </div>
    );
}

/* ─── TF Table sub-component ─── */
function getStatementKey(index) {
    return index < 26 ? String.fromCharCode(97 + index) : String(index + 1);
}

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
                    const key = getStatementKey(i);
                    const correctVal = tfAnswer[key]; // 'D' or 'S'
                    const selectedVal = tfSelected[key];
                    const isOk = showResult && selectedVal === correctVal;
                    const isUnanswered = showResult && selectedVal !== 'D' && selectedVal !== 'S';
                    return (
                        <tr key={i} className={showResult ? (isUnanswered ? 'unanswered' : isOk ? 'ok' : 'fail') : ''}>
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
    const bg = correct ? 'var(--et-green)' : wrong ? 'var(--et-red)' : selected ? 'var(--et-blue)' : 'var(--app-surface)';
    const border = correct ? 'var(--et-green)' : wrong ? 'var(--et-red)' : selected ? 'var(--et-blue)' : 'var(--app-border-strong)';
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
