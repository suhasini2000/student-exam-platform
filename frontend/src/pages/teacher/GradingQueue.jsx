import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Avatar from '../../components/Common/Avatar';

const GRADING_LABELS = {
  PENDING_REVIEW: 'Pending',
  GRADING_MCQ: 'Grading MCQs...',
  GRADING_DESCRIPTIVE: 'Grading Descriptive...',
  ANALYZING: 'Analyzing...',
};

export default function GradingQueue() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingIds, setGradingIds] = useState(new Set());

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get('/api/exams/pending-review/');
      setPending(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Poll while any exam is being graded
  useEffect(() => {
    const grading = pending.filter((e) => e.grading_status !== 'PENDING_REVIEW');
    if (grading.length === 0) return;
    const interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, [pending, fetchPending]);

  const handleGrade = async (examId, includeAnalysis = false) => {
    setGradingIds((prev) => new Set(prev).add(examId));
    try {
      await api.post(`/api/exams/${examId}/grade/`, { include_analysis: includeAnalysis });
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start grading');
      setGradingIds((prev) => {
        const next = new Set(prev);
        next.delete(examId);
        return next;
      });
    }
  };

  const pendingCount = pending.filter((e) => e.grading_status === 'PENDING_REVIEW').length;
  const processingCount = pending.filter((e) => e.grading_status !== 'PENDING_REVIEW').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grading Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Student submissions awaiting AI grading</p>
        </div>
        <Link
          to="/teacher/created-exams"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Created Exams
        </Link>
      </div>

      {/* Stats bar */}
      {!loading && pending.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-xs text-amber-600">Awaiting Grade</p>
            </div>
          </div>
          {processingCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-700">{processingCount}</p>
                <p className="text-xs text-blue-600">Processing</p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium mb-1">All caught up!</p>
          <p className="text-sm text-gray-400">No submissions are waiting to be graded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Subject</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Exam</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Questions</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Submitted</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((exam) => {
                  const isProcessing = exam.grading_status !== 'PENDING_REVIEW';
                  return (
                    <tr key={exam.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={exam.profile_photo} name={exam.student} size="sm" />
                          <span className="font-medium text-gray-800">{exam.student}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{exam.subject}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[180px] truncate">{exam.exam_title || '—'}</td>
                      <td className="text-center px-5 py-3 text-gray-600">{exam.total_questions}</td>
                      <td className="text-center px-5 py-3">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            {GRADING_LABELS[exam.grading_status] || exam.grading_status}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {exam.completed_at ? new Date(exam.completed_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {exam.grading_status === 'PENDING_REVIEW' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleGrade(exam.id, false)}
                              disabled={gradingIds.has(exam.id)}
                              className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                              title="Grade and assign marks only"
                            >
                              Quick Grade
                            </button>
                            <button
                              onClick={() => handleGrade(exam.id, true)}
                              disabled={gradingIds.has(exam.id)}
                              className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50"
                              title="Grade with detailed analysis"
                            >
                              + Analyze
                            </button>
                          </div>
                        ) : (
                          <span className="block text-center text-xs text-gray-400">Processing...</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
