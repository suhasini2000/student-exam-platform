import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import Avatar from '../../components/Common/Avatar';

function getState(s) {
  if (s.status === 'NOT_STARTED') return { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' };
  if (s.status === 'IN_PROGRESS')  return { label: 'In Progress',  cls: 'bg-blue-100 text-blue-700' };
  if (s.grading_status === 'COMPLETED') return { label: 'Graded', cls: 'bg-green-100 text-green-700' };
  if (s.grading_status === 'FAILED')    return { label: 'Grade Failed', cls: 'bg-red-100 text-red-700' };
  if (s.grading_status && s.grading_status !== 'PENDING_REVIEW') return { label: 'Grading…', cls: 'bg-blue-100 text-blue-600' };
  return { label: 'Submitted', cls: 'bg-amber-100 text-amber-700' };
}

export default function ExamSubmissions() {
  const { examId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/exams/assigned/${examId}/submissions/`)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load submissions'))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-3">{error}</p>
        <Link to="/teacher/created-exams" className="text-indigo-600 font-medium hover:underline text-sm">
          ← Back to Created Exams
        </Link>
      </div>
    );
  }

  const submissions = data?.submissions || [];
  const submitted = submissions.filter((s) => s.status === 'COMPLETED').length;
  const graded    = submissions.filter((s) => s.grading_status === 'COMPLETED').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/teacher/created-exams" className="text-gray-400 hover:text-gray-600 transition mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{data?.exam_title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{data?.subject}</p>
          </div>
        </div>
        <Link
          to={`/teacher/exam/${examId}/paper`}
          className="shrink-0 flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Paper
        </Link>
      </div>

      {/* Summary strip */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex divide-x divide-gray-100 mb-6">
        {[
          { label: 'Assigned',  value: submissions.length, color: 'text-indigo-600' },
          { label: 'Submitted', value: submitted,           color: 'text-amber-500'  },
          { label: 'Graded',    value: graded,              color: 'text-green-600'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 py-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {submissions.map((s) => {
          const state   = getState(s);
          const isGraded = s.grading_status === 'COMPLETED';

          return (
            <div key={s.student_id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">

              {/* Avatar / Photo */}
              <Avatar src={s.profile_photo} name={s.student_name} />

              {/* Name + submitted time */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{s.student_name}</p>
                {s.completed_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted {new Date(s.completed_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Score */}
              {isGraded && (
                <p className={`text-lg font-bold shrink-0 ${
                  s.percentage >= 60 ? 'text-green-600' :
                  s.percentage >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {Math.round(s.percentage)}%
                </p>
              )}

              {/* State badge */}
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${state.cls}`}>
                {state.label}
              </span>

              {/* Action */}
              {s.user_exam_id ? (
                <Link
                  to={`/teacher/review/${s.user_exam_id}`}
                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  title={isGraded ? 'View result' : 'Review answers'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <div className="w-8 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
