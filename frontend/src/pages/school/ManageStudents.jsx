import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Common/Avatar';

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  grade: '',
  section: '',
  student_id: '',
  parent_phone: '',
};

export default function ManageStudents() {
  const { user } = useAuth();
  const isCoaching = user?.org_type === 'coaching';
  const classFrom = user?.class_from || 1;
  const classTo = user?.class_to || 12;
  const classRange = Array.from({ length: classTo - classFrom + 1 }, (_, i) => classFrom + i);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleting, setDeleting] = useState(null);
  const [bgImages, setBgImages] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [coachingChapters, setCoachingChapters] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  useEffect(() => {
    api.get('/api/site-images/').then(res => setBgImages(res.data)).catch(() => {});
    fetchStudents(page);
    if (isCoaching) {
      // Fetch all subjects, then fetch chapters for each
      api.get('/api/subjects/').then(async (res) => {
        const subs = res.data.results || res.data;
        let allChapters = [];
        for (const s of subs) {
          try {
            const chRes = await api.get('/api/chapters/', { params: { subject: s.id } });
            const chs = (chRes.data.results || chRes.data).map(ch => ({ ...ch, subject_name: s.name }));
            allChapters = [...allChapters, ...chs];
          } catch {}
        }
        setCoachingChapters(allChapters);
      }).catch(() => {});
    }
  }, [page]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
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

  const handleEditClick = (student) => {
    setEditingId(student.id);
    setEditForm({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      email: student.email || '',
      phone_number: student.phone_number || '',
      grade: student.grade || '',
      section: student.section || '',
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    try {
      await api.patch(`/api/auth/members/${editingId}/update/`, editForm);
      showMessage('Student updated successfully!');
      setEditingId(null);
      setEditForm({});
      fetchStudents(page);
    } catch (err) {
      const detail = err.response?.data;
      let errorMsg = 'Failed to update student.';
      if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0];
        const val = detail[firstKey];
        errorMsg = Array.isArray(val) ? val[0] : String(val);
      }
      showMessage(errorMsg, 'error');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with Background Image */}
      <div
        className="rounded-2xl p-8 md:p-10 text-white mb-8 bg-cover bg-center relative overflow-hidden"
        style={bgImages.manage_students?.url ? { backgroundImage: `url(${bgImages.manage_students.url})` } : {}}
      >
        <div className={`absolute inset-0 ${bgImages.manage_students?.url ? 'bg-black/50' : 'bg-gradient-to-r from-gray-900 to-indigo-600'}`}></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">Manage Students</h1>
          <p className="mt-2 text-white/80">Add, view and manage student accounts for your {isCoaching ? 'coaching centre' : 'school'}.</p>
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

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className={`grid grid-cols-1 gap-3 ${isCoaching ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
          />
          {isCoaching ? (
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
            >
              <option value="">All Exam Types</option>
              {coachingChapters.map(ch => (
                <option key={ch.id} value={ch.name}>{ch.name}</option>
              ))}
            </select>
          ) : (
            <>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
              >
                <option value="">All Classes</option>
                {classRange.map(g => (
                  <option key={g} value={String(g)}>Class {g}</option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
              >
                <option value="">All Sections</option>
                {['A','B','C','D','E'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </>
          )}
          {(searchName || filterGrade || filterSection) && (
            <button
              onClick={() => { setSearchName(''); setFilterGrade(''); setFilterSection(''); }}
              className="text-sm text-indigo-600 font-medium hover:underline self-center"
            >
              Clear filters
            </button>
          )}
        </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Auto-generated if left blank"
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
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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

            {/* Row 4: Grade + Section (schools) or Exam Type (coaching) */}
            {isCoaching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type *</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">Select Exam Type</option>
                    {coachingChapters.map(ch => (
                      <option key={ch.id} value={ch.name}>{ch.name}</option>
                    ))}
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">Select Class</option>
                    {classRange.map(g => (
                      <option key={g} value={String(g)}>Class {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">Select Section</option>
                    {['A','B','C','D','E'].map(s => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
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
            )}

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
      ) : (() => {
        const filtered = students.filter((s) => {
          const name = `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase();
          if (searchName && !name.includes(searchName.toLowerCase())) return false;
          if (filterGrade && s.grade !== filterGrade) return false;
          if (filterSection && s.section !== filterSection) return false;
          return true;
        });
        return filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500">No students match your filters.</p>
          </div>
        ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{filtered.length} student(s) found</p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{isCoaching ? 'Exam Type' : 'Class'}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Student ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                    {!isCoaching && <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned Teachers</th>}
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((student, index) =>
                    editingId === student.id ? (
                      <tr key={student.id} className="bg-indigo-50/40">
                        <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2" colSpan={1}>
                          <div className="flex gap-1">
                            <input
                              name="first_name"
                              value={editForm.first_name}
                              onChange={handleEditChange}
                              placeholder="First"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                            <input
                              name="last_name"
                              value={editForm.last_name}
                              onChange={handleEditChange}
                              placeholder="Last"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-500">@{student.username}</td>
                        <td className="px-4 py-2">
                          {isCoaching ? (
                            <select
                              name="grade"
                              value={editForm.grade}
                              onChange={handleEditChange}
                              className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                            >
                              <option value="">Select</option>
                              {coachingChapters.map(ch => (
                                <option key={ch.id} value={ch.name}>{ch.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex gap-1">
                              <select
                                name="grade"
                                value={editForm.grade}
                                onChange={handleEditChange}
                                className="w-16 px-1 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                              >
                                <option value="">--</option>
                                {classRange.map(g => (
                                  <option key={g} value={String(g)}>{g}</option>
                                ))}
                              </select>
                              <select
                                name="section"
                                value={editForm.section}
                                onChange={handleEditChange}
                                className="w-14 px-1 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                              >
                                <option value="">--</option>
                                {['A','B','C','D','E'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{student.student_id || '-'}</td>
                        <td className="px-4 py-2">
                          <input
                            name="email"
                            type="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                            placeholder="Email"
                            className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name="phone_number"
                            value={editForm.phone_number}
                            onChange={handleEditChange}
                            placeholder="Phone"
                            className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        {!isCoaching && (
                          <td className="px-4 py-2">
                            {student.assigned_teachers && student.assigned_teachers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {student.assigned_teachers.map((at, idx) => (
                                  <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                    {at.teacher_name} - {at.subject_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleEditSave}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={student.profile_photo} name={student.first_name || student.username} size="sm" />
                            <span>{student.first_name} {student.last_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">@{student.username}</td>
                        <td className="px-4 py-3">
                          {student.grade ? (
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                              {isCoaching ? student.grade : `${student.grade}${student.section || ''}`}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{student.student_id || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{student.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{student.phone_number || '-'}</td>
                        {!isCoaching && (
                          <td className="px-4 py-3">
                            {student.assigned_teachers && student.assigned_teachers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {student.assigned_teachers.map((at, idx) => (
                                  <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                    {at.teacher_name} - {at.subject_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(student)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              disabled={deleting === student.id}
                              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                            >
                              {deleting === student.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
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
        );
      })()}
    </div>
  );
}
