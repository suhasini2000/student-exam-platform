import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

function gradeBadge(pct) {
  if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', ring: '#10b981' };
  if (pct >= 75) return { label: 'A',  cls: 'bg-green-100 text-green-700 border-green-200',     ring: '#22c55e' };
  if (pct >= 60) return { label: 'B',  cls: 'bg-blue-100 text-blue-700 border-blue-200',        ring: '#3b82f6' };
  if (pct >= 50) return { label: 'C',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',  ring: '#eab308' };
  if (pct >= 35) return { label: 'D',  cls: 'bg-orange-100 text-orange-700 border-orange-200',  ring: '#f97316' };
  return               { label: 'F',  cls: 'bg-red-100 text-red-700 border-red-200',            ring: '#ef4444' };
}

function ScoreRing({ pct, size = 80 }) {
  const grade = gradeBadge(pct);
  const r = 34; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={grade.ring} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x="40" y="37" textAnchor="middle" dominantBaseline="middle"
        fill="#1e293b" fontSize="13" fontWeight="800">{pct}%</text>
      <text x="40" y="52" textAnchor="middle" dominantBaseline="middle"
        fill="#94a3b8" fontSize="9">{grade.label}</text>
    </svg>
  );
}

function InsightCard({ icon, title, items, bg, border, iconBg, textCls }) {
  if (!items?.length) return null;
  return (
    <div className={`${bg} ${border} border-2 rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center text-sm shrink-0`}>{icon}</div>
        <p className={`text-sm font-bold ${textCls}`}>{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className={`text-xs ${textCls} opacity-90 flex items-start gap-1.5`}>
            <span className="mt-0.5 shrink-0">•</span>{s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getMarkColor(awarded, max) {
  const r = max > 0 ? awarded / max : 0;
  if (r >= 0.8) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (r >= 0.5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

export default function HandwrittenResults() {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    api.get('/api/handwritten/my/')
      .then((res) => setExams(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expandId = Number(searchParams.get('expand'));
    if (expandId && !loading) {
      setExpanded(expandId);
      setTimeout(() => {
        cardRefs.current[expandId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [loading, searchParams]);

  const gradedExams = exams.filter(e => e.obtained_marks != null);
  const avgPct = gradedExams.length
    ? Math.round(gradedExams.reduce((s, e) => s + (e.percentage || 0), 0) / gradedExams.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Loading results…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
        <img
          src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">My Results</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">Handwritten Results</h1>
          <p className="text-indigo-200 text-sm mb-6">AI-graded handwritten answer sheets</p>

          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Sheets',  value: exams.length,       color: 'bg-white/10 border-white/20',             text: 'text-white'       },
              { label: 'Graded',        value: gradedExams.length,  color: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-200' },
              { label: 'Pending',       value: exams.length - gradedExams.length, color: 'bg-amber-500/20 border-amber-400/30', text: 'text-amber-200' },
              { label: 'Avg Score',     value: `${avgPct}%`,        color: 'bg-indigo-500/30 border-indigo-400/40',   text: 'text-indigo-200'  },
            ].map(({ label, value, color, text }) => (
              <div key={label} className={`${color} border rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]`}>
                <p className={`text-xl font-extrabold ${text}`}>{value}</p>
                <p className="text-white/50 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl
                            flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-bold text-lg">No Graded Sheets Yet</p>
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
              Your teacher will upload and grade your handwritten answer sheets. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {exams.map((exam) => {
              const pct        = Math.round(exam.percentage || 0);
              const grade      = gradeBadge(pct);
              const isExpanded = expanded === exam.id;
              const grading    = exam.grading_data || {};
              const pieColor   = pct >= 60 ? '#4f46e5' : pct >= 40 ? '#f59e0b' : '#ef4444';
              const stripCls   = pct >= 75 ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                               : pct >= 60 ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                               : pct >= 40 ? 'bg-gradient-to-b from-yellow-400 to-amber-500'
                               : 'bg-gradient-to-b from-red-400 to-red-600';
              const isGraded   = exam.obtained_marks != null;

              const CardWrapper = isGraded ? Link : 'div';
              const cardProps = isGraded
                ? { to: `/handwritten-result/${exam.id}` }
                : { onClick: () => setExpanded(isExpanded ? null : exam.id) };

              return (
                <div key={exam.id}
                  ref={el => { cardRefs.current[exam.id] = el; }}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                    isExpanded ? 'border-indigo-300 ring-2 ring-indigo-100 lg:col-span-2' : 'border-gray-100'
                  }`}>

                  {/* ── Card Header ── */}
                  <CardWrapper
                    {...cardProps}
                    className="flex cursor-pointer hover:bg-slate-50/60 transition"
                  >
                    {/* Left color strip */}
                    <div className={`w-1.5 shrink-0 ${stripCls}`} />

                    <div className="flex-1 px-5 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title + badge */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-gray-800 text-base truncate">{exam.title}</h3>
                            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 shrink-0">
                              ✍️ Handwritten
                            </span>
                          </div>

                          {/* Subject */}
                          <p className="text-sm text-gray-500 mb-2">{exam.subject_name}</p>

                          {/* Score bar */}
                          {isGraded && (
                            <div className="flex items-center gap-2 max-w-xs">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(to right, ${pieColor}, ${pieColor}cc)` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-600 w-9 text-right">{pct}%</span>
                            </div>
                          )}

                          {/* Date */}
                          <p className="text-xs text-gray-400 mt-2">
                            📅 {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        {/* Right: score */}
                        <div className="flex items-center gap-4 shrink-0">
                          {isGraded ? (
                            <div className="text-right">
                              <p className={`text-3xl font-extrabold ${
                                pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'
                              }`}>{pct}%</p>
                              <p className="text-xs text-gray-400 mt-0.5">{exam.obtained_marks}/{exam.total_marks} marks</p>
                              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${grade.cls}`}>
                                Grade {grade.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                              Pending
                            </span>
                          )}

                          <svg className={`w-5 h-5 text-gray-300 transition-transform shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </CardWrapper>

                  {/* ── Expanded Panel (pending only) ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gradient-to-br from-indigo-50/60 via-violet-50/40 to-slate-50 p-5 space-y-5">

                      {/* Score summary cards */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Obtained', value: exam.obtained_marks ?? '—', grad: 'from-indigo-500 to-violet-600' },
                          { label: 'Total',    value: exam.total_marks    ?? '—', grad: 'from-slate-500 to-slate-700'   },
                          { label: 'Score',    value: `${pct}%`,                  grad: pct >= 60 ? 'from-emerald-500 to-teal-600' : pct >= 40 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-600' },
                        ].map(({ label, value, grad }) => (
                          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mx-auto mb-2`}>
                              <span className="text-white text-xs font-bold">{label[0]}</span>
                            </div>
                            <p className="text-2xl font-extrabold text-gray-800">{value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Charts */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Score Overview</p>
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Scored', value: exam.obtained_marks || 0 },
                                  { name: 'Lost',   value: Math.max(0, (exam.total_marks || 0) - (exam.obtained_marks || 0)) },
                                ]}
                                cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                                dataKey="value" startAngle={90} endAngle={-270}
                              >
                                <Cell fill={pieColor} />
                                <Cell fill="#e5e7eb" />
                              </Pie>
                              <Tooltip formatter={(v, n) => [`${v} marks`, n]} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {grading.questions?.length > 0 && (
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Question-wise Marks</p>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart
                                data={grading.questions.map(q => ({
                                  name: `Q${q.question_number}`,
                                  Scored: q.marks_awarded,
                                  Max: q.max_marks,
                                }))}
                                margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Bar dataKey="Max"    fill="#e0e7ff" radius={[4,4,0,0]} />
                                <Bar dataKey="Scored" fill="#4f46e5" radius={[4,4,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Overall Feedback */}
                      {grading.overall_feedback && (
                        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">💬</div>
                            <p className="text-sm font-bold text-indigo-800">Overall Feedback</p>
                          </div>
                          <p className="text-sm text-indigo-700 leading-relaxed">{grading.overall_feedback}</p>
                        </div>
                      )}

                      {/* Insight cards */}
                      <div className="grid md:grid-cols-3 gap-3">
                        <InsightCard
                          icon="💪" title="Strengths"
                          items={grading.strengths}
                          bg="bg-emerald-50" border="border-emerald-100"
                          iconBg="bg-emerald-100" textCls="text-emerald-800"
                        />
                        <InsightCard
                          icon="📈" title="Areas to Improve"
                          items={grading.weaknesses}
                          bg="bg-red-50" border="border-red-100"
                          iconBg="bg-red-100" textCls="text-red-800"
                        />
                        <InsightCard
                          icon="🎯" title="Recommendations"
                          items={grading.recommendations}
                          bg="bg-blue-50" border="border-blue-100"
                          iconBg="bg-blue-100" textCls="text-blue-800"
                        />
                      </div>

                      {/* Per-question breakdown */}
                      {grading.questions?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Question Breakdown</p>
                          <div className="space-y-3">
                            {grading.questions.map((q, i) => {
                              const markCls = getMarkColor(q.marks_awarded, q.max_marks);
                              return (
                                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-start gap-2">
                                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {q.question_number}
                                      </span>
                                      <p className="text-sm font-semibold text-gray-800">{q.question_text}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${markCls}`}>
                                      {q.marks_awarded}/{q.max_marks}
                                    </span>
                                  </div>
                                  {q.student_answer && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      <span className="font-semibold text-gray-600">Your Answer:</span> {q.student_answer}
                                    </p>
                                  )}
                                  {q.correct_answer && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      <span className="font-semibold text-gray-600">Expected:</span> {q.correct_answer}
                                    </p>
                                  )}
                                  {q.feedback && (
                                    <p className="text-xs text-indigo-600 mt-1.5 font-medium">{q.feedback}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
