import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCategoriesForBoard, CATEGORY_LABELS, CATEGORY_ORDER } from '../utils/examCategories';

function gradeBadge(pct) {
  if (pct >= 90) return { label: 'A+', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (pct >= 75) return { label: 'A',  cls: 'bg-green-100 text-green-700 border-green-200'   };
  if (pct >= 60) return { label: 'B',  cls: 'bg-blue-100 text-blue-700 border-blue-200'     };
  if (pct >= 50) return { label: 'C',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  if (pct >= 35) return { label: 'D',  cls: 'bg-orange-100 text-orange-700 border-orange-200' };
  return                 { label: 'F',  cls: 'bg-red-100 text-red-700 border-red-200'        };
}

function pctBar(pct) {
  const color =
    pct >= 75 ? 'bg-green-500' :
    pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-9 text-right">{pct}%</span>
    </div>
  );
}

export default function ProgressCard() {
  const { user } = useAuth();
  const boardCategories = getCategoriesForBoard(user?.board);
  const [results, setResults]   = useState([]);
  const [student, setStudent]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ exam_category: '', date_from: '', date_to: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.exam_category) params.exam_category = filters.exam_category;
      if (filters.date_from)     params.date_from     = filters.date_from;
      if (filters.date_to)       params.date_to       = filters.date_to;
      const res = await api.get('/api/progress-card/', { params });
      setResults(res.data.results || []);
      setStudent(res.data.student || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Aggregate: best attempt per subject+category → sum per subject ── */
  const grid = {};
  for (const r of results) {
    const key = `${r.subject_id}_${r.exam_category}`;
    if (!grid[key] || r.percentage > grid[key].percentage) grid[key] = r;
  }

  const subjectMap = {};
  for (const r of Object.values(grid)) {
    if (!subjectMap[r.subject_id]) {
      subjectMap[r.subject_id] = { id: r.subject_id, name: r.subject_name, score: 0, total: 0, source: r.source };
    }
    subjectMap[r.subject_id].score += Number(r.score || 0);
    subjectMap[r.subject_id].total += Number(r.total_marks || 0);
  }

  const rows = Object.values(subjectMap).map((s) => ({
    ...s,
    pct: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
  }));

  const grandScore = rows.reduce((sum, r) => sum + r.score, 0);
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const grandPct   = grandTotal > 0 ? Math.round((grandScore / grandTotal) * 100) : 0;
  const grandGrade = gradeBadge(grandPct);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── HEADER CARD ── */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900
                        rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden">
          {/* Decorative blur */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Progress Card</p>
              <h1 className="text-2xl font-extrabold">{student?.name || user?.username}</h1>
              {student?.grade && (
                <p className="text-indigo-200 text-sm mt-0.5">
                  Class {student.grade}{student.section} · {student.school || ''}
                </p>
              )}
            </div>

            {/* Overall score pill */}
            {rows.length > 0 && (
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center shrink-0 backdrop-blur-sm">
                <p className="text-3xl font-extrabold">{grandPct}%</p>
                <p className="text-indigo-200 text-xs mt-0.5">Overall</p>
                <span className={`mt-2 inline-block text-xs font-bold px-3 py-0.5 rounded-full border ${grandGrade.cls}`}>
                  Grade {grandGrade.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            {boardCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Exam Category</label>
                <select
                  value={filters.exam_category}
                  onChange={(e) => setFilters((f) => ({ ...f, exam_category: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  {boardCategories.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={filters.date_from}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={filters.date_to}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {(filters.exam_category || filters.date_from || filters.date_to) && (
              <button
                onClick={() => setFilters({ exam_category: '', date_from: '', date_to: '' })}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg
                           hover:bg-gray-50 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── TABLE ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No progress data found.</p>
            <p className="text-gray-400 text-sm mt-1">
              Complete assigned exams or have handwritten papers graded with a category set.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">#</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Subject</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Max Marks</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Marks Obtained</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 min-w-[140px]">Percentage</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => {
                  const grade = gradeBadge(row.pct);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{row.name}</span>
                          {row.source === 'handwritten' && (
                            <span className="text-xs text-gray-400">✍️</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-gray-700">{row.total}</td>
                      <td className="px-5 py-4 text-center font-bold text-indigo-700">{row.score}</td>
                      <td className="px-5 py-4">{pctBar(row.pct)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${grade.cls}`}>
                          {grade.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total row */}
              <tfoot>
                <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                  <td className="px-5 py-4" colSpan={2}>
                    <span className="font-bold text-indigo-800">Total</span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-gray-700">{grandTotal}</td>
                  <td className="px-5 py-4 text-center font-bold text-indigo-700">{grandScore}</td>
                  <td className="px-5 py-4">{pctBar(grandPct)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${grandGrade.cls}`}>
                      {grandGrade.label}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Legend */}
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
              {[
                { color: 'bg-emerald-400', label: 'A+ ≥90%' },
                { color: 'bg-green-400',   label: 'A  ≥75%' },
                { color: 'bg-blue-400',    label: 'B  ≥60%' },
                { color: 'bg-yellow-400',  label: 'C  ≥50%' },
                { color: 'bg-orange-400',  label: 'D  ≥35%' },
                { color: 'bg-red-400',     label: 'F  <35%' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
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
