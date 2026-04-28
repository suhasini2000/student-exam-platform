import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getCategoriesForBoard } from '../../utils/examCategories';

const GRAD = [
  'from-indigo-500 to-violet-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
];

export default function CreatedExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingCategoryId, setSavingCategoryId] = useState(null);

  const boardCategories = getCategoriesForBoard(user?.board);
  const categoryOptions = [{ value: '', label: '— No Category —' }, ...boardCategories];

  const fetchExams = async (pageNum) => {
    try {
      const res = await api.get('/api/exams/assigned/', { params: { page: pageNum } });
      const data = res.data;
      if (data.results) { setExams(data.results); setHasMore(!!data.next); }
      else { setExams(data); setHasMore(false); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExams(page); }, [page]);

  const handleDelete = async (e, examId) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Delete this exam? All student submissions will also be removed.')) return;
    setDeletingId(examId);
    try {
      await api.delete(`/api/exams/assigned/${examId}/`);
      fetchExams(page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete exam');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCategoryChange = async (examId, newCategory) => {
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, exam_category: newCategory } : e));
    setSavingCategoryId(examId);
    try {
      await api.patch(`/api/exams/assigned/${examId}/`, { exam_category: newCategory });
    } catch {
      alert('Failed to save category');
      fetchExams(page);
    } finally {
      setSavingCategoryId(null);
    }
  };

  const totalStudents   = exams.reduce((s, e) => s + (e.student_count || 0), 0);
  const totalCompleted  = exams.reduce((s, e) => s + (e.completed_count || 0), 0);
  const allDoneCount    = exams.filter(e => e.completed_count === e.student_count && e.student_count > 0).length;

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
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Teacher</p>
              <h1 className="text-3xl font-extrabold text-white mb-1">Created Exams</h1>
              <p className="text-indigo-200 text-sm mb-5">All exams you have created and assigned to students</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Total Exams',  value: exams.length,    color: 'bg-white/10 border-white/20',             text: 'text-white'        },
                  { label: 'Students',     value: totalStudents,   color: 'bg-indigo-500/30 border-indigo-400/40',   text: 'text-indigo-200'   },
                  { label: 'Submitted',    value: totalCompleted,  color: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-200'  },
                  { label: 'All Completed',value: allDoneCount,    color: 'bg-amber-500/20 border-amber-400/30',     text: 'text-amber-200'    },
                ].map(({ label, value, color, text }) => (
                  <div key={label} className={`${color} border rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]`}>
                    <p className={`text-xl font-extrabold ${text}`}>{value}</p>
                    <p className="text-white/50 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <Link to="/teacher/create-exam"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600
                           text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:from-indigo-600
                           hover:to-violet-700 transition shadow-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Exam
              </Link>
              <Link to="/teacher/grading"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm
                           text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Grading Queue
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-gray-400 text-sm font-medium">Loading exams…</p>
          </div>

        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl
                            flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-700 font-bold text-lg mb-2">No Exams Created Yet</p>
            <p className="text-gray-400 text-sm mb-6">Create your first exam and assign it to students.</p>
            <Link to="/teacher/create-exam"
              className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                         px-6 py-2.5 rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-violet-700 transition shadow">
              Create Your First Exam
            </Link>
          </div>

        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {exams.map((exam, idx) => {
                const allDone    = exam.completed_count === exam.student_count && exam.student_count > 0;
                const progress   = exam.student_count > 0 ? Math.round((exam.completed_count / exam.student_count) * 100) : 0;
                const gradient   = GRAD[idx % GRAD.length];
                const subjectInitial = exam.subject_name?.charAt(0).toUpperCase() || '?';

                return (
                  <div key={exam.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex">
                      {/* Left accent strip */}
                      <div className={`bg-gradient-to-b ${gradient} w-12 shrink-0 flex flex-col items-center justify-center py-5`}>
                        <span className="text-white font-extrabold text-lg">{subjectInitial}</span>
                      </div>

                      <div className="flex-1 px-4 py-4 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-800 text-sm">{exam.title}</h3>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                allDone
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {allDone ? '✅ All Done' : `${exam.completed_count}/${exam.student_count}`}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-600 font-semibold mt-0.5">{exam.subject_name}</p>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Link to={`/teacher/exam/${exam.id}/paper`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                              title="View question paper">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <Link to={`/teacher/create-exam/${exam.id}`}
                              className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition"
                              title="Edit exam">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              onClick={(e) => handleDelete(e, exam.id)}
                              disabled={deletingId === exam.id}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                              title="Delete exam">
                              {deletingId === exam.id
                                ? <div className="w-4 h-4 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                              }
                            </button>
                            <Link to={`/teacher/exam/${exam.id}/submissions`}
                              className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="View submissions">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-xs font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                            📅 {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {exam.start_time && (
                            <span className="text-xs font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                              🟢 {new Date(exam.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {exam.duration_minutes && (
                            <span className="text-xs font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                              ⏱ {exam.duration_minutes} min
                            </span>
                          )}
                          {exam.total_marks && (
                            <span className="text-xs font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                              🏆 {exam.total_marks} marks
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400 font-medium">{exam.completed_count} of {exam.student_count} submitted</span>
                            <span className="font-bold text-gray-600">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                allDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Category selector */}
                        {boardCategories.length > 0 && (
                          <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                            <span className="text-xs text-gray-400 font-medium shrink-0">Category:</span>
                            <select
                              value={exam.exam_category || ''}
                              onChange={(e) => handleCategoryChange(exam.id, e.target.value)}
                              disabled={savingCategoryId === exam.id}
                              className="flex-1 text-xs border-2 border-gray-100 rounded-lg px-2 py-1.5 bg-gray-50
                                         text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400
                                         disabled:opacity-50 cursor-pointer"
                            >
                              {categoryOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            {savingCategoryId === exam.id && (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-gray-100
                           text-gray-600 font-semibold text-sm hover:border-indigo-200 hover:text-indigo-600
                           disabled:opacity-40 disabled:cursor-not-allowed transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="px-4 py-2 bg-white border-2 border-indigo-100 rounded-xl text-indigo-700 font-bold text-sm">
                Page {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-gray-100
                           text-gray-600 font-semibold text-sm hover:border-indigo-200 hover:text-indigo-600
                           disabled:opacity-40 disabled:cursor-not-allowed transition">
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
