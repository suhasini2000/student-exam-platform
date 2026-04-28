import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function gradeBadge(pct) {
  if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (pct >= 75) return { label: 'A',  cls: 'bg-green-100 text-green-700 border-green-200'   };
  if (pct >= 60) return { label: 'B',  cls: 'bg-blue-100 text-blue-700 border-blue-200'     };
  if (pct >= 50) return { label: 'C',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  if (pct >= 35) return { label: 'D',  cls: 'bg-orange-100 text-orange-700 border-orange-200' };
  return               { label: 'F',  cls: 'bg-red-100 text-red-700 border-red-200'        };
}

function ScoreBar({ pct }) {
  const color = pct >= 75 ? 'from-emerald-400 to-emerald-600'
    : pct >= 60 ? 'from-blue-400 to-blue-600'
    : pct >= 40 ? 'from-yellow-400 to-amber-500'
    : 'from-red-400 to-red-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

const TABS = ['All', 'Online', 'Handwritten'];

export default function ExamHistory() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [histRes, hwRes] = await Promise.all([
          api.get('/api/exams/history/', { params: { page_size: 100 } }),
          api.get('/api/handwritten/my/').catch(() => ({ data: [] })),
        ]);
        const online = (histRes.data.results || histRes.data).map(e => ({
          ...e, _type: 'online', _date: e.completed_at,
        }));
        const hw = (hwRes.data.results || hwRes.data).map(e => ({
          ...e, _type: 'handwritten', _date: e.created_at,
        }));
        const combined = [...online, ...hw].sort((a, b) => new Date(b._date) - new Date(a._date));
        setExams(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = exams.filter(e =>
    activeTab === 'All' ? true :
    activeTab === 'Online' ? e._type === 'online' :
    e._type === 'handwritten'
  );

  const onlineExams = exams.filter(e => e._type === 'online');
  const hwExams     = exams.filter(e => e._type === 'handwritten');
  const avgPct = exams.length > 0
    ? Math.round(exams.reduce((s, e) => s + (e.percentage || 0), 0) / exams.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Loading history…</p>
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
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">My Performance</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">Exam History</h1>
          <p className="text-indigo-200 text-sm mb-6">All your completed exams in one place</p>

          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Exams',   value: exams.length,       color: 'bg-white/10 border-white/20',             text: 'text-white'        },
              { label: 'Online',        value: onlineExams.length,  color: 'bg-indigo-500/30 border-indigo-400/40',   text: 'text-indigo-200'   },
              { label: 'Handwritten',   value: hwExams.length,      color: 'bg-violet-500/30 border-violet-400/40',   text: 'text-violet-200'   },
              { label: 'Avg Score',     value: `${avgPct}%`,        color: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-200'  },
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
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl
                            flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-700 font-bold text-lg mb-2">No Exams Taken Yet</p>
            <p className="text-gray-400 text-sm mb-6">Your completed exams will appear here.</p>
            <Link to="/subjects"
              className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                         px-6 py-2.5 rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition shadow">
              Take Your First Exam
            </Link>
          </div>
        ) : (
          <>
            {/* ── TABS ── */}
            <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-2xl p-1.5 mb-6 w-fit">
              {TABS.map((tab) => {
                const count = tab === 'All' ? exams.length : tab === 'Online' ? onlineExams.length : hwExams.length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── EXAM LIST ── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-gray-400 text-sm">No {activeTab.toLowerCase()} exams found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((exam) => {
                  const isHw  = exam._type === 'handwritten';
                  const pct   = Math.round(exam.percentage || 0);
                  const grade = gradeBadge(pct);
                  const linkTo = isHw ? `/handwritten-result/${exam.id}` : `/result/${exam.id}`;
                  const dateStr = new Date(exam._date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  });

                  return (
                    <Link key={`${exam._type}-${exam.id}`} to={linkTo}
                      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm
                                 hover:shadow-md hover:border-indigo-100 transition-all overflow-hidden">
                      <div className="flex">
                        {/* Left color strip */}
                        <div className={`w-1.5 shrink-0 ${
                          pct >= 75 ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' :
                          pct >= 60 ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
                          pct >= 40 ? 'bg-gradient-to-b from-yellow-400 to-amber-500' :
                          'bg-gradient-to-b from-red-400 to-red-600'
                        }`} />

                        <div className="flex-1 px-5 py-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Title + type badge */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-gray-800 text-base">
                                  {isHw ? exam.title : exam.subject_name}
                                </h3>
                                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                  isHw
                                    ? 'bg-violet-100 text-violet-700 border-violet-200'
                                    : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                }`}>
                                  {isHw ? '✍️ Handwritten' : '💻 Online'}
                                </span>
                              </div>

                              {/* Subject / chapter */}
                              <p className="text-sm text-gray-500 mb-2">
                                {exam.subject_name}
                                {!isHw && exam.chapter_name ? ` · ${exam.chapter_name}` : ''}
                              </p>

                              {/* Score bar */}
                              <ScoreBar pct={pct} />

                              {/* Date */}
                              <p className="text-xs text-gray-400 mt-2">📅 {dateStr}</p>
                            </div>

                            {/* Right: score + breakdown */}
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className={`text-3xl font-extrabold ${
                                  pct >= 75 ? 'text-emerald-600' :
                                  pct >= 60 ? 'text-blue-600' :
                                  pct >= 40 ? 'text-amber-600' : 'text-red-500'
                                }`}>{pct}%</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {isHw
                                    ? `${exam.obtained_marks ?? '—'}/${exam.total_marks ?? '—'}`
                                    : `${exam.score ?? '—'}/50`}
                                </p>
                                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${grade.cls}`}>
                                  Grade {grade.label}
                                </span>
                              </div>

                              {!isHw && (
                                <div className="text-xs space-y-1.5 text-gray-500 border-l border-gray-100 pl-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                                    MCQ: <strong className="text-gray-700">{exam.mcq_score ?? '—'}</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Short: <strong className="text-gray-700">{exam.short_answer_score ?? '—'}</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                                    Long: <strong className="text-gray-700">{exam.long_answer_score ?? '—'}</strong>
                                  </div>
                                </div>
                              )}

                              <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
