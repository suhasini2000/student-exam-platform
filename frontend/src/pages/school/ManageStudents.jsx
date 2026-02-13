import { useState, useEffect } from 'react';
import api from '../../api/axios';

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  grade: '9',
  student_id: '',
  parent_phone: '',
  teacher_ids: [],
};

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleting, setDeleting] = useState(null);
  const [bgImages, setBgImages] = useState({});

  const fetchStudents = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/members/', { params: { role: 'student', page: pageNum } });
      const data = res.data;
      if (data.results) {
        setStudents(data.results);
        setHasMore(!!data.next);
      } else {
        setStudents(data);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/api/auth/members/', { params: { role: 'teacher' } });
      setTeachers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    api.get('/api/site-images/').then(res => setBgImages(res.data)).catch(() => {});
    fetchStudents(page);
    fetchTeachers();
  }, [page]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const toggleTeacher = (id) => {
    setFormData((prev) => {
      const ids = prev.teacher_ids.includes(id)
        ? prev.teacher_ids.filter((tid) => tid !== id)
        : [...prev.teacher_ids, id];
      return { ...prev, teacher_ids: ids };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/auth/create-student/', formData);
      showMessage('Student created successfully!');
      setFormData({ ...initialForm });
      setShowForm(false);
      setPage(1);
      fetchStudents(1);
    } catch (err) {
      const detail = err.response?.data;
      let errorMsg = 'Failed to create student.';
      if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0];
        const val = detail[firstKey];
        errorMsg = Array.isArray(val) ? val[0] : String(val);
      }
      showMessage(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/auth/members/${id}/`);
      showMessage('Student removed successfully!');
      fetchStudents(page);
    } catch (err) {
      showMessage('Failed to remove student.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with Background Image */}
      <div
        className="rounded-2xl p-8 md:p-10 text-white mb-8 bg-cover bg-center relative overflow-hidden"
        style={bgImages.manage_students?.url ? { backgroundImage: `url(${bgImages.manage_students.url})` } : {}}
      >
        <div className={`absolute inset-0 ${bgImages.manage_students?.url ? 'bg-black/50' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">Manage Students</h1>
          <p className="mt-2 text-white/80">Add, view and manage student accounts for your school.</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {message.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {message.text}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Students List</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          {showForm ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Student
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Create New Student</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Row 1: First Name + Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Row 2: Username + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter email"
                />
              </div>
            </div>

            {/* Row 3: Password + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Row 4: Grade + Student ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition"
                >
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter student ID"
                />
              </div>
            </div>

            {/* Row 5: Parent Phone (alone) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                <input
                  name="parent_phone"
                  value={formData.parent_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Enter parent phone"
                />
              </div>
            </div>

            {/* Assign to Teachers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Teacher(s)</label>
              {teachers.length === 0 ? (
                <p className="text-sm text-gray-400">No teachers created yet. Create teachers first to assign students.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50/50">
                  {teachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1.5 rounded-md transition">
                      <input
                        type="checkbox"
                        checked={formData.teacher_ids.includes(t.id)}
                        onChange={() => toggleTeacher(t.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{t.first_name} {t.last_name}</span>
                      <span className="text-xs text-gray-400">@{t.username}</span>
                    </label>
                  ))}
                </div>
              )}
              {formData.teacher_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Student will be added to all subject assignments of the selected teacher(s).
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Creating...' : 'Create Student'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormData({ ...initialForm }); }}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500 mb-2">No students added yet.</p>
          <button onClick={() => setShowForm(true)} className="text-indigo-600 font-medium hover:underline">
            Add your first student
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-50 text-purple-600 p-2.5 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">@{student.username}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {student.grade && (
                          <span className="inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                            Class {student.grade}
                          </span>
                        )}
                        {student.student_id && (
                          <p className="text-xs text-gray-400">ID: {student.student_id}</p>
                        )}
                        {student.email && (
                          <p className="text-xs text-gray-400">{student.email}</p>
                        )}
                        {student.phone_number && (
                          <p className="text-xs text-gray-400">{student.phone_number}</p>
                        )}
                      </div>
                      {/* Show assigned teachers */}
                      {student.assigned_teachers && student.assigned_teachers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {student.assigned_teachers.map((at, idx) => (
                            <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              {at.teacher_name} - {at.subject_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(student.id)}
                    disabled={deleting === student.id}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 self-start md:self-center"
                  >
                    {deleting === student.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
