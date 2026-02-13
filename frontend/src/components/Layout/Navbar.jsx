import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case 'school':
        return [
          { to: '/school/dashboard', label: 'Dashboard' },
          { to: '/school/subjects', label: 'Subjects' },
          { to: '/school/teachers', label: 'Teachers' },
          { to: '/school/students', label: 'Students' },
          { to: '/school/assignments', label: 'Assignments' },
          { to: '/school/images', label: 'Images' },
          { to: '/profile', label: 'Profile' },
        ];
      case 'teacher':
        return [
          { to: '/teacher/dashboard', label: 'Dashboard' },
          { to: '/teacher/generate-paper', label: 'Generate' },
          { to: '/teacher/papers', label: 'Papers' },
          { to: '/teacher/exams', label: 'Exams' },
          { to: '/teacher/results', label: 'Results' },
          { to: '/profile', label: 'Profile' },
        ];
      default:
        return [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/subjects', label: 'Subjects' },
          { to: '/assigned-exams', label: 'Assigned' },
          { to: '/history', label: 'History' },
          { to: '/profile', label: 'Profile' },
        ];
    }
  };

  const navLinks = getNavLinks();
  const roleLabel = user?.role === 'school' ? 'School' : user?.role === 'teacher' ? 'Teacher' : '';

  return (
    <nav className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? getDashboardPath() : '/'} className="text-xl font-bold tracking-tight">
            ExamPrep 10th
            {roleLabel && <span className="ml-2 text-xs bg-indigo-500 px-2 py-0.5 rounded-full">{roleLabel}</span>}
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="hover:text-indigo-200 transition">
                    {link.label}
                  </Link>
                ))}
                <button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm transition">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-indigo-200 transition">Login</Link>
                <Link to="/register" className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {user ? (
              <>
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="block py-2 hover:text-indigo-200" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left py-2 text-indigo-200">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="block py-2" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
