import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ManageAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', student_ids: [] });

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/api/assignments/');
      setAssignments(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOptions = async () => {
    try {
      const [tRes, sRes, subRes] = await Promise.all([
        api.get('/api/auth/members/', { params: { role: 'teacher' } }),
        api.get('/api/auth/members/', { params: { role: 'student' } }),
        api.get('/api/subjects/'),
      ]);
      setTeachers(tRes.data.results || tRes.data);
      setStudents(sRes.data.results || sRes.data);
      setSubjects(subRes.data.results || subRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchAssignments(), fetchOptions()]);
      setLoading(false);
    };
    init();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const toggleStudent = (id) => {
    setForm((prev) => {
      const ids = prev.student_ids.includes(id)
        ? prev.student_ids.filter((sid) => sid !== id)
        : [...prev.student_ids, id];
      return { ...prev, student_ids: ids };
    });
  };

  const toggleAllStudents = () => {
    setForm((prev) => {
      if (prev.student_ids.length === students.length) return { ...prev, student_ids: [] };
      return { ...prev, student_ids: students.map((s) => s.id) };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.teacher_id || !form.subject_id) {
      showMsg('Please select a teacher and subject.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/assignments/create/', {
        teacher_id: parseInt(form.teacher_id, 10),
        subject_id: parseInt(form.subject_id, 10),
        student_ids: form.student_ids,
      });
      showMsg('Assignment created successfully!');
      setForm({ teacher_id: '', subject_id: '', student_ids: [] });
      setShowForm(false);
      fetchAssignments();
    } catch (err) {
      const detail = err.response?.data;
      let errorMsg = 'Failed to create assignment.';
      if (detail?.error) errorMsg = detail.error;
      else if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0];
        const val = detail[firstKey];
        errorMsg = Array.isArray(val) ? val[0] : String(val);
      }
      showMsg(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this teacher assignment?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/assignments/${id}/`);
      showMsg('Assignment removed.');
      fetchAssignments();
    } catch {
      showMsg('Failed to remove assignment.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/school/dashboard" className="hover:text-indigo-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Teacher Assignments</h1>
        </div>
        <p className="text-indigo-100">Assign teachers to subjects and map students to each teacher-subject pair.</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Assignments ({assignments.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
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
              New Assignment
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Teacher Assignment</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} (@{t.username})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students multi-select */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Assign Students</label>
                {students.length > 0 && (
                  <button type="button" onClick={toggleAllStudents} className="text-xs text-indigo-600 font-medium hover:underline">
                    {form.student_ids.length === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              {students.length === 0 ? (
                <p className="text-sm text-gray-400">No students found. Create student accounts first.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {students.map((stu) => (
                    <label key={stu.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={form.student_ids.includes(stu.id)}
                        onChange={() => toggleStudent(stu.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        {stu.first_name} {stu.last_name}
                      </span>
                      <span className="text-xs text-gray-400">@{stu.username}</span>
                      {stu.grade && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Grade {stu.grade}</span>}
                    </label>
                  ))}
                </div>
              )}
              {form.student_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{form.student_ids.length} student(s) selected</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Assignment'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ teacher_id: '', subject_id: '', student_ids: [] }); }}
                className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mb-2">No teacher assignments yet.</p>
          <button onClick={() => setShowForm(true)} className="text-indigo-600 font-medium hover:underline">
            Create your first assignment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{a.teacher_name}</h3>
                      <p className="text-sm text-indigo-600 font-medium">{a.subject_name}</p>
                    </div>
                  </div>

                  {/* Students list */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{a.student_count} Student(s)</p>
                    {a.students_detail && a.students_detail.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {a.students_detail.map((s) => (
                          <span key={s.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No students assigned</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deleting === a.id}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 self-start"
                >
                  {deleting === a.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
