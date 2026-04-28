import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getCategoriesForBoard } from '../../utils/examCategories';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

const STATUS_CFG = {
  UPLOADED:   { label: 'Uploaded',   bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   icon: '📤' },
  PROCESSING: { label: 'Processing', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   icon: '⏳' },
  GRADED:     { label: 'Graded',     bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '✅' },
  FAILED:     { label: 'Failed',     bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     icon: '❌' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.UPLOADED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {status === 'PROCESSING'
        ? <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        : <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      }
      {cfg.label}
    </span>
  );
}

function ScoreBar({ obtained, total, percentage }) {
  const pct = Math.min(100, Math.round(percentage));
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-black whitespace-nowrap ${textColor}`}>
        {obtained}/{total}
      </span>
    </div>
  );
}

export default function HandwrittenList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boardCategories = getCategoriesForBoard(user?.board);
  const categoryOptions = [{ value: '', label: '— No Category —' }, ...boardCategories];

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [savingCategoryId, setSavingCategoryId] = useState(null);
  const [students, setStudents] = useState([]);
  const [linkingId, setLinkingId] = useState(null);
  const [linkStudentVal, setLinkStudentVal] = useState('');
  const [savingLinkId, setSavingLinkId] = useState(null);

  const fetchExams = useCallback(async () => {
    try {
      const res = await api.get('/api/handwritten/');
      setExams(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  useEffect(() => {
    api.get('/api/auth/my-students/').then(res => setStudents(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const expandId = Number(searchParams.get('expand'));
    if (expandId && !loading) {
      handleViewDetail(expandId);
      setTimeout(() => {
        document.getElementById(`hw-row-${expandId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [loading]);

  useEffect(() => {
    const processingExams = exams.filter(e => e.status === 'PROCESSING');
    if (processingExams.length === 0) return;
    const interval = setInterval(fetchExams, 3000);
    return () => clearInterval(interval);
  }, [exams, fetchExams]);

  const handleGrade = async (id, includeAnalysis = false) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await api.post(`/api/handwritten/${id}/process/`, { include_analysis: includeAnalysis });
      fetchExams();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start grading');
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      await api.delete(`/api/handwritten/${id}/delete/`);
      setExams(prev => prev.filter(e => e.id !== id));
      if (expandedId === id) { setExpandedId(null); setDetail(null); }
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleCategoryChange = async (id, newCategory) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, exam_category: newCategory } : e));
    setSavingCategoryId(id);
    try {
      await api.patch(`/api/handwritten/${id}/`, { exam_category: newCategory });
    } catch {
      alert('Failed to save category');
      fetchExams();
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleLinkStudent = async (id) => {
    if (!linkStudentVal) return;
    setSavingLinkId(id);
    try {
      await api.patch(`/api/handwritten/${id}/`, { student: linkStudentVal });
      setExams(prev => prev.map(e => {
        if (e.id !== id) return e;
        const s = students.find(s => String(s.id) === String(linkStudentVal));
        return { ...e, student: Number(linkStudentVal), student_display_name: s ? `${s.first_name} ${s.last_name}`.trim() || s.username : e.student_display_name };
      }));
      setLinkingId(null);
      setLinkStudentVal('');
    } catch {
      alert('Failed to link student');
    } finally {
      setSavingLinkId(null);
    }
  };

  const handleViewDetail = async (id) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    try {
      const res = await api.get(`/api/handwritten/${id}/`);
      setDetail(res.data);
      setExpandedId(id);
    } catch (err) {
      console.error(err);
    }
  };

  const getRowColor = (marks, maxMarks) => {
    if (marks == null) return '';
    const r = marks / maxMarks;
    if (r >= 1) return 'bg-emerald-50/60';
    if (r >= 0.5) return 'bg-amber-50/60';
    return 'bg-red-50/60';
  };

  const counts = {
    total:      exams.length,
    graded:     exams.filter(e => e.status === 'GRADED').length,
    processing: exams.filter(e => e.status === 'PROCESSING').length,
    failed:     exams.filter(e => e.status === 'FAILED').length,
  };

  const gradedExams = exams.filter(e => e.status === 'GRADED' && e.obtained_marks != null);
  const avgPct = gradedExams.length
    ? Math.round(gradedExams.reduce((s, e) => s + (e.percentage || 0), 0) / gradedExams.length)
    : 0;
  const topScore = gradedExams.length
    ? Math.round(Math.max(...gradedExams.map(e => e.percentage || 0)))
    : 0;
  const passCount2 = gradedExams.filter(e => (e.percentage || 0) >= 35).length;
  const passRate = gradedExams.length ? Math.round((passCount2 / gradedExams.length) * 100) : 0;

  const subjectMap = {};
  for (const e of gradedExams) {
    const key = e.subject_name || 'Unknown';
    if (!subjectMap[key]) subjectMap[key] = { total: 0, count: 0 };
    subjectMap[key].total += e.percentage || 0;
    subjectMap[key].count += 1;
  }
  const subjectData = Object.entries(subjectMap).map(([name, { total, count }]) => ({
    name, avg: Math.round(total / count),
  }));

  const gradeDist = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const e of gradedExams) {
    const p = e.percentage || 0;
    if (p >= 90) gradeDist['A+']++;
    else if (p >= 75) gradeDist['A']++;
    else if (p >= 60) gradeDist['B']++;
    else if (p >= 50) gradeDist['C']++;
    else if (p >= 35) gradeDist['D']++;
    else gradeDist['F']++;
  }
  const gradeDistData = Object.entries(gradeDist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const gradeColors = { 'A+': '#10b981', A: '#22c55e', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444' };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-gray-400 font-medium">Loading papers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header Banner ── */}
      <div className="relative bg-gradient-to-r from-slate-900 via-violet-950 to-purple-950 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center text-xl">
                  ✍️
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">Handwritten Papers</h1>
                  <p className="text-slate-400 text-sm">AI-powered grading for handwritten answer sheets</p>
                </div>
              </div>
            </div>
            <Link
              to="/teacher/upload-handwritten"
              className="inline-flex items-center gap-2 bg-white text-violet-700 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-violet-50 transition shadow-lg shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Upload New Paper
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Papers', value: counts.total, icon: '📋', color: 'from-slate-600 to-slate-700' },
              { label: 'Graded',       value: counts.graded, icon: '✅', color: 'from-emerald-600 to-teal-700' },
              { label: 'Processing',   value: counts.processing, icon: '⏳', color: 'from-amber-500 to-orange-600' },
              { label: 'Failed',       value: counts.failed, icon: '❌', color: 'from-red-600 to-rose-700' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-lg shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-white leading-none">{s.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Empty State ── */}
        {exams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-24 h-24 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl">
              ✍️
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No handwritten papers yet</h3>
            <p className="text-gray-400 mb-6">Upload answer sheets and let AI grade them instantly.</p>
            <Link
              to="/teacher/upload-handwritten"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Upload First Paper
            </Link>
          </div>
        ) : (
          <div className="space-y-6">

          {/* ── Analytics Section ── */}
          {gradedExams.length > 0 && (
            <div>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Average Score', value: `${avgPct}%`, sub: 'across all graded', color: 'from-indigo-500 to-violet-600', icon: '📊' },
                  { label: 'Pass Rate',     value: `${passRate}%`, sub: `${passCount2} of ${gradedExams.length} passed`, color: 'from-emerald-500 to-teal-600', icon: '✅' },
                  { label: 'Top Score',     value: `${topScore}%`, sub: 'highest percentage', color: 'from-amber-500 to-orange-500', icon: '🏆' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl shrink-0`}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{s.value}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Grade distribution */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-black text-gray-700 mb-1">Grade Distribution</p>
                  <p className="text-xs text-gray-400 mb-4">How students are spread across grades</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={gradeDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                        dataKey="value" startAngle={90} endAngle={-270} label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}>
                        {gradeDistData.map(entry => (
                          <Cell key={entry.name} fill={gradeColors[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} student${v !== 1 ? 's' : ''}`, `Grade ${n}`]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => `Grade ${v}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Subject-wise average */}
                {subjectData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-sm font-black text-gray-700 mb-1">Subject-wise Average</p>
                    <p className="text-xs text-gray-400 mb-4">Average score % per subject</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={subjectData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                        <Bar dataKey="avg" name="Avg Score" radius={[6, 6, 0, 0]}>
                          {subjectData.map((entry) => (
                            <Cell key={entry.name}
                              fill={entry.avg >= 60 ? '#4f46e5' : entry.avg >= 35 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Table ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Paper</th>
                    <th className="text-left px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Student</th>
                    <th className="text-left px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Subject</th>
                    {boardCategories.length > 0 && (
                      <th className="text-left px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Category</th>
                    )}
                    <th className="text-center px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Score</th>
                    <th className="text-right px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-center px-5 py-4 font-black text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <Fragment key={exam.id}>
                      <tr
                        id={`hw-row-${exam.id}`}
                        className={`border-b border-gray-50 hover:bg-slate-50 transition group ${expandedId === exam.id ? 'bg-indigo-50/40' : ''}`}
                      >
                        {/* Title */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 text-sm">{exam.title}</p>
                        </td>

                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                              {(exam.student_display_name?.[0] || '?').toUpperCase()}
                            </div>
                            <span className="text-gray-700 text-sm font-medium">{exam.student_display_name}</span>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-5 py-4">
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">{exam.subject_name}</span>
                        </td>

                        {/* Category */}
                        {boardCategories.length > 0 && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={exam.exam_category || ''}
                                onChange={e => handleCategoryChange(exam.id, e.target.value)}
                                disabled={savingCategoryId === exam.id}
                                className={`text-xs rounded-xl px-3 py-1.5 border-2 focus:outline-none focus:border-indigo-400 disabled:opacity-50 cursor-pointer font-medium ${
                                  exam.status === 'GRADED' && !exam.exam_category
                                    ? 'border-orange-300 bg-orange-50 text-orange-700'
                                    : 'border-gray-100 bg-gray-50 text-gray-600'
                                }`}
                              >
                                {categoryOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {savingCategoryId === exam.id && (
                                <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full" />
                              )}
                            </div>
                            {exam.status === 'GRADED' && !exam.exam_category && (
                              <p className="text-[10px] text-orange-500 font-bold mt-1">⚠ Set for Progress Card</p>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={exam.status} />
                        </td>

                        {/* Score */}
                        <td className="px-5 py-4">
                          {exam.status === 'GRADED' ? (
                            <ScoreBar obtained={exam.obtained_marks} total={exam.total_marks} percentage={exam.percentage} />
                          ) : (
                            <span className="text-gray-300 text-xs font-medium">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-right">
                          <span className="text-xs text-gray-400 font-medium">
                            {new Date(exam.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {exam.status === 'UPLOADED' && (
                              <>
                                <button
                                  onClick={() => handleGrade(exam.id, false)}
                                  disabled={processingIds.has(exam.id)}
                                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
                                  title="Grade and assign marks only"
                                >
                                  Quick Grade
                                </button>
                                <button
                                  onClick={() => handleGrade(exam.id, true)}
                                  disabled={processingIds.has(exam.id)}
                                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
                                  title="Grade with detailed analysis"
                                >
                                  + Analyze
                                </button>
                              </>
                            )}
                            {exam.status === 'FAILED' && (
                              <>
                                <button
                                  onClick={() => handleGrade(exam.id, false)}
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition shadow-sm"
                                >
                                  Retry
                                </button>
                                <button
                                  onClick={() => handleGrade(exam.id, true)}
                                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition shadow-sm"
                                >
                                  Retry + Analyze
                                </button>
                              </>
                            )}
                            {exam.status === 'GRADED' && (
                              <button
                                onClick={() => handleViewDetail(exam.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                                  expandedId === exam.id
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90'
                                }`}
                              >
                                {expandedId === exam.id ? 'Collapse' : 'View Results'}
                              </button>
                            )}

                            {/* Link Student */}
                            {!exam.student && (
                              linkingId === exam.id ? (
                                <div className="flex items-center gap-1.5">
                                  {students.length > 0 ? (
                                    <select
                                      value={linkStudentVal}
                                      onChange={e => setLinkStudentVal(e.target.value)}
                                      className="text-xs border-2 border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white"
                                    >
                                      <option value="">Pick student…</option>
                                      {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {`${s.first_name} ${s.last_name}`.trim() || s.username}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-400">No students assigned</span>
                                  )}
                                  {students.length > 0 && (
                                    <button
                                      onClick={() => handleLinkStudent(exam.id)}
                                      disabled={!linkStudentVal || savingLinkId === exam.id}
                                      className="text-xs font-bold px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition"
                                    >
                                      {savingLinkId === exam.id ? '…' : 'Save'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setLinkingId(null); setLinkStudentVal(''); }}
                                    className="text-xs text-gray-400 hover:text-gray-600 px-1"
                                  >✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setLinkingId(exam.id); setLinkStudentVal(''); }}
                                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-50 transition"
                                  title="Link to a student account for Progress Card"
                                >
                                  Link Student
                                </button>
                              )
                            )}

                            {/* View files */}
                            <button
                              onClick={() => navigate(`/teacher/exam/${exam.id}/paper?type=handwritten`)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View paper files"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(exam.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded Detail Row ── */}
                      {expandedId === exam.id && detail && (
                        <tr>
                          <td colSpan={boardCategories.length > 0 ? 8 : 7} className="p-0">
                            <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/40 border-t border-b border-indigo-100 px-6 py-6">

                              {/* Score cards */}
                              <div className="grid grid-cols-3 gap-4 mb-6">
                                {[
                                  { label: 'Obtained Marks', value: detail.obtained_marks, icon: '🎯', color: 'from-indigo-500 to-blue-600', text: 'text-indigo-600' },
                                  { label: 'Total Marks',    value: detail.total_marks,    icon: '📋', color: 'from-slate-500 to-gray-600',  text: 'text-gray-700' },
                                  {
                                    label: 'Percentage',
                                    value: `${Math.round(detail.percentage)}%`,
                                    icon: '📊',
                                    color: detail.percentage >= 60 ? 'from-emerald-500 to-teal-600' : detail.percentage >= 40 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600',
                                    text: detail.percentage >= 60 ? 'text-emerald-600' : detail.percentage >= 40 ? 'text-amber-600' : 'text-red-500',
                                  },
                                ].map(s => (
                                  <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-white p-5 text-center">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${s.color} text-white rounded-xl flex items-center justify-center text-xl mx-auto mb-3 shadow-md`}>
                                      {s.icon}
                                    </div>
                                    <p className={`text-3xl font-black ${s.text}`}>{s.value}</p>
                                    <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Charts */}
                              <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-white p-5">
                                  <p className="text-sm font-black text-gray-700 mb-3">Score Overview</p>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                      <Pie
                                        data={[
                                          { name: 'Scored', value: detail.obtained_marks },
                                          { name: 'Lost',   value: Math.max(0, detail.total_marks - detail.obtained_marks) },
                                        ]}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={80}
                                        dataKey="value" startAngle={90} endAngle={-270}
                                      >
                                        <Cell fill={detail.percentage >= 60 ? '#16a34a' : detail.percentage >= 40 ? '#ca8a04' : '#dc2626'} />
                                        <Cell fill="#e5e7eb" />
                                      </Pie>
                                      <Tooltip formatter={(v, n) => [`${v} marks`, n]} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>

                                {detail.grading_data?.questions?.length > 0 && (
                                  <div className="bg-white rounded-2xl shadow-sm border border-white p-5">
                                    <p className="text-sm font-black text-gray-700 mb-3">Question-wise Marks</p>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <BarChart
                                        data={detail.grading_data.questions.map(q => ({
                                          name: `Q${q.question_number}`,
                                          Scored: q.marks_awarded,
                                          Max: q.max_marks,
                                        }))}
                                        margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="Max"    fill="#e0e7ff" radius={[4,4,0,0]} />
                                        <Bar dataKey="Scored" fill="#4f46e5" radius={[4,4,0,0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>

                              {/* Overall Feedback */}
                              {detail.grading_data?.overall_feedback && (
                                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 mb-4">
                                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Overall Feedback</p>
                                  <p className="text-sm text-gray-700 leading-relaxed">{detail.grading_data.overall_feedback}</p>
                                </div>
                              )}

                              {/* Strengths / Weaknesses / Recommendations */}
                              {(detail.grading_data?.strengths?.length > 0 || detail.grading_data?.weaknesses?.length > 0 || detail.grading_data?.recommendations?.length > 0) && (
                                <div className="grid md:grid-cols-3 gap-4 mb-4">
                                  {detail.grading_data.strengths?.length > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">💪</span>
                                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">Strengths</p>
                                      </div>
                                      <ul className="space-y-1.5">
                                        {detail.grading_data.strengths.map((s, i) => (
                                          <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span> {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {detail.grading_data.weaknesses?.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">⚠️</span>
                                        <p className="text-xs font-black text-red-700 uppercase tracking-wide">Weaknesses</p>
                                      </div>
                                      <ul className="space-y-1.5">
                                        {detail.grading_data.weaknesses.map((w, i) => (
                                          <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                                            <span className="text-red-400 mt-0.5 shrink-0">✗</span> {w}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {detail.grading_data.recommendations?.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">💡</span>
                                        <p className="text-xs font-black text-blue-700 uppercase tracking-wide">Recommendations</p>
                                      </div>
                                      <ul className="space-y-1.5">
                                        {detail.grading_data.recommendations.map((r, i) => (
                                          <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                                            <span className="text-blue-400 mt-0.5 shrink-0">→</span> {r}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Per-question breakdown */}
                              {detail.grading_data?.questions?.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-white overflow-hidden">
                                  <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-5 py-3">
                                    <p className="text-sm font-black text-white">Question-wise Breakdown</p>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-gray-100">
                                          {['Q#', 'Question', 'Student Answer', 'Correct Answer', 'Marks', 'Feedback'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-gray-400 uppercase tracking-wide text-[10px]">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detail.grading_data.questions.map((q, idx) => (
                                          <tr key={idx} className={`border-b border-gray-50 hover:bg-slate-50 transition ${getRowColor(q.marks_awarded, q.max_marks)}`}>
                                            <td className="px-4 py-3">
                                              <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-black text-xs">
                                                {q.question_number}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 max-w-[160px]">{q.question_text}</td>
                                            <td className="px-4 py-3 text-gray-500 italic max-w-[160px]">{q.student_answer}</td>
                                            <td className="px-4 py-3 text-gray-600 max-w-[160px]">{q.correct_answer}</td>
                                            <td className="px-4 py-3">
                                              <span className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                                                q.marks_awarded >= q.max_marks ? 'bg-emerald-100 text-emerald-700' :
                                                q.marks_awarded > 0            ? 'bg-amber-100   text-amber-700'   :
                                                                                  'bg-red-100     text-red-700'
                                              }`}>
                                                {q.marks_awarded}/{q.max_marks}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 max-w-[160px]">{q.feedback}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Error */}
                              {detail.error_message && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-4 flex items-start gap-3">
                                  <span className="text-red-500 text-lg shrink-0">⚠️</span>
                                  <p className="text-sm text-red-700">{detail.error_message}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
