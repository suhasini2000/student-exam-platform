import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ExamResults() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchExams = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/assigned/', { params: { page: pageNum } });
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Exam Results</h1>
        <Link to="/teacher/create-exam" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition text-sm">
          Create New Exam
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 mb-4">No exams assigned yet.</p>
          <Link to="/teacher/create-exam" className="text-indigo-600 font-medium hover:underline">Create your first exam</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                to={`/teacher/review/${exam.id}`}
                className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{exam.title}</h3>
                    <p className="text-sm text-gray-500">{exam.subject_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {new Date(exam.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-600">{exam.student_count}</p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${
                        exam.completed_count === exam.student_count && exam.student_count > 0
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        {exam.completed_count}
                      </p>
                      <p className="text-xs text-gray-500">Completed</p>
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
