import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Avatar from '../../components/Common/Avatar';

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  subject_ids: [],
};

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [editSubjectIds, setEditSubjectIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [bgImages, setBgImages] = useState({});

  const fetchTeachers = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/members/', { params: { role: 'teacher', page: pageNum } });
      const data = res.data;
      if (data.results) {
        setTeachers(data.results);
        setHasMore(!!data.next);
      } else {
        setTeachers(data);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects/');
      setSubjects(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    api.get('/api/site-images/').then(res => setBgImages(res.data)).catch(() => {});
    fetchTeachers(page);
    fetchSubjects();
  }, [page]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const toggleSubject = (id) => {
    setFormData((prev) => {
      const ids = prev.subject_ids.includes(id)
        ? prev.subject_ids.filter((sid) => sid !== id)
        : [...prev.subject_ids, id];
      return { ...prev, subject_ids: ids };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/auth/create-teacher/', formData);
      showMessage('Teacher created successfully!');
      setFormData({ ...initialForm });
      setShowForm(false);
      setPage(1);
      fetchTeachers(1);
    } catch (err) {
      const detail = err.response?.data;
      let errorMsg = 'Failed to create teacher.';
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
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/auth/members/${id}/`);
      showMessage('Teacher removed successfully!');
      fetchTeachers(page);
    } catch (err) {
      showMessage('Failed to remove teacher.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startEditing = (teacher) => {
    setEditingId(teacher.id);
    setEditForm({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      username: teacher.username || '',
      email: teacher.email || '',
      phone_number: teacher.phone_number || '',
      teacher_id: teacher.teacher_id || '',
      new_password: '',
    });
    const currentSubjectNames = (teacher.assigned_teachers || []).map(a => a.subject_name);
    const currentSubjectIds = subjects.filter(s => currentSubjectNames.includes(s.name)).map(s => s.id);
    setEditSubjectIds(currentSubjectIds);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ first_name: '', last_name: '', username: '', email: '', phone_number: '', teacher_id: '', new_password: '' });
    setEditSubjectIds([]);
  };

  const toggleEditSubject = (id) => {
    setEditSubjectIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    setSaving(true);
    try {
      await api.patch(`/api/auth/members/${id}/update/`, { ...editForm, subject_ids: editSubjectIds });
      showMessage('Teacher updated successfully!');
      cancelEditing();
      fetchTeachers(page);
    } catch (err) {
      const detail = err.response?.data;
      let errorMsg = 'Failed to update teacher.';
      if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0];
        const val = detail[firstKey];
        errorMsg = Array.isArray(val) ? val[0] : String(val);
      }
      showMessage(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with Background Image */}
      <div
        className="rounded-2xl p-8 md:p-10 text-white mb-8 bg-cover bg-center relative overflow-hidden"
        style={bgImages.manage_teachers?.url ? { backgroundImage: `url(${bgImages.manage_teachers.url})` } : {}}
      >
        <div className={`absolute inset-0 ${bgImages.manage_teachers?.url ? 'bg-black/50' : 'bg-gradient-to-r from-gray-900 to-indigo-600'}`}></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">Manage Teachers</h1>
          <p className="mt-2 text-white/80">Add, view and manage teacher accounts for your school.</p>
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
        <h2 className="text-xl font-bold text-gray-800">Teachers List</h2>
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
              Add Teacher
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Create New Teacher</h3>
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

            {/* Assign Subjects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Subject(s)</label>
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-400">No subjects available. Add subjects first via admin or populate data.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50/50">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1.5 rounded-md transition">
                      <input
                        type="checkbox"
                        checked={formData.subject_ids.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {formData.subject_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{formData.subject_ids.length} subject(s) selected</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Creating...' : 'Create Teacher'}
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

      {/* Teachers List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 mb-2">No teachers added yet.</p>
          <button onClick={() => setShowForm(true)} className="text-indigo-600 font-medium hover:underline">
            Add your first teacher
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                {editingId === teacher.id ? (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Teacher</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                        <input name="first_name" value={editForm.first_name} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="First name" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                        <input name="last_name" value={editForm.last_name} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="Last name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                        <input name="username" value={editForm.username} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="Username" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Teacher ID</label>
                        <input name="teacher_id" value={editForm.teacher_id} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="e.g. TCH001" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input name="email" type="email" value={editForm.email} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="Email" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                        <input name="phone_number" value={editForm.phone_number} onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="Phone number" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
                      <input name="new_password" type="password" value={editForm.new_password} onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" placeholder="Enter new password" />
                    </div>
                    {/* Subject assignment */}
                    {subjects.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Subject(s)</label>
                        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                              <input type="checkbox" checked={editSubjectIds.includes(s.id)} onChange={() => toggleEditSubject(s.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              <span className="text-gray-700">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleEditSave(teacher.id)}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar src={teacher.profile_photo} name={teacher.first_name || teacher.username} className="!rounded-lg" />
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                        <p className="text-sm text-gray-500">@{teacher.username}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {teacher.email && (
                            <p className="text-xs text-gray-400">{teacher.email}</p>
                          )}
                          {teacher.phone_number && (
                            <p className="text-xs text-gray-400">{teacher.phone_number}</p>
                          )}
                        </div>
                        {/* Show assigned subjects (deduplicated) */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {teacher.assigned_teachers && teacher.assigned_teachers.length > 0
                            ? [...new Map(teacher.assigned_teachers.map(a => [a.subject_name, a])).values()].map((at, idx) => (
                                <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  {at.subject_name}
                                </span>
                              ))
                            : (
                                <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full">
                                  No subject assigned
                                </span>
                              )
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-start md:self-center">
                      <button
                        onClick={() => startEditing(teacher)}
                        className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        disabled={deleting === teacher.id}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {deleting === teacher.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
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
