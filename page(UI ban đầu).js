'use client';

import { useState, useCallback } from 'react';
import { parseQuizText } from '@/lib/parser';
import FileUpload from '@/components/FileUpload';
import QuestionCard from '@/components/QuestionCard';
import ResultsView from '@/components/ResultsView';
import Timer from '@/components/Timer';
import {
  BookOpen, Play, Send, ArrowLeft, Settings,
  FileQuestion, Sparkles, Clock, BarChart3
} from 'lucide-react';

// App states
const STATE = {
  UPLOAD: 'upload',
  PREVIEW: 'preview',
  QUIZ: 'quiz',
  RESULTS: 'results',
};

export default function Home() {
  const [appState, setAppState] = useState(STATE.UPLOAD);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [fileName, setFileName] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [parseError, setParseError] = useState('');

  // Handle file loaded from upload component
  const handleFileLoaded = useCallback((text, name) => {
    setParseError('');
    try {
      const parsed = parseQuizText(text);
      if (parsed.length === 0) {
        setParseError('Không tìm thấy câu hỏi nào. Kiểm tra định dạng file (====START==== / ====END====).');
        return;
      }
      setQuestions(parsed);
      setFileName(name);
      setAnswers({});
      setAppState(STATE.PREVIEW);
    } catch (err) {
      setParseError('Lỗi khi đọc file: ' + err.message);
    }
  }, []);

  // Start quiz
  const startQuiz = useCallback(() => {
    setAnswers({});
    setTimerRunning(true);
    setAppState(STATE.QUIZ);
  }, []);

  // Handle answer change
  const handleAnswerChange = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  // Submit quiz
  const submitQuiz = useCallback(() => {
    setTimerRunning(false);
    setAppState(STATE.RESULTS);
  }, []);

  // Reset everything
  const resetAll = useCallback(() => {
    setQuestions([]);
    setAnswers({});
    setFileName('');
    setTimerRunning(false);
    setParseError('');
    setAppState(STATE.UPLOAD);
  }, []);

  // Time up handler
  const handleTimeUp = useCallback(() => {
    setTimerRunning(false);
    setAppState(STATE.RESULTS);
  }, []);

  // Count answered questions
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== undefined).length;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appState !== STATE.UPLOAD && (
              <button
                onClick={resetAll}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                YeuHoc
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {appState === STATE.QUIZ && (
              <>
                <Timer
                  initialMinutes={timerMinutes}
                  onTimeUp={handleTimeUp}
                  isRunning={timerRunning}
                />
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-white/40">
                  <BarChart3 className="w-4 h-4" />
                  <span>{answeredCount}/{questions.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ===== UPLOAD STATE ===== */}
        {appState === STATE.UPLOAD && (
          <div className="animate-fadeIn space-y-8">
            {/* Hero */}
            <div className="text-center space-y-4 py-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <Sparkles className="w-4 h-4" />
                Hỗ trợ LaTeX & Chấm điểm tự động
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white">
                Trắc nghiệm{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Tương tác
                </span>
              </h2>
              <p className="text-white/50 text-lg max-w-xl mx-auto">
                Tải lên file .txt để tạo đề thi trắc nghiệm chuyên nghiệp với công thức toán, đếm giờ và chấm điểm.
              </p>
            </div>

            {/* Upload Zone */}
            <FileUpload onFileLoaded={handleFileLoaded} />

            {parseError && (
              <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {parseError}
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-8">
              {[
                { icon: FileQuestion, title: 'Trắc nghiệm & Tự luận', desc: 'Hỗ trợ Trắc Nghiệm và Trả lời ngắn' },
                { icon: Sparkles, title: 'Công thức LaTeX', desc: 'Render toán học chuyên nghiệp' },
                { icon: Clock, title: 'Đếm giờ tự động', desc: 'Hẹn giờ và tự nộp bài' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
                  <Icon className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="font-medium text-white/80 text-sm">{title}</p>
                  <p className="text-xs text-white/40">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PREVIEW STATE ===== */}
        {appState === STATE.PREVIEW && (
          <div className="animate-slideUp space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{fileName}</h2>
                <p className="text-white/50 text-sm mt-1">
                  {questions.length} câu hỏi đã được nhận diện
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Timer config */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <Settings className="w-4 h-4 text-white/40" />
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                    className="w-14 bg-transparent text-white text-sm text-center focus:outline-none"
                  />
                  <span className="text-white/40 text-sm">phút</span>
                </div>

                <button
                  onClick={startQuiz}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
                >
                  <Play className="w-4 h-4" />
                  Bắt đầu làm bài
                </button>
              </div>
            </div>

            {/* Question preview list */}
            <div className="space-y-4">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  selectedAnswer=""
                  onAnswerChange={() => { }}
                  disabled={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== QUIZ STATE ===== */}
        {appState === STATE.QUIZ && (
          <div className="animate-slideUp space-y-6">
            <div className="space-y-4">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  selectedAnswer={answers[q.id] || ''}
                  onAnswerChange={(val) => handleAnswerChange(q.id, val)}
                />
              ))}
            </div>

            {/* Submit bar */}
            <div className="sticky bottom-0 py-4">
              <div className="glass rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-white/50">
                  Đã trả lời{' '}
                  <span className="text-indigo-400 font-medium">{answeredCount}</span>
                  /{questions.length} câu
                </p>
                <button
                  onClick={submitQuiz}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25"
                >
                  <Send className="w-4 h-4" />
                  Nộp bài
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== RESULTS STATE ===== */}
        {appState === STATE.RESULTS && (
          <div className="animate-slideUp space-y-6">
            <ResultsView
              questions={questions}
              answers={answers}
              onReset={resetAll}
            />

            {/* Detailed review */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white/80">Chi tiết bài làm</h3>
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  selectedAnswer={answers[q.id] || ''}
                  onAnswerChange={() => { }}
                  showResult={true}
                  disabled={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
