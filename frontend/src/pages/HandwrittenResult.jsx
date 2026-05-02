import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/axios';

function ScoreRing({ pct, size = 130, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

function getGradeInfo(pct) {
  if (pct >= 90) return { grade: 'A+', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct >= 75) return { grade: 'A',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct >= 60) return { grade: 'B',  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'    };
  if (pct >= 50) return { grade: 'C',  color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200'  };
  if (pct >= 35) return { grade: 'D',  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   };
  return               { grade: 'F',  color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     };
}

function getMarkColor(awarded, max) {
  const r = max > 0 ? awarded / max : 0;
  if (r >= 0.8) return 'border-l-emerald-500';
  if (r >= 0.5) return 'border-l-amber-400';
  return 'border-l-red-500';
}

export default function HandwrittenResult() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/handwritten/${id}/`);
        setExam(res.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Loading results…</p>
        </div>
      </div>
    );
  }

  if (notFound || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Result not found.</p>
          <Link to="/handwritten-results" className="mt-4 inline-block text-indigo-600 font-medium">Back to Results</Link>
        </div>
      </div>
    );
  }

  const pct       = Math.round(exam.percentage || 0);
  const gradeInfo = getGradeInfo(pct);
  const grading   = exam.grading_data || {};
  const pieColor  = pct >= 60 ? '#4f46e5' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const isGraded  = exam.obtained_marks != null;

  const pieData = [
    { name: 'Scored', value: exam.obtained_marks || 0 },
    { name: 'Remaining', value: Math.max(0, (exam.total_marks || 0) - (exam.obtained_marks || 0)) },
  ].filter(d => d.value > 0);

  const barData = grading.questions?.map(q => ({
    name: `Q${q.question_number}`,
    Scored: q.marks_awarded,
    Max: q.max_marks,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
        <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1400&q=80"
          alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <Link to="/handwritten-results"
            className="inline-flex items-center gap-2 text-indigo-300 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Handwritten Results
          </Link>

          {isGraded ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <ScoreRing pct={pct} size={130} stroke={11} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{pct}%</span>
                  <span className="text-xs font-bold text-indigo-300">Grade {gradeInfo.grade}</span>
                </div>
              </div>

              {/* Exam info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/30">
                    ✍️ Handwritten
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">{exam.title}</h1>
                <p className="text-indigo-300 mb-4">{exam.subject_name}</p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.obtained_marks}</p>
                    <p className="text-indigo-200 text-xs">Obtained</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.total_marks}</p>
                    <p className="text-indigo-200 text-xs">Total</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center border border-white/10">
                    <p className="text-xl font-bold text-white">{exam.total_marks - exam.obtained_marks}</p>
                    <p className="text-indigo-200 text-xs">Lost</p>
                  </div>
                </div>
              </div>

              {/* Grade badge */}
              <div className="flex-shrink-0 text-center">
                <div className={`w-20 h-20 rounded-2xl ${gradeInfo.bg} border-2 ${gradeInfo.border} flex items-center justify-center`}>
                  <span className={`text-3xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                </div>
                <p className="text-indigo-300 text-xs mt-2">Grade</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-amber-200">{exam.title}</p>
                <p className="text-amber-300/80 text-sm mt-0.5">Your teacher is grading this paper. Check back soon.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {isGraded && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

          {/* Charts */}
          {(pieData.length > 0 || barData.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white text-sm">Score Overview</h3>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value"
                        startAngle={90} endAngle={-270}>
                        <Cell fill={pieColor} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} marks`, n]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {barData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-5 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white text-sm">Question-wise Marks</h3>
                  </div>
                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="Max"    fill="#e0e7ff" name="Max Marks" radius={[4,4,0,0]} />
                        <Bar dataKey="Scored" fill="#6366f1" name="Scored"    radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overall Feedback */}
          {grading.overall_feedback && (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="font-semibold text-white text-sm">Overall Feedback</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed">{grading.overall_feedback}</p>
              </div>
            </div>
          )}

          {/* Insights */}
          {(grading.strengths?.length > 0 || grading.weaknesses?.length > 0 || grading.recommendations?.length > 0) && (
            <div className="grid md:grid-cols-3 gap-4">
              {grading.strengths?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Strengths</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {grading.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 font-bold">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {grading.weaknesses?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Areas to Improve</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {grading.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 font-bold">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {grading.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
                    <h3 className="font-semibold text-white text-sm">Recommendations</h3>
                  </div>
                  <ul className="p-5 space-y-2">
                    {grading.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5 font-bold">*</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Per-question breakdown */}
          {grading.questions?.length > 0 && (
            <div>
              <button
                onClick={() => document.getElementById('hw-questions').classList.toggle('hidden')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Question Breakdown
              </button>

              <div id="hw-questions" className="space-y-4">
                {grading.questions.map((q, i) => {
                  const strip = getMarkColor(q.marks_awarded, q.max_marks);
                  const full  = q.marks_awarded >= q.max_marks;
                  const part  = !full && q.marks_awarded > 0;
                  return (
                    <div key={i} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${strip} overflow-hidden`}>
                      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                            {q.question_number}
                          </span>
                          <span className="text-sm text-gray-400">Question {i + 1}</span>
                        </div>
                        <span className={`font-bold text-sm ${full ? 'text-emerald-600' : part ? 'text-amber-600' : 'text-red-600'}`}>
                          {q.marks_awarded}/{q.max_marks} marks
                        </span>
                      </div>
                      <div className="p-5 space-y-3">
                        <p className="font-medium text-gray-800 text-sm">{q.question_text}</p>
                        {q.student_answer && (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium mb-1">Your Answer</p>
                            <p className="text-sm text-gray-800">{q.student_answer}</p>
                          </div>
                        )}
                        {q.correct_answer && (
                          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-medium mb-1">Expected Answer</p>
                            <p className="text-sm text-gray-800">{q.correct_answer}</p>
                          </div>
                        )}
                        {q.feedback && (
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium mb-1">AI Feedback</p>
                            <p className="text-sm text-gray-800">{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link to="/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm text-sm">
              Back to Dashboard
            </Link>
            <Link to="/handwritten-results"
              className="px-6 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold rounded-xl transition-all text-sm">
              All Results
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
