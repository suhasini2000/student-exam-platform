import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ExamHistory() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchExams = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/history/', { params: { page: pageNum } });
      const data = res.data;
      if (data.results) {
        setExams(data.results);
        setHasMore(!!data.next);
      } else {
        setExams(data);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams(page);
  }, [page]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Exam History</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-500 mb-4">No exams taken yet.</p>
          <Link to="/subjects" className="text-indigo-600 font-medium hover:underline">Take your first exam</Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {exams.map((exam) => (
              <Link key={exam.id} to={`/result/${exam.id}`}
                className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{exam.subject_name}</h3>
                    <p className="text-sm text-gray-500">
                      {exam.exam_type_name} | {exam.chapter_name || 'Full Subject'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(exam.completed_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        exam.percentage >= 60 ? 'text-green-600' :
                        exam.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(exam.percentage)}%
                      </p>
                      <p className="text-xs text-gray-500">{exam.score}/50</p>
                    </div>
                    <div className="text-xs space-y-1 text-gray-500">
                      <p>MCQ: {exam.mcq_score}</p>
                      <p>Short: {exam.short_answer_score}</p>
                      <p>Long: {exam.long_answer_score}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-3 mt-8">
            <button onClick={() => setPage(page - 1)} disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]">
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">Page {page}</span>
            <button onClick={() => setPage(page + 1)} disabled={!hasMore}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]">
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
