'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import MathRenderer from './MathRenderer';

const FOLLOW_UP_LIMIT = 2;

function getMessageText(message) {
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  return message?.content || '';
}

export default function PracticeAIChatbox({
  isOpen,
  onClose,
  questionKey,
  questionData,
  questionNumber,
}) {
  const [input, setInput] = useState('');
  // Global follow-up count — shared across ALL questions, never resets until page unload
  const [followUpCount, setFollowUpCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Cache: questionKey → { messages, initialRequested }
  const cacheRef = useRef(new Map());
  // Track which questionKey we've already sent the initial hint for
  const requestedKeysRef = useRef(new Set());
  // Track the current questionKey to safely save messages
  const currentKeyRef = useRef(questionKey);
  const [timeoutError, setTimeoutError] = useState(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: 'api/chat' }), []);

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    clearError,
  } = useChat({
    transport,
    experimental_throttle: 60,
  });

  useEffect(() => () => stop(), [stop]);

  // ── Sync cache with messages & handle question switching safely ──
  useEffect(() => {
    const prev = currentKeyRef.current;
    const next = questionKey;

    if (prev !== next) {
      // Question changed
      if (status === 'streaming' || status === 'submitted') {
        stop();
      }

      // Save messages to old question's cache
      if (prev && messages.length > 0) {
        cacheRef.current.set(prev, { messages: [...messages] });
      }

      // Load new question's cache
      const cached = cacheRef.current.get(next);
      if (cached && cached.messages.length > 0) {
        setMessages(cached.messages);
      } else {
        setMessages([]);
      }

      currentKeyRef.current = next;
    } else {
      // Same question, messages streaming in
      if (next && messages.length > 0) {
        cacheRef.current.set(next, { messages: [...messages] });
      }
    }
  }, [questionKey, messages, status, stop, setMessages]);

  // ── 60-Second Timeout Monitor ──
  useEffect(() => {
    let timeoutId;
    
    // Start or restart timeout only when AI is busy waiting for response or streaming
    if (status === 'submitted' || status === 'streaming') {
      timeoutId = setTimeout(() => {
        stop();
        setTimeoutError('Kết nối AI quá chậm. Vui lòng thử lại.');
      }, 60000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages, status, stop]);

  // ── Send initial hint for a new question (only once per questionKey) ──
  useEffect(() => {
    if (!isOpen || !questionKey || !questionData || status !== 'ready') return;
    if (requestedKeysRef.current.has(questionKey)) return;
    // If we already have cached messages for this question, don't re-request
    const cached = cacheRef.current.get(questionKey);
    if (cached && cached.messages.length > 0) return;
    // If messages are already loaded (from cache restore), skip
    if (messages.length > 0) return;

    requestedKeysRef.current.add(questionKey);
    sendMessage(
      {
        text: 'Hãy tạo một gợi ý đầu tiên cho câu hỏi này. Không nêu trực tiếp đáp án cuối cùng.',
        metadata: { requestType: 'initial-hint' },
      },
      {
        body: {
          questionData,
          requestType: 'initial-hint',
          followUpCount: 0,
        },
      },
    );
  }, [isOpen, questionKey, questionData, status, messages.length, sendMessage]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  const visibleMessages = messages.filter(
    (message) => !(message.role === 'user' && message.metadata?.requestType === 'initial-hint'),
  );
  const isBusy = status === 'submitted' || status === 'streaming';
  const isLimitReached = followUpCount >= FOLLOW_UP_LIMIT;
  const canSubmit = input.trim() && !isBusy && !isLimitReached;

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy || isLimitReached) return;

    const nextCount = followUpCount + 1;
    setFollowUpCount(nextCount);
    setInput('');
    clearError();
    setTimeoutError(null);

    sendMessage(
      {
        text,
        metadata: { requestType: 'follow-up' },
      },
      {
        body: {
          questionData,
          requestType: 'follow-up',
          followUpCount: nextCount,
        },
      },
    ).catch(() => {
      setFollowUpCount((count) => Math.max(0, count - 1));
    });
  };

  const handleRetryInitialHint = () => {
    clearError();
    setTimeoutError(null);
    // Remove from requested set so it can re-fire
    requestedKeysRef.current.delete(questionKey);
    cacheRef.current.delete(questionKey);
    setMessages([]);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-black/25 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-dvh w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">Trợ lý gợi ý</div>
              <div className="truncate text-xs font-semibold text-gray-400">
                {questionNumber ? `Câu ${questionNumber}` : 'Chế độ ôn luyện'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Đóng trợ lý"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          {visibleMessages.length === 0 && !error && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tạo gợi ý...
            </div>
          )}

          <div className="flex flex-col gap-3">
            {visibleMessages.map((message) => {
              const text = getMessageText(message);
              if (!text) return null;

              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-200 bg-white text-gray-800'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <MathRenderer text={text} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isBusy && visibleMessages.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Trợ lý đang trả lời...
            </div>
          )}

          {error && !timeoutError && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
              Không thể tạo gợi ý lúc này.
              <button
                type="button"
                onClick={handleRetryInitialHint}
                className="ml-2 font-bold underline decoration-red-300 underline-offset-2"
              >
                Thử lại
              </button>
            </div>
          )}

          {timeoutError && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
              {timeoutError}
              <button
                type="button"
                onClick={handleRetryInitialHint}
                className="ml-2 font-bold underline decoration-red-300 underline-offset-2"
              >
                Chạy lại AI
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-gray-500">
            <span>{FOLLOW_UP_LIMIT - followUpCount} lượt hỏi thêm còn lại</span>
            {isBusy && (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg px-2 py-1 font-bold text-gray-600 hover:bg-gray-100"
              >
                Dừng
              </button>
            )}
          </div>

          {isLimitReached ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              Bạn đã hết lượt hỏi thêm.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                disabled={isBusy}
                placeholder="Hỏi thêm về bước giải..."
                className="min-h-11 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                aria-label="Gửi câu hỏi"
              >
                {isBusy ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}
