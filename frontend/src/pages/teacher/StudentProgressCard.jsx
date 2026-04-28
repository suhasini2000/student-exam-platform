import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getCategoriesForBoard } from '../../utils/examCategories';

function gradeBadge(pct) {
  if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'from-emerald-400 to-emerald-600', ring: '#10b981' };
  if (pct >= 75) return { label: 'A',  cls: 'bg-green-100 text-green-700 border-green-200',     bar: 'from-green-400 to-green-600',   ring: '#22c55e' };
  if (pct >= 60) return { label: 'B',  cls: 'bg-blue-100 text-blue-700 border-blue-200',        bar: 'from-blue-400 to-blue-600',     ring: '#3b82f6' };
  if (pct >= 50) return { label: 'C',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',  bar: 'from-yellow-400 to-yellow-500', ring: '#eab308' };
  if (pct >= 35) return { label: 'D',  cls: 'bg-orange-100 text-orange-700 border-orange-200',  bar: 'from-orange-400 to-orange-500', ring: '#f97316' };
  return               { label: 'F',  cls: 'bg-red-100 text-red-700 border-red-200',            bar: 'from-red-400 to-red-600',       ring: '#ef4444' };
}

function ScoreRing({ pct, size = 96 }) {
  const grade = gradeBadge(pct);
  const r = 38; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={grade.ring} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="18" fontWeight="800">{pct}%</text>
      <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.6)" fontSize="10">{grade.label}</text>
    </svg>
  );
}

function PctBar({ pct }) {
  const grade = gradeBadge(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${grade.bar} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-9 text-right">{pct}%</span>
    </div>
  );
}

const inputCls = 'w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition';

export default function StudentProgressCard() {
  const { user } = useAuth();
  const boardCategories = getCategoriesForBoard(user?.board);

  const [students, setStudents]               = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch]     = useState('');
  const [filters, setFilters]                 = useState({ exam_category: '', date_from: '', date_to: '' });
  const [results, setResults]                 = useState([]);
  const [studentInfo, setStudentInfo]         = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [searched, setSearched]               = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      setStudentsLoading(true);
      try {
        const endpoint = user?.role === 'school' ? '/api/auth/members/?role=student' : '/api/auth/my-students/';
        const res = await api.get(endpoint);
        setStudents(res.data.results || res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setStudentsLoading(false);
      }
    };
    loadStudents();
  }, [user]);

  const fetchProgressCard = useCallback(async (studentId) => {
    if (!studentId) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = { student_id: studentId };
      if (filters.exam_category) params.exam_category = filters.exam_category;
      if (filters.date_from)     params.date_from     = filters.date_from;
      if (filters.date_to)       params.date_to       = filters.date_to;
      const res = await api.get('/api/progress-card/', { params });
      setResults(res.data.results || []);
      setStudentInfo(res.data.student || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const clearFilters = () => {
    setFilters({ exam_category: '', date_from: '', date_to: '' });
    setSelectedStudentId('');
    setStudentSearch('');
    setResults([]);
    setStudentInfo(null);
    setSearched(false);
  };

  const filteredStudents = students.filter((s) => {
    const name = `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  const grid = {};
  for (const r of results) {
    const key = `${r.subject_id}_${r.exam_category}_${r.source}`;
    if (!grid[key] || r.percentage > grid[key].percentage) grid[key] = r;
  }

  const rows = Object.values(grid).map((r) => {
    const score = Number(r.score || 0);
    const total = Number(r.total_marks || 0);
    return {
      key:      `${r.subject_id}_${r.exam_category}_${r.source}`,
      subject:  r.subject_name,
      category: r.exam_category_display || r.exam_category || '',
      score, total,
      pct:  total > 0 ? Math.round((score / total) * 100) : 0,
      source: r.source,
    };
  }).sort((a, b) => a.subject.localeCompare(b.subject) || a.category.localeCompare(b.category));

  const grandScore = rows.reduce((sum, r) => sum + r.score, 0);
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const grandPct   = grandTotal > 0 ? Math.round((grandScore / grandTotal) * 100) : 0;
  const grandGrade = gradeBadge(grandPct);

  const passCount    = rows.filter(r => r.pct >= 35).length;
  const failCount    = rows.length - passCount;
  const topSubject   = rows.length > 0 ? [...rows].sort((a, b) => b.pct - a.pct)[0] : null;

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
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Teacher View</p>

          {searched && studentInfo ? (
            /* ── Student result banner ── */
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center
                                text-2xl font-extrabold text-white shrink-0 backdrop-blur-sm">
                  {studentInfo.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">{studentInfo.name}</h1>
                  {studentInfo.grade && (
                    <p className="text-indigo-200 text-sm">Class {studentInfo.grade}{studentInfo.section}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: 'Subjects',     value: rows.length,   color: 'bg-white/10 text-white'         },
                      { label: 'Passed',        value: passCount,     color: 'bg-emerald-500/30 text-emerald-200' },
                      failCount > 0 && { label: 'Failed', value: failCount, color: 'bg-red-500/30 text-red-200' },
                      topSubject && { label: 'Best',   value: topSubject.subject, color: 'bg-amber-500/20 text-amber-200' },
                    ].filter(Boolean).map(({ label, value, color }) => (
                      <span key={label} className={`${color} border border-white/10 rounded-lg px-3 py-1 text-xs font-bold backdrop-blur-sm`}>
                        {value} {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {rows.length > 0 && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <ScoreRing pct={grandPct} size={100} />
                  <p className="text-indigo-200 text-xs font-medium">Overall Score</p>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${grandGrade.cls}`}>
                    Grade {grandGrade.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* ── Default banner ── */
            <>
              <h1 className="text-3xl font-extrabold text-white mb-1">Student Progress Card</h1>
              <p className="text-indigo-200 text-sm">View performance across subjects for any student</p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-xl font-extrabold text-white">{students.length}</p>
                  <p className="text-white/50 text-xs">Students</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── SEARCH PANEL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center text-white shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-800">Find Student</h2>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Search by Name
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Type name or username…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select Student —</option>
                  {studentsLoading ? (
                    <option disabled>Loading…</option>
                  ) : (
                    filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}{s.grade ? ` (Class ${s.grade}${s.section || ''})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {boardCategories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Exam Category
                  </label>
                  <select
                    value={filters.exam_category}
                    onChange={(e) => setFilters((f) => ({ ...f, exam_category: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">All Categories</option>
                    {boardCategories.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input type="date" value={filters.date_from}
                    onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                    title="From date"
                    className="w-full px-2 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-xs
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  />
                  <input type="date" value={filters.date_to}
                    onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                    title="To date"
                    className="w-full px-2 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-xs
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => fetchProgressCard(selectedStudentId)}
                disabled={!selectedStudentId || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl
                           text-sm font-bold hover:from-indigo-700 hover:to-violet-700 transition shadow
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Progress Card
                  </>
                )}
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 border-2 border-gray-100
                           rounded-xl hover:bg-gray-50 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* ── RESULTS ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-gray-400 text-sm font-medium">Loading progress data…</p>
          </div>

        ) : !searched ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl
                            flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-700 font-bold text-lg">Select a Student</p>
            <p className="text-gray-400 text-sm mt-2">
              Search and select a student above to view their progress card.
            </p>
          </div>

        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-100 rounded-2xl
                            flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-bold text-lg">No Progress Data</p>
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
              Assign exams with a category set. Once completed they'll appear here.
            </p>
          </div>

        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white">
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Exam</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Max</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Obtained</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider min-w-[160px]">Percentage</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => {
                  const grade = gradeBadge(row.pct);
                  return (
                    <tr key={row.key} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-4 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100
                                          flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                            {row.subject.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{row.subject}</span>
                          {row.source === 'handwritten' && <span className="text-xs text-gray-400">✍️</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50
                                         px-2.5 py-1 rounded-lg border border-indigo-100">
                          {row.category || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-semibold text-gray-600">{row.total}</td>
                      <td className="px-5 py-4 text-center font-extrabold text-indigo-700">{row.score}</td>
                      <td className="px-5 py-4"><PctBar pct={row.pct} /></td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${grade.cls}`}>
                          Grade {grade.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50 border-t-2 border-indigo-100">
                  <td className="px-5 py-4" colSpan={3}>
                    <span className="font-extrabold text-indigo-800 text-sm">Total</span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-gray-700">{grandTotal}</td>
                  <td className="px-5 py-4 text-center font-extrabold text-indigo-700">{grandScore}</td>
                  <td className="px-5 py-4"><PctBar pct={grandPct} /></td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${grandGrade.cls}`}>
                      Grade {grandGrade.label}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Legend */}
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-1.5">
              {[
                { color: 'bg-emerald-400', label: 'A+ ≥ 90%' },
                { color: 'bg-green-400',   label: 'A  ≥ 75%' },
                { color: 'bg-blue-400',    label: 'B  ≥ 60%' },
                { color: 'bg-yellow-400',  label: 'C  ≥ 50%' },
                { color: 'bg-orange-400',  label: 'D  ≥ 35%' },
                { color: 'bg-red-400',     label: 'F  < 35%' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
