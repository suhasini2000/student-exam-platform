import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Avatar from '../components/Common/Avatar';

export default function Dashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/exams/assigned/')
      .then(res => setExams(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
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
      <div className="bg-gradient-to-r from-gray-900 to-indigo-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-4">
          <Avatar src={user?.profile_photo} name={user?.first_name || user?.username} size="lg" className="border-2 border-white/50" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome, {user?.first_name || user?.username}!
            </h1>
            <p className="mt-1 text-gray-300">
              {user?.board} - Class {user?.grade} | {user?.school_account_name || user?.school_name || 'Student'}
            </p>
          </div>
        </div>
        <Link to="/subjects" className="inline-block mt-4 bg-white text-indigo-700 px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition">
          Start Learning
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Exams */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Assigned Exams</h2>
              <Link to="/assigned-exams" className="text-indigo-600 text-sm font-medium hover:underline">View all</Link>
            </div>
            {exams.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-500">No exams assigned yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.slice(0, 4).map(exam => (
                  <div key={exam.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">{exam.subject_name}</p>
                    <h3 className="font-bold text-gray-800 mb-4 group-hover:text-indigo-600 transition">{exam.title}</h3>
                    <Link 
                      to={`/exam/${exam.id}`}
                      className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
                    >
                      Take Exam
                      <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { to: '/subjects', label: 'Subjects', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'bg-blue-50 text-blue-600' },
                { to: '/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-purple-50 text-purple-600' },
                { to: '/progress-card', label: 'Progress', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-green-50 text-green-600' },
                { to: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'bg-orange-50 text-orange-600' },
              ].map(item => (
                <Link key={item.to} to={item.to} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition text-center group">
                  <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Stats */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Exams Completed</span>
                  <span className="font-bold text-gray-800">12</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Average Score</span>
                  <span className="font-bold text-gray-800">78%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
