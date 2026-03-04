import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roles = [
  {
    key: 'school',
    label: 'School',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: 'indigo',
    desc: 'Admin login',
  },
  {
    key: 'teacher',
    label: 'Teacher',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'emerald',
    desc: 'Manage exams & papers',
  },
  {
    key: 'student',
    label: 'Student',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'purple',
    desc: 'Take exams & study',
  },
];

const colorMap = {
  indigo: {
    selected: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500',
    icon: 'text-indigo-600',
    label: 'text-indigo-700',
  },
  emerald: {
    selected: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500',
    icon: 'text-emerald-600',
    label: 'text-emerald-700',
  },
  purple: {
    selected: 'border-purple-500 bg-purple-50 ring-2 ring-purple-500',
    icon: 'text-purple-600',
    label: 'text-purple-700',
  },
};

const orgLabelMap = {
  school: { label: 'School', desc: 'School admin login' },
  college: { label: 'College', desc: 'College admin login' },
  coaching: { label: 'Coaching Centre', desc: 'Coaching admin login' },
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const orgType = searchParams.get('org_type');
  const orgOverride = orgLabelMap[orgType];

  const visibleRoles = roles.map((r) =>
    r.key === 'school' && orgOverride
      ? { ...r, label: orgOverride.label, desc: orgOverride.desc }
      : r
  );

  const [selectedRole, setSelectedRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profile = await login(username, password);
      const path = profile.role === 'school'
        ? (profile.org_type === 'coaching' ? '/coaching/dashboard' : '/school/dashboard')
        : profile.role === 'teacher' ? '/teacher/dashboard'
        : '/dashboard';
      navigate(path);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const activeRole = visibleRoles.find((r) => r.key === selectedRole);
  const colors = colorMap[activeRole.color];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">Welcome Back</h1>
          <p className="text-center text-gray-500 text-sm mb-6">Select your role and sign in</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {visibleRoles.map((role) => {
              const rc = colorMap[role.color];
              const isSelected = selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => { setSelectedRole(role.key); setError(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? rc.selected
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={isSelected ? rc.icon : 'text-gray-400'}>
                    {role.icon}
                  </div>
                  <span className={`text-sm font-semibold ${isSelected ? rc.label : 'text-gray-500'}`}>
                    {role.label}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">{role.desc}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder={`Enter ${activeRole.label.toLowerCase()} username`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-medium transition disabled:opacity-50 bg-gray-900 hover:bg-gray-800"
            >
              {loading ? 'Signing in...' : `Sign In as ${activeRole.label}`}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to={orgType ? `/register?org_type=${orgType}` : '/register'} className="text-indigo-600 font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
