import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Common/Avatar';

export default function SchoolDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ teachers: 0, students: 0, assignments: 0, exams: 0 });
  const [loading, setLoading] = useState(true);
  const [bgImages, setBgImages] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachers, students, assignments, images] = await Promise.all([
          api.get('/api/auth/members/', { params: { role: 'teacher' } }),
          api.get('/api/auth/members/', { params: { role: 'student' } }),
          api.get('/api/exams/assignments/'),
          api.get('/api/site-images/'),
        ]);

        setStats({
          teachers: teachers.data.count || teachers.data.length || 0,
          students: students.data.count || students.data.length || 0,
          assignments: assignments.data.count || assignments.data.length || 0,
          exams: 0, // Placeholder
        });
        setBgImages(images.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cards = [
    {
      title: 'Teachers',
      count: stats.teachers,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      link: '/school/teachers',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Students',
      count: stats.students,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      link: '/school/students',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Assignments',
      count: stats.assignments,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      link: '/school/assignments',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Subjects',
      count: '-',
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      link: '/school/subjects',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header with Background Image */}
      <div
        className="rounded-2xl p-8 md:p-10 text-white mb-8 bg-cover bg-center relative overflow-hidden"
        style={bgImages.school_dashboard?.url ? { backgroundImage: `url(${bgImages.school_dashboard.url})` } : {}}
      >
        <div className={`absolute inset-0 ${bgImages.school_dashboard?.url ? 'bg-black/50' : 'bg-gradient-to-r from-gray-900 to-indigo-600'}`}></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <Avatar src={user?.profile_photo} name={user?.first_name || user?.username} size="lg" className="border-2 border-white/50" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome, {user?.first_name || user?.username}!
              </h1>
              <p className="mt-1 text-white/80">
                School Administration Dashboard
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/school/teachers" className="bg-white text-indigo-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition shadow-sm">
              Manage Teachers
            </Link>
            <Link to="/school/students" className="bg-indigo-500/20 text-white border border-white/30 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition backdrop-blur-sm">
              View Students
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card) => (
          <Link key={card.title} to={card.link} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110`}>
                {card.icon}
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">{card.title}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : card.count}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity / Quick Tasks */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Quick Operations</h2>
          <div className="space-y-4">
            <Link to="/school/assignments" className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Assign Teacher to Subject</p>
                  <p className="text-xs text-gray-500">Link teachers with classes and subjects</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <Link to="/school/images" className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Customize Interface</p>
                  <p className="text-xs text-gray-500">Update school logos and dashboard images</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="bg-indigo-900 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.827a1 1 0 00-.788 0l-7 3.333a1 1 0 000 1.808l7 3.333a1 1 0 00.788 0l7-3.333a1 1 0 000-1.808l-7-3.333zM14.5 8.326l-3.326 1.583a1 1 0 01-.788 0L7.06 8.326 2.5 10.45v3.666a1 1 0 00.511.875l7 4a1 1 0 00.978 0l7-4a1 1 0 00.511-.875V10.45l-4.5-2.124z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">School Analytics</h2>
          <p className="text-indigo-200 text-sm mb-6">Track performance and activity across all classes and subjects.</p>
          <Link to="/school/progress-card" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition">
            View Reports
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
