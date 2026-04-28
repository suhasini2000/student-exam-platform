import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Common/Avatar';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ papers: 0, exams: 0, pending_grading: 0 });
  const [loading, setLoading] = useState(true);
  const [recentExams, setRecentExams] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, pendingRes, examsRes] = await Promise.all([
          api.get('/api/exams/papers/'), // Just to get count for now
          api.get('/api/exams/pending-review/'),
          api.get('/api/exams/assigned/'),
        ]);

        setStats({
          papers: statsRes.data.count || statsRes.data.length || 0,
          exams: examsRes.data.count || examsRes.data.length || 0,
          pending_grading: pendingRes.data.length || 0,
        });
        setRecentExams((examsRes.data.results || examsRes.data).slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const greeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const actions = [
    {
      to: '/teacher/generate-paper', label: 'Generate Questions', sub: 'Create with AI',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      to: '/teacher/create-exam', label: 'Create Exam', sub: 'Assign to students',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      color: 'bg-emerald-50 text-green-600',
    },
    {
      to: '/teacher/grading', label: 'Grading Queue', sub: 'Grade submissions',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      to: '/teacher/upload-handwritten', label: 'Scan Handwritten', sub: 'AI grading for paper',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
      color: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HERO BANNER (full-width, flush with navbar) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar src={user?.profile_photo} name={user?.first_name || user?.username} size="xl" className="ring-4 ring-white/20 shadow-lg" />

          <div className="flex-1 min-w-0">
            <p className="text-indigo-300 text-sm font-medium mb-1">{greeting()}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
              <span className="inline-flex items-center text-indigo-200 text-sm">
                <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {user?.school_name || 'Organization Admin'}
              </span>
              <span className="w-1 h-1 rounded-full bg-indigo-400/50 hidden sm:block" />
              <span className="text-indigo-300 text-sm font-medium capitalize">{user?.role} Account</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 px-8 py-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <p className="text-white text-xl font-bold">{stats.papers}</p>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Papers</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-xl font-bold">{stats.pending_grading}</p>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">To Grade</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── ACTION GRID ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm
                         hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shrink-0 transition-transform group-hover:scale-110 ${action.color}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {action.icon}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-snug">{action.label}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{action.sub}</p>
              </div>
              <svg className="w-4 h-4 ml-auto text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── RECENT EXAMS ─────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full mr-3" />
                Recent Exams
              </h2>
              <Link to="/teacher/created-exams" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
                <p className="text-gray-400 text-sm">Loading your activity...</p>
              </div>
            ) : recentExams.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No exams created yet</h3>
                <p className="text-gray-500 text-sm mb-5">Start by creating your first exam for your students.</p>
                <Link to="/teacher/create-exam" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm">
                  Create First Exam
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => (
                  <Link
                    key={exam.id}
                    to={`/teacher/exam/${exam.id}/submissions`}
                    className="group block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                            {exam.subject_name}
                          </span>
                          {exam.grade && (
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider italic">
                              Class {exam.grade}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Created {new Date(exam.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{exam.submissions_count || 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Submissions</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ───────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full mr-3" />
                Grading Summary
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-xs font-bold text-amber-700">Awaiting AI Grade</span>
                  <span className="text-sm font-black text-amber-700">{stats.pending_grading}</span>
                </div>
                <Link to="/teacher/grading" className="block w-full py-2.5 bg-gray-900 text-white text-center rounded-xl text-xs font-bold hover:bg-slate-800 transition">
                  Review Queue
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-extrabold text-lg mb-2">Teacher Analytics</h3>
                <p className="text-indigo-100 text-xs leading-relaxed mb-5 opacity-90">
                  Track student performance, average scores, and learning gaps across all your classes.
                </p>
                <Link to="/teacher/analytics" className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg text-xs font-black hover:bg-indigo-50 transition shadow-sm">
                  View Reports
                  <svg className="w-3.5 h-3.5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </Link>
              </div>
              <svg className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
