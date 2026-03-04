import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ── small helpers ── */
function useOutsideClick(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

function NavIcon({ name }) {
  const icons = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    papers:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    exams:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    progress:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    manage:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    subjects:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    profile:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    logout:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    history:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    handwritten: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
    generate:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  };
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name] || icons.papers}
    </svg>
  );
}

/* ── Dropdown wrapper ── */
function Dropdown({ label, icon, items, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));
  const location = useLocation();
  const anyActive = items.some((i) => location.pathname.startsWith(i.to));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
          anyActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <NavIcon name={icon} />
        {label}
        <svg className={`w-3.5 h-3.5 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[200px] z-50 py-1.5 overflow-hidden">
          {items.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Single nav link ── */
function NavLink({ to, label, icon }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <NavIcon name={icon} />
      {label}
    </Link>
  );
}

/* ── User menu (avatar + dropdown) ── */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition"
      >
        {user?.profile_photo ? (
          <img src={user.profile_photo} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-gray-600" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white">
            {initial}
          </div>
        )}
        <div className="hidden lg:block text-left">
          <p className="text-sm font-medium text-white leading-tight">{user?.first_name || user?.username}</p>
          <p className="text-xs text-gray-400 leading-tight capitalize">{getRoleLabel()}</p>
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[180px] z-50 py-1.5">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-400">{user?.username}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <NavIcon name="profile" />
            My Profile
          </Link>
          <button
            onClick={() => { onLogout(); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <NavIcon name="logout" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Navbar
══════════════════════════════════════════ */
export default function Navbar() {
  const { user, logout, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };

  const getOrgLabel = () => {
    if (!user) return '';
    if (user.role === 'teacher') return 'Teacher';
    if (user.role === 'school') {
      if (user.org_type === 'college') return 'College';
      if (user.org_type === 'coaching') return 'Coaching';
      return 'School';
    }
    return 'Student';
  };

  /* ── nav definitions per role ── */
  const teacherNav = (
    <>
      <NavLink to="/teacher/dashboard" label="Dashboard" icon="dashboard" />
      <Dropdown label="Papers" icon="papers" items={[
        { to: '/teacher/generate-paper', label: 'Generate Questions', icon: 'generate' },
        { to: '/teacher/papers', label: 'Uploaded Papers', icon: 'papers' },
        { to: '/teacher/papers/view', label: 'View Papers', icon: 'exams' },
      ]} />
      <Dropdown label="Exams" icon="exams" items={[
        { to: '/teacher/create-exam', label: 'Create Exam', icon: 'exams' },
        { to: '/teacher/created-exams', label: 'Created Exams', icon: 'papers' },
        { to: '/teacher/grading', label: 'Grading Queue', icon: 'history' },
        { to: '/teacher/handwritten', label: 'Handwritten', icon: 'handwritten' },
      ]} />
      <NavLink to="/teacher/progress-card" label="Progress Card" icon="progress" />
    </>
  );

  const schoolNav = (
    <>
      <NavLink to="/school/dashboard" label="Dashboard" icon="dashboard" />
      <Dropdown label="Manage" icon="manage" items={[
        { to: '/school/teachers', label: 'Teachers', icon: 'manage' },
        { to: '/school/students', label: 'Students', icon: 'manage' },
        { to: '/school/assignments', label: 'Assignments', icon: 'exams' },
        { to: '/school/subjects', label: 'Subjects', icon: 'subjects' },
      ]} />
      <Dropdown label="Exams" icon="exams" items={[
        { to: '/teacher/create-exam', label: 'Create Exam', icon: 'exams' },
        { to: '/teacher/created-exams', label: 'Created Exams', icon: 'papers' },
        { to: '/teacher/grading', label: 'Grading Queue', icon: 'history' },
        { to: '/teacher/generate-paper', label: 'Generate Questions', icon: 'generate' },
        { to: '/teacher/papers/view', label: 'View Papers', icon: 'papers' },
      ]} />
      <NavLink to="/school/progress-card" label="Progress Card" icon="progress" />
    </>
  );

  const coachingNav = (
    <>
      <NavLink to="/coaching/dashboard" label="Dashboard" icon="dashboard" />
      <Dropdown label="Manage" icon="manage" items={[
        { to: '/coaching/teachers', label: 'Teachers', icon: 'manage' },
        { to: '/coaching/students', label: 'Students', icon: 'manage' },
        { to: '/coaching/assignments', label: 'Assignments', icon: 'exams' },
        { to: '/coaching/subjects', label: 'Subjects', icon: 'subjects' },
      ]} />
      <Dropdown label="Exams" icon="exams" items={[
        { to: '/teacher/create-exam', label: 'Create Exam', icon: 'exams' },
        { to: '/teacher/created-exams', label: 'Created Exams', icon: 'papers' },
        { to: '/teacher/grading', label: 'Grading Queue', icon: 'history' },
        { to: '/teacher/generate-paper', label: 'Generate Questions', icon: 'generate' },
        { to: '/teacher/papers/view', label: 'View Papers', icon: 'papers' },
      ]} />
      <NavLink to="/coaching/progress-card" label="Progress Card" icon="progress" />
    </>
  );

  const studentNav = (
    <>
      <NavLink to="/dashboard" label="Dashboard" icon="dashboard" />
      <NavLink to="/subjects" label="Subjects" icon="subjects" />
      <Dropdown label="My Exams" icon="exams" items={[
        { to: '/assigned-exams', label: 'Assigned Exams', icon: 'exams' },
        { to: '/history', label: 'Exam History', icon: 'history' },
        { to: '/handwritten-results', label: 'Handwritten', icon: 'handwritten' },
      ]} />
      <NavLink to="/progress-card" label="Progress Card" icon="progress" />
    </>
  );

  const renderDesktopNav = () => {
    if (!user) return null;
    if (user.role === 'teacher') return teacherNav;
    if (user.role === 'school') {
      if (user.org_type === 'coaching') return coachingNav;
      return schoolNav;
    }
    return studentNav;
  };

  /* mobile flat links */
  const getMobileLinks = () => {
    if (!user) return [];
    if (user.role === 'teacher') return [
      { to: '/teacher/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/teacher/generate-paper', label: 'Generate Questions', icon: 'generate' },
      { to: '/teacher/papers', label: 'Uploaded Papers', icon: 'papers' },
      { to: '/teacher/papers/view', label: 'View Papers', icon: 'exams' },
      { to: '/teacher/create-exam', label: 'Create Exam', icon: 'exams' },
      { to: '/teacher/created-exams', label: 'Created Exams', icon: 'papers' },
      { to: '/teacher/grading', label: 'Grading Queue', icon: 'history' },
      { to: '/teacher/handwritten', label: 'Handwritten', icon: 'handwritten' },
      { to: '/teacher/progress-card', label: 'Progress Card', icon: 'progress' },
      { to: '/profile', label: 'Profile', icon: 'profile' },
    ];
    if (user.role === 'school') {
      const prefix = user.org_type === 'coaching' ? '/coaching' : '/school';
      return [
        { to: `${prefix}/dashboard`, label: 'Dashboard', icon: 'dashboard' },
        { to: `${prefix}/teachers`, label: 'Teachers', icon: 'manage' },
        { to: `${prefix}/students`, label: 'Students', icon: 'manage' },
        { to: `${prefix}/assignments`, label: 'Assignments', icon: 'exams' },
        { to: `${prefix}/subjects`, label: 'Subjects', icon: 'subjects' },
        { to: '/teacher/create-exam', label: 'Create Exam', icon: 'exams' },
        { to: '/teacher/created-exams', label: 'Created Exams', icon: 'papers' },
        { to: '/teacher/grading', label: 'Grading Queue', icon: 'history' },
        { to: '/teacher/papers/view', label: 'View Papers', icon: 'papers' },
        { to: `${prefix}/progress-card`, label: 'Progress Card', icon: 'progress' },
        { to: '/profile', label: 'Profile', icon: 'profile' },
      ];
    }
    return [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/subjects', label: 'Subjects', icon: 'subjects' },
      { to: '/assigned-exams', label: 'Assigned Exams', icon: 'exams' },
      { to: '/history', label: 'Exam History', icon: 'history' },
      { to: '/handwritten-results', label: 'Handwritten', icon: 'handwritten' },
      { to: '/progress-card', label: 'Progress Card', icon: 'progress' },
      { to: '/profile', label: 'Profile', icon: 'profile' },
    ];
  };

  return (
    <nav className="bg-gray-900 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo / School name */}
          <Link
            to={user ? getDashboardPath() : '/'}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight truncate max-w-[180px] lg:max-w-xs">
                {user?.school_name || user?.school_account_name || 'ExamPrep'}
              </p>
              {getOrgLabel() && (
                <p className="text-indigo-400 text-xs leading-tight">{getOrgLabel()}</p>
              )}
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {renderDesktopNav()}
          </div>

          {/* Right side: user menu or login/register */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-700 transition">
                  Login
                </Link>
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition text-gray-300"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-700 bg-gray-900">
          {user ? (
            <>
              {/* User info strip */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
                <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{user?.first_name || user?.username}</p>
                  <p className="text-gray-400 text-xs capitalize">{user?.role} · {user?.school_name || ''}</p>
                </div>
              </div>

              {/* Links */}
              <div className="px-2 py-2 space-y-0.5">
                {getMobileLinks().map((link) => {
                  const active = location.pathname === link.to || location.pathname.startsWith(link.to + '/');
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                        active
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <NavIcon name={link.icon} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="px-2 pb-3 pt-1 border-t border-gray-700 mt-1">
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition"
                >
                  <NavIcon name="logout" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-gray-300 hover:text-white text-sm">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm text-center font-medium">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
