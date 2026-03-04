import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

/* ── tiny SVG icons ─────────────────────────────────────────── */
const Icon = {
  papers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
    </svg>
  ),
  exams: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  students: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chevron: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  viewPapers: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  createdExams: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  grading: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  handwritten: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]             = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [examFilter, setExamFilter]   = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, pendingRes] = await Promise.all([
          api.get('/api/dashboard/teacher/'),
          api.get('/api/exams/pending-review/'),
        ]);
        setStats(dashRes.data);
        setRecentExams(dashRes.data.recent_exams || []);
        setPendingQueue(pendingRes.data || []);
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Papers Uploaded', value: stats?.papers_count ?? 0,
      icon: Icon.papers, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
      valueCls: 'text-indigo-600', border: 'border-t-indigo-500',
    },
    {
      label: 'Assigned Exams', value: stats?.assigned_exams_count ?? 0,
      icon: Icon.exams, iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
      valueCls: 'text-violet-600', border: 'border-t-violet-500',
    },
    {
      label: 'Students', value: stats?.students_count ?? 0,
      icon: Icon.students, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
      valueCls: 'text-emerald-600', border: 'border-t-emerald-500',
    },
    {
      label: 'Pending Reviews', value: stats?.pending_reviews ?? 0,
      icon: Icon.pending, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      valueCls: 'text-amber-600', border: 'border-t-amber-500',
      to: '/teacher/grading',
    },
  ];

  const quickLinks = [
    {
      to: '/teacher/papers/view', label: 'View Papers', sub: 'Created & handwritten',
      icon: Icon.viewPapers, iconBg: 'bg-indigo-500', badge: 0,
    },
    {
      to: '/teacher/created-exams', label: 'Created Exams', sub: 'Manage assigned exams',
      icon: Icon.createdExams, iconBg: 'bg-violet-500', badge: 0,
    },
    {
      to: '/teacher/grading', label: 'Grading Queue', sub: 'Grade submissions',
      icon: Icon.grading, iconBg: 'bg-amber-500', badge: stats?.pending_reviews || 0,
    },
    {
      to: '/teacher/handwritten', label: 'Handwritten', sub: 'Grade answer sheets',
      icon: Icon.handwritten, iconBg: 'bg-teal-500', badge: 0,
    },
  ];

  /* ── grouped recent exams ── */
  const filtered = examFilter === 'all'
    ? recentExams
    : recentExams.filter((e) => e.type === examFilter);
  const grouped = {};
  filtered.forEach((exam) => {
    const key = exam.student_id ?? exam.student;
    if (!grouped[key]) grouped[key] = { student: exam.student, student_id: exam.student_id, exams: [] };
    grouped[key].exams.push(exam);
  });
  const groupedRows = Object.values(grouped);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl mb-8
                        bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900
                        shadow-xl">

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.02]" />

          <div className="relative px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            {user?.profile_photo ? (
              <img
                src={user.profile_photo} alt="Profile"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500
                              flex items-center justify-center text-3xl font-bold text-white
                              ring-4 ring-white/20 shrink-0 shadow-lg">
                {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-indigo-300 text-sm font-medium mb-1">{greeting()}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
              </h1>
              <p className="text-indigo-200/70 text-sm mt-0.5">Teacher · {user?.school_name || 'Dashboard'}</p>

              {stats?.assigned_subjects?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {stats.assigned_subjects.map((s) => (
                    <span key={s.id}
                      className="text-xs bg-white/10 hover:bg-white/20 transition
                                 px-3 py-1 rounded-full font-medium text-white/90 border border-white/10">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: today's date */}
            <div className="hidden lg:flex flex-col items-end text-right shrink-0">
              <p className="text-white/40 text-xs uppercase tracking-widest">Today</p>
              <p className="text-white font-semibold mt-0.5">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const inner = (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                    {card.icon}
                  </div>
                  {card.to && (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
                <p className={`text-3xl font-extrabold ${card.valueCls}`}>{card.value}</p>
                <p className="text-sm text-gray-500 mt-1 font-medium">{card.label}</p>
              </>
            );
            const cls = `bg-white rounded-2xl p-5 shadow-sm border-t-4 ${card.border}
                         border-x border-b border-gray-100 transition`;
            return card.to ? (
              <Link key={card.label} to={card.to} className={`${cls} hover:shadow-md block`}>{inner}</Link>
            ) : (
              <div key={card.label} className={cls}>{inner}</div>
            );
          })}
        </div>

        {/* ── PENDING ALERT ───────────────────────────────── */}
        {pendingQueue.length > 0 && (
          <div className="mb-8 flex items-center gap-4 bg-amber-50 border border-amber-200
                          rounded-2xl px-5 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">
                {pendingQueue.length} submission{pendingQueue.length > 1 ? 's' : ''} waiting to be graded
              </p>
              <p className="text-xs text-amber-600 mt-0.5 truncate">
                {pendingQueue.slice(0, 3).map((e) => e.student).join(', ')}
                {pendingQueue.length > 3 && ` +${pendingQueue.length - 3} more`}
              </p>
            </div>
            <Link to="/teacher/grading"
              className="shrink-0 bg-amber-500 hover:bg-amber-600 transition
                         text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
              Grade Now
            </Link>
          </div>
        )}

        {/* ── QUICK LINKS + RECENT EXAMS ──────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Quick Links */}
          <div>
            <h2 className="text-base font-bold text-gray-700 uppercase tracking-wider mb-4 px-1">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map(({ to, label, sub, icon, iconBg, badge }) => (
                <Link key={to} to={to}
                  className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                             hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
                  <div className="relative w-fit mb-3">
                    <div className={`w-11 h-11 rounded-xl ${iconBg} text-white flex items-center justify-center shadow-sm`}>
                      {icon}
                    </div>
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px]
                                       font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Exams */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-base font-bold text-gray-700 uppercase tracking-wider">Recent Exams</h2>
              <Link to="/teacher/created-exams"
                className="text-indigo-600 text-xs font-semibold hover:underline uppercase tracking-wide">
                View All
              </Link>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-4">
              {[
                { value: 'all',         label: 'All',         active: 'bg-indigo-600 text-white shadow-sm' },
                { value: 'online',      label: 'Online',      active: 'bg-indigo-600 text-white shadow-sm' },
                { value: 'handwritten', label: 'Handwritten', active: 'bg-teal-600 text-white shadow-sm'   },
              ].map(({ value, label, active }) => (
                <button
                  key={value}
                  onClick={() => setExamFilter(value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    examFilter === value ? active : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {recentExams.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    {Icon.exams}
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No exams yet</p>
                  <Link to="/teacher/create-exam"
                    className="text-indigo-600 text-xs font-semibold hover:underline mt-1 inline-block">
                    Create your first exam →
                  </Link>
                </div>
              ) : groupedRows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-gray-400 text-sm">No {examFilter} exams found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {groupedRows.map(({ student, student_id, exams }) => (
                    <div key={student_id ?? student}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition">

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
                                      text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                        {student[0]?.toUpperCase()}
                      </div>

                      {/* Name + ID */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{student}</p>
                        {student_id && <p className="text-xs text-gray-400">#{student_id}</p>}
                      </div>

                      {/* Type badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {['online', 'handwritten'].map((type) => {
                          const match = exams.find((e) => e.type === type);
                          if (!match) return null;
                          const isHW = type === 'handwritten';
                          const href = isHW
                            ? `/teacher/exam/${match.id}/paper?type=handwritten`
                            : `/teacher/review/${match.id}`;
                          const statusLabel = isHW && match.hw_status !== 'GRADED'
                            ? (match.hw_status === 'PROCESSING' ? ' · Grading…'
                              : match.hw_status === 'FAILED'    ? ' · Failed'
                              : ' · Pending')
                            : '';
                          return (
                            <button key={type} onClick={() => navigate(href)}
                              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                                isHW
                                  ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                              }`}>
                              {isHW ? 'Handwritten' : 'Online'}{statusLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
