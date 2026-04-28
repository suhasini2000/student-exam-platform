import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const QUICK_ACTIONS = [
  {
    label: 'Start New Exam',
    desc: 'Browse subjects & chapters',
    to: '/subjects',
    gradient: 'from-indigo-500 to-blue-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Assigned Exams',
    desc: 'View pending assignments',
    to: '/assigned-exams',
    gradient: 'from-violet-500 to-purple-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Exam History',
    desc: 'Review past results',
    to: '/history',
    gradient: 'from-emerald-500 to-teal-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'My Analytics',
    desc: 'Track your progress',
    to: '/analytics',
    gradient: 'from-amber-500 to-orange-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Progress Card',
    desc: 'View detailed report card',
    to: '/progress-card',
    gradient: 'from-rose-500 to-pink-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Handwritten Results',
    desc: 'AI-graded answer sheets',
    to: '/handwritten-results',
    gradient: 'from-sky-500 to-cyan-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
];

function ScoreRing({ pct }) {
  const color = pct >= 60 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626';
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [examTypes, setExamTypes]       = useState([]);
  const [recentExams, setRecentExams]   = useState([]);
  const [assignedExams, setAssignedExams] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, historyRes, assignedRes, hwRes] = await Promise.all([
          api.get('/api/exam-types/'),
          api.get('/api/exams/history/'),
          api.get('/api/exams/assigned/my/').catch(() => ({ data: [] })),
          api.get('/api/handwritten/my/').catch(() => ({ data: [] })),
        ]);
        setExamTypes(typesRes.data.results || typesRes.data);

        const onlineExams = (historyRes.data.results || historyRes.data).map(e => ({ ...e, _type: 'online',      _date: e.completed_at }));
        const hwExams     = (hwRes.data.results     || hwRes.data).map(e     => ({ ...e, _type: 'handwritten', _date: e.created_at }));
        const combined    = [...onlineExams, ...hwExams].sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);
        setRecentExams(combined);

        const assigned = assignedRes.data.results || assignedRes.data;
        setAssignedExams(assigned.filter(e => !e.my_attempt || e.my_attempt.status !== 'COMPLETED').slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-gray-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  const initials = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase();
  const userName = user?.first_name || user?.username;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=1600&q=80&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/60 to-purple-950/40" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Student Portal</p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="Profile"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-xl shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-xl">
                  {initials}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Welcome back, {userName}!
                </h1>
                <p className="text-white/50 text-sm mt-1">
                  {[user?.board, user?.grade && `Class ${user.grade}`, user?.school_account_name || user?.school_name]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <Link
                to="/subjects"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-50 transition shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Start Exam
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
            </div>
          </div>

          {/* Stats row — matches height of other page banners */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Exams Taken',     value: recentExams.length,  color: 'bg-white/10 border-white/20',             text: 'text-white'       },
              { label: 'Assigned',         value: assignedExams.length, color: 'bg-violet-500/30 border-violet-400/40',  text: 'text-violet-200'  },
              { label: 'Avg Score',        value: recentExams.length
                  ? `${Math.round(recentExams.reduce((s, e) => s + (e.percentage || 0), 0) / recentExams.length)}%`
                  : '—',                                                color: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-200' },
            ].map(({ label, value, color, text }) => (
              <div key={label} className={`${color} border rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]`}>
                <p className={`text-xl font-extrabold ${text}`}>{value}</p>
                <p className="text-white/50 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${a.gradient} text-white rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  {a.icon}
                </div>
                <p className="text-xs font-black text-gray-800 leading-tight mb-1">{a.label}</p>
                <p className="text-[10px] text-gray-400">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Assigned Exams ── */}
        {assignedExams.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-gray-900">Assigned Exams</h2>
                <span className="bg-violet-100 text-violet-700 text-xs font-black px-2.5 py-1 rounded-full">
                  {assignedExams.length} pending
                </span>
              </div>
              <Link to="/assigned-exams" className="text-indigo-600 text-sm font-bold hover:underline">View All →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedExams.map((exam) => (
                <Link
                  key={exam.id}
                  to="/assigned-exams"
                  className="group bg-white rounded-2xl p-5 shadow-sm border-2 border-violet-100 hover:border-violet-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    {exam.my_attempt ? (
                      <span className="bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-1 rounded-full">In Progress</span>
                    ) : (
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-1 rounded-full">New</span>
                    )}
                  </div>
                  <h3 className="font-black text-gray-900 text-sm mb-1 line-clamp-1">{exam.title}</h3>
                  <p className="text-xs text-gray-400">{exam.subject_name}</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                    <span className="flex items-center gap-1">🎯 {exam.total_marks} marks</span>
                    <span className="flex items-center gap-1">⏱️ {exam.duration_minutes} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Exam Types + Recent Exams ── */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Exam Types / Boards */}
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-4">
              {user?.org_type === 'coaching' ? 'Exam Types' : 'Exam Boards'}
            </h2>
            <div className="space-y-3">
              {examTypes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <p className="text-gray-400 text-sm">No exam types available yet.</p>
                </div>
              ) : (
                examTypes.map((et, i) => {
                  const gradients = [
                    'from-indigo-500 to-blue-600',
                    'from-violet-500 to-purple-600',
                    'from-emerald-500 to-teal-600',
                    'from-amber-500 to-orange-600',
                    'from-rose-500 to-pink-600',
                    'from-sky-500 to-cyan-600',
                  ];
                  const grad = gradients[i % gradients.length];
                  return (
                    <Link
                      key={et.id}
                      to={`/subjects?exam_type=${et.id}`}
                      className="group flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${grad} text-white rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm">{et.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{et.subject_count} subjects available</p>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-500 group-hover:translate-x-1 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Exams */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Recent Exams</h2>
              <Link to="/history" className="text-indigo-600 text-sm font-bold hover:underline">View All →</Link>
            </div>

            {recentExams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📋</div>
                <p className="font-bold text-gray-700 mb-1">No exams yet</p>
                <p className="text-gray-400 text-sm mb-4">Start your first exam to see results here.</p>
                <Link to="/subjects" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
                  Start Exam
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => {
                  const pct    = Math.round(exam.percentage || 0);
                  const isHw   = exam._type === 'handwritten';
                  const linkTo = isHw ? '/handwritten-results' : `/result/${exam.id}`;
                  return (
                    <Link
                      key={`${exam._type}-${exam.id}`}
                      to={linkTo}
                      className="group flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <ScoreRing pct={pct} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-black text-gray-900 text-sm truncate">
                            {isHw ? exam.title : exam.subject_name}
                          </p>
                          {isHw && (
                            <span className="bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">✍️ HW</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {!isHw && exam.chapter_name ? `${exam.chapter_name} · ` : ''}
                          {new Date(exam._date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {isHw && (
                          <p className="text-xs text-gray-400 mt-0.5">{exam.obtained_marks}/{exam.total_marks} marks</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
