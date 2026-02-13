import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [registerAs, setRegisterAs] = useState('student');
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', password2: '',
    first_name: '', last_name: '', phone_number: '',
    grade: '10', board: 'CBSE', school_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Clear any stale tokens before registering
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      await register({ ...formData, role: registerAs });
      await login(formData.username, formData.password);
      const dashPath = registerAs === 'school' ? '/school/dashboard' : '/dashboard';
      setTimeout(() => navigate(dashPath), 100);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join('. ');
        setError(msgs);
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Create Account</h1>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 justify-center">
            <button
              type="button"
              onClick={() => setRegisterAs('student')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                registerAs === 'student' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRegisterAs('school')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                registerAs === 'school' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              School
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {registerAs === 'school' ? 'Admin First Name' : 'First Name'}
                </label>
                <input name="first_name" value={formData.first_name} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {registerAs === 'school' ? 'Admin Last Name' : 'Last Name'}
                </label>
                <input name="last_name" value={formData.last_name} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input name="username" value={formData.username} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {registerAs === 'school' ? 'School Name' : 'School Name (Optional)'}
              </label>
              <input name="school_name" value={formData.school_name} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required={registerAs === 'school'} />
            </div>

            {registerAs === 'student' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <select name="board" value={formData.board} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="CBSE">CBSE</option>
                    <option value="STATE">State Board</option>
                    <option value="ICSE">ICSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select name="grade" value={formData.grade} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="10">Class 10</option>
                    <option value="9">Class 9</option>
                  </select>
                </div>
              </div>
            )}

            {registerAs === 'school' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                <select name="board" value={formData.board} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="CBSE">CBSE</option>
                  <option value="STATE">State Board</option>
                  <option value="ICSE">ICSE</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type="password" name="password2" value={formData.password2} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? 'Creating Account...' : registerAs === 'school' ? 'Register School' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
