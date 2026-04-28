import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';

function ScoreRing({ pct, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

const GRADING_LABEL = {
  NOT_STARTED: 'Preparing to grade…',
  PENDING_REVIEW: 'Waiting for Teacher Review',
  GRADING_MCQ: 'Grading MCQs…',
  GRADING_DESCRIPTIVE: 'AI Grading Descriptive Answers…',
  ANALYZING: 'Generating Analysis…',
  COMPLETED: 'Complete',
  FAILED: 'Grading Failed',
};

function getGradeInfo(pct) {
  if (pct >= 90) return { grade: 'A+', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct >= 80) return { grade: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (pct >= 60) return { grade: 'C', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
  if (pct >= 40) return { grade: 'D', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
}

export default function ExamResult() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const fetchResult = async () => {
    try {
      const res = await api.get(`/api/exams/${examId}/result/`);
      setExam(res.data);
      if (['NOT_STARTED', 'GRADING_MCQ', 'GRADING_DESCRIPTIVE', 'ANALYZING'].includes(res.data.grading_status)) {
        setPolling(true);
      } else {
        setPolling(false);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResult(); }, [examId]);
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchResult, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading && !exam) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Loading results…</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Exam not found.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-indigo-600 font-medium">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isPendingReview = exam.grading_status === 'PENDING_REVIEW';
  const isGrading = ['NOT_STARTED', 'GRADING_MCQ', 'GRADING_DESCRIPTIVE', 'ANALYZING'].includes(exam.grading_status);
  const pct = Math.round(exam.percentage || 0);
  const gradeInfo = getGradeInfo(pct);

  const typeBreakdown = exam.analysis?.question_type_breakdown || exam.analysis_data?.question_type_breakdown || {};
  const diffBreakdown = exam.analysis?.difficulty_breakdown || exam.analysis_data?.difficulty_breakdown || {};
  const analysis = exam.analysis || {};

  const typeChartData = Object.entries(typeBreakdown).map(([key, val]) => ({
    name: key === 'MCQ' ? 'MCQ' : key === 'SHORT' ? 'Short' : 'Long',
    obtained: val.marks_obtained,
    total: val.total_marks,
  }));
  const diffChartData = Object.entries(diffBreakdown).map(([key, val]) => ({
    name: key,
    percentage: val.percentage,
  }));
  const pieData = [
    { name: 'Correct', value: exam.correct_answers },
    { name: 'Wrong', value: exam.wrong_answers },
    { name: 'Unanswered', value: exam.unanswered },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1400&q=80')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute top-10 right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-violet-500/20 rounded-full blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <Link to="/history" className="inline-flex items-center gap-2 text-indigo-300 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exam History
          </Link>

          {/* Pending / grading banners */}
          {isPendingReview && (
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-6 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-amber-200">Exam Submitted Successfully</p>
                <p className="text-amber-300/80 text-sm mt-0.5">Your teacher will review and grade your answers. Check back soon.</p>
              </div>
            </div>
          )}

          {isGrading && (
            <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-2xl p-6 mb-6 flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-400 border-t-transparent flex-shrink-0" />
              <div>
                <p className="font-semibold text-indigo-200">{GRADING_LABEL[exam.grading_status]}</p>
                <p className="text-indigo-300/70 text-sm mt-0.5">This may take a minute for descriptive answers</p>
              </div>
            </div>
          )}

          {!isPendingReview && !isGrading && (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <ScoreRing pct={pct} size={130} stroke={11} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{pct}%</span>
                  <span className={`text-xs font-bold ${gradeInfo.color.replace('text-', 'text-').replace('600', '300')}`}>
                    Grade {gradeInfo.grade}
                  </span>
                </div>
              </div>

              {/* Exam info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white mb-1">{exam.subject_name}</h1>
                <p className="text-indigo-300 mb-4">
                  {exam.exam_type_name}{exam.chapter_name ? ` · ${exam.chapter_name}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-3 max-w-sm">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.mcq_score ?? '-'}</p>
                    <p className="text-indigo-200 text-xs">MCQ /20</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.short_answer_score ?? '-'}</p>
                    <p className="text-indigo-200 text-xs">Short /10</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.long_answer_score ?? '-'}</p>
                    <p className="text-indigo-200 text-xs">Long /20</p>
                  </div>
                </div>
              </div>

              {/* Grade badge */}
              <div className="flex-shrink-0 text-center">
                <div className={`w-20 h-20 rounded-2xl ${gradeInfo.bg} border-2 ${gradeInfo.border} flex items-center justify-center`}>
                  <span className={`text-3xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                </div>
                <p className={`text-sm font-semibold mt-2 ${gradeInfo.color}`}>Grade</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {!isPendingReview && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Stat tiles */}
          {!isGrading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Correct', value: exam.correct_answers, color: 'bg-emerald-50 border-emerald-100', val: 'text-emerald-700' },
                { label: 'Wrong', value: exam.wrong_answers, color: 'bg-red-50 border-red-100', val: 'text-red-600' },
                { label: 'Unanswered', value: exam.unanswered, color: 'bg-gray-50 border-gray-100', val: 'text-gray-500' },
                { label: 'Percentile', value: analysis.percentile ? `${analysis.percentile}%` : '—', color: 'bg-indigo-50 border-indigo-100', val: 'text-indigo-700' },
              ].map(({ label, value, color, val }) => (
                <div key={label} className={`bg-white rounded-2xl p-5 shadow-sm border ${color} text-center`}>
                  <p className={`text-2xl font-bold ${val}`}>{value}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {!isGrading && (typeChartData.length > 0 || pieData.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {typeChartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-5 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white text-sm">Marks by Question Type</h3>
                  </div>
                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={typeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="obtained" fill="#6366f1" name="Obtained" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total" fill="#e2e8f0" name="Total" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {pieData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-5 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white text-sm">Answer Distribution</h3>
                  </div>
                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={['#10b981', '#ef4444', '#94a3b8'][i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Difficulty breakdown */}
          {diffChartData.length > 0 && !isGrading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-violet-900 px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white text-sm">Performance by Difficulty</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={diffChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="percentage" fill="#8b5cf6" name="Score %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Insights */}
          {!isGrading && (analysis.strengths?.length > 0 || analysis.weaknesses?.length > 0 || analysis.recommendations?.length > 0) && (
            <div className="grid md:grid-cols-3 gap-4">
              {analysis.strengths?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Strengths</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 font-bold">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.weaknesses?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Areas to Improve</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 font-bold">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Suggestions</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {analysis.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5 font-bold">*</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions */}
          {exam.suggestions && !isGrading && (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold text-white text-sm">AI Suggestions</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{exam.suggestions}</p>
              </div>
            </div>
          )}

          {/* Answer review toggle */}
          {!isGrading && (
            <div>
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAnswers ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
                </svg>
                {showAnswers ? 'Hide Answers' : 'Review Answers'}
              </button>
            </div>
          )}

          {/* Answer cards */}
          {showAnswers && exam.answers && (
            <div className="space-y-4">
              {exam.answers.map((ans, i) => {
                const correct = ans.is_correct;
                const partial = !correct && ans.marks_obtained > 0;
                const strip = correct ? 'border-l-emerald-500' : partial ? 'border-l-amber-400' : 'border-l-red-500';
                return (
                  <div key={ans.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${strip} overflow-hidden`}>
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          ans.question.question_type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                          ans.question.question_type === 'SHORT' ? 'bg-amber-100 text-amber-700' :
                          'bg-violet-100 text-violet-700'
                        }`}>
                          {ans.question.question_type}
                        </span>
                        <span className="text-sm text-gray-400">Q{i + 1}</span>
                      </div>
                      <span className={`font-bold text-sm ${correct ? 'text-emerald-600' : partial ? 'text-amber-600' : 'text-red-600'}`}>
                        {ans.marks_obtained}/{ans.question.marks} marks
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="font-medium text-gray-800 text-sm">{ans.question.question_text}</p>

                      {ans.question.question_type === 'MCQ' ? (
                        <div className="space-y-1.5">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const text = ans.question[`option_${opt.toLowerCase()}`];
                            if (!text) return null;
                            const isCorrect = opt === ans.question.correct_answer;
                            const isSelected = opt === ans.selected_answer;
                            return (
                              <div key={opt} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                                isCorrect ? 'bg-emerald-50 border border-emerald-200' :
                                isSelected && !isCorrect ? 'bg-red-50 border border-red-200' :
                                'bg-gray-50 border border-transparent'
                              }`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  isCorrect ? 'bg-emerald-500 text-white' :
                                  isSelected && !isCorrect ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>{opt}</span>
                                <span className={isCorrect ? 'text-emerald-800' : isSelected && !isCorrect ? 'text-red-700' : 'text-gray-600'}>
                                  {text}
                                  {isCorrect && <span className="ml-2 text-xs text-emerald-600 font-medium">(correct)</span>}
                                  {isSelected && !isCorrect && <span className="ml-2 text-xs text-red-600 font-medium">(your answer)</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium mb-1">Your Answer</p>
                            <p className="text-sm text-gray-800">{ans.text_answer || 'No answer provided'}</p>
                          </div>
                          {ans.question.model_answer && (
                            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                              <p className="text-xs text-emerald-600 font-medium mb-1">Model Answer</p>
                              <p className="text-sm text-gray-800">{ans.question.model_answer}</p>
                            </div>
                          )}
                          {ans.ai_feedback && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                              <p className="text-xs text-blue-600 font-medium mb-1">AI Feedback</p>
                              <p className="text-sm text-gray-800">{ans.ai_feedback}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {ans.question.explanation && (
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <p className="text-xs text-amber-700 font-medium mb-1">Explanation</p>
                          <p className="text-sm text-gray-700">{ans.question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/history"
              className="px-6 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold rounded-xl transition-all text-sm"
            >
              Exam History
            </Link>
          </div>
        </div>
      )}

      {/* Pending review actions */}
      {isPendingReview && (
        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-3">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
