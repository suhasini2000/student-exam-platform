import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [examTypes, setExamTypes] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [assignedExams, setAssignedExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, historyRes, assignedRes] = await Promise.all([
          api.get('/api/exam-types/'),
          api.get('/api/exams/history/'),
          api.get('/api/exams/assigned/my/').catch(() => ({ data: [] })),
        ]);
        setExamTypes(typesRes.data.results || typesRes.data);
        const hist = historyRes.data.results || historyRes.data;
        setRecentExams(hist.slice(0, 5));
        const assigned = assignedRes.data.results || assignedRes.data;
        setAssignedExams(assigned.filter(e => !e.my_attempt || e.my_attempt.status !== 'COMPLETED').slice(0, 5));
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {user?.first_name || user?.username}!
        </h1>
        <p className="mt-2 text-indigo-100">
          {user?.board} - Class {user?.grade} | {user?.school_account_name || user?.school_name || 'Student'}
        </p>
        <Link to="/subjects" className="inline-block mt-4 bg-white text-indigo-700 px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition">
          Start New Exam
        </Link>
      </div>

      {/* Assigned Exams */}
      {assignedExams.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Assigned Exams</h2>
            <Link to="/assigned-exams" className="text-indigo-600 text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {assignedExams.map((exam) => (
              <Link key={exam.id} to="/assigned-exams"
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-indigo-100 border-l-4 border-l-indigo-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-800">{exam.title}</h3>
                    <p className="text-sm text-gray-500">
                      {exam.subject_name} | {exam.total_marks} marks | {exam.duration_minutes} min
                    </p>
                  </div>
                  {exam.my_attempt ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">In Progress</span>
                  ) : (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">New</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Exam Types */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Exam Boards</h2>
          <div className="space-y-3">
            {examTypes.map((et) => (
              <Link key={et.id} to={`/subjects?exam_type=${et.id}`}
                className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{et.name}</h3>
                    <p className="text-sm text-gray-500">{et.subject_count} subjects</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Exams */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Exams</h2>
            <Link to="/history" className="text-indigo-600 text-sm font-medium hover:underline">View All</Link>
          </div>
          {recentExams.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <p className="text-gray-500">No exams taken yet. Start your first exam!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExams.map((exam) => (
                <Link key={exam.id} to={`/result/${exam.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-800">{exam.subject_name}</h3>
                      <p className="text-sm text-gray-500">
                        {exam.chapter_name || 'Full Subject'} | {new Date(exam.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${exam.percentage >= 60 ? 'text-green-600' : exam.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Math.round(exam.percentage)}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
