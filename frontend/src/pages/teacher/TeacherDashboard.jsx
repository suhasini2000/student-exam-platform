import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/dashboard/teacher/');
        setStats(res.data);
        setRecentExams(res.data.recent_exams || []);
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

  const statCards = [
    { label: 'Papers Uploaded', value: stats?.papers_count ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Assigned Exams', value: stats?.assigned_exams_count ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Students', value: stats?.students_count ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Reviews', value: stats?.pending_reviews ?? 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {user?.first_name || user?.username}!
        </h1>
        <p className="mt-2 text-indigo-100">Teacher Dashboard</p>
        <div className="flex gap-3 mt-4">
          <Link to="/teacher/upload-paper" className="inline-block bg-white text-indigo-700 px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition">
            Upload Paper
          </Link>
          <Link to="/teacher/generate-paper" className="inline-block bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-400 transition border border-indigo-400">
            Generate Paper
          </Link>
          <Link to="/teacher/create-exam" className="inline-block bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-400 transition border border-purple-400">
            Create Exam
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Links + Recent Exams */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Links</h2>
          <div className="space-y-3">
            <Link to="/teacher/papers" className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">My Papers</h3>
                  <p className="text-sm text-gray-500">View and manage papers</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link to="/teacher/results" className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">Exam Results</h3>
                  <p className="text-sm text-gray-500">Review student performance</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Exams Table */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Exams</h2>
            <Link to="/teacher/results" className="text-indigo-600 text-sm font-medium hover:underline">View All</Link>
          </div>
          {recentExams.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <p className="text-gray-500">No exams assigned yet. Create your first exam!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Subject</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Score</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExams.map((exam, idx) => (
                      <tr key={exam.id || idx} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="px-5 py-3 text-gray-800 font-medium">{exam.student_name}</td>
                        <td className="px-5 py-3 text-gray-600">{exam.subject_name || exam.subject}</td>
                        <td className="px-5 py-3 text-right text-gray-800">{exam.score}/{exam.total_marks}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold ${
                            exam.percentage >= 60 ? 'text-green-600' :
                            exam.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(exam.percentage)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
