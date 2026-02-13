import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function CreateExam() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    chapter_ids: [],
    duration_minutes: 90,
    total_marks: 50,
    student_ids: [],
    start_time: '',
    end_time: '',
  });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch teacher's assignments (subject + students mappings)
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await api.get('/api/assignments/my/');
        setAssignments(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setInitLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // When subject changes, fetch chapters and load mapped students
  useEffect(() => {
    if (!form.subject) {
      setChapters([]);
      setStudents([]);
      setForm((prev) => ({ ...prev, chapter_ids: [], student_ids: [] }));
      return;
    }

    const fetchChapters = async () => {
      try {
        const res = await api.get('/api/chapters/', { params: { subject: form.subject } });
        setChapters(res.data.results || res.data);
        setForm((prev) => ({ ...prev, chapter_ids: [] }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchChapters();

    // Load students from the selected assignment
    const assignment = assignments.find((a) => String(a.subject) === String(form.subject));
    if (assignment && assignment.students_detail) {
      setStudents(assignment.students_detail);
      // Auto-select all mapped students
      setForm((prev) => ({ ...prev, student_ids: assignment.students_detail.map((s) => s.id) }));
    } else {
      // Fallback: fetch all students for the subject from the API
      const fetchStudents = async () => {
        try {
          const res = await api.get('/api/auth/my-students/', { params: { subject: form.subject } });
          const data = res.data.results || res.data;
          setStudents(data);
          setForm((prev) => ({ ...prev, student_ids: data.map((s) => s.id) }));
        } catch (err) {
          console.error(err);
        }
      };
      fetchStudents();
    }
  }, [form.subject, assignments]);

  // Derive unique subjects from teacher's assignments
  const subjects = assignments.map((a) => ({
    id: a.subject,
    name: a.subject_name,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleChapter = (chapterId) => {
    setForm((prev) => {
      const ids = prev.chapter_ids.includes(chapterId)
        ? prev.chapter_ids.filter((id) => id !== chapterId)
        : [...prev.chapter_ids, chapterId];
      return { ...prev, chapter_ids: ids };
    });
  };

  const toggleStudent = (studentId) => {
    setForm((prev) => {
      const ids = prev.student_ids.includes(studentId)
        ? prev.student_ids.filter((id) => id !== studentId)
        : [...prev.student_ids, studentId];
      return { ...prev, student_ids: ids };
    });
  };

  const toggleAllStudents = () => {
    setForm((prev) => {
      if (prev.student_ids.length === students.length) {
        return { ...prev, student_ids: [] };
      }
      return { ...prev, student_ids: students.map((s) => s.id) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/exams/assigned/create/', {
        title: form.title,
        subject: form.subject,
        chapter_ids: form.chapter_ids,
        duration_minutes: parseInt(form.duration_minutes, 10),
        total_marks: parseInt(form.total_marks, 10),
        student_ids: form.student_ids,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      navigate('/teacher/results');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teacher/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Create Exam</h1>
      </div>

      {assignments.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-700 text-sm">
            You have no subject assignments yet. Ask your school admin to assign you to a subject with students before creating exams.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="e.g. Unit Test - Chapter 3 & 4"
          />
        </div>

        {/* Subject (from assignments) */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            id="subject"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {subjects.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">No subjects assigned. Contact your school admin.</p>
          )}
        </div>

        {/* Chapters multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chapters</label>
          {!form.subject ? (
            <p className="text-sm text-gray-400">Select a subject first</p>
          ) : chapters.length === 0 ? (
            <p className="text-sm text-gray-400">No chapters found for this subject</p>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {chapters.map((ch) => (
                <label key={ch.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={form.chapter_ids.includes(ch.id)}
                    onChange={() => toggleChapter(ch.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{ch.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Duration & Total Marks */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              id="duration_minutes"
              name="duration_minutes"
              value={form.duration_minutes}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          <div>
            <label htmlFor="total_marks" className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
            <input
              type="number"
              id="total_marks"
              name="total_marks"
              value={form.total_marks}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Start & End Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              id="start_time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              id="end_time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Students multi-select */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Assign to Students</label>
            {students.length > 0 && (
              <button
                type="button"
                onClick={toggleAllStudents}
                className="text-xs text-indigo-600 font-medium hover:underline"
              >
                {form.student_ids.length === students.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          {!form.subject ? (
            <p className="text-sm text-gray-400">Select a subject to see assigned students</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-400">No students mapped for this subject</p>
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
                    {stu.name || stu.first_name && stu.last_name
                      ? (stu.name || `${stu.first_name} ${stu.last_name}`)
                      : stu.username}
                  </span>
                  <span className="text-xs text-gray-400">({stu.username})</span>
                </label>
              ))}
            </div>
          )}
          {form.student_ids.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{form.student_ids.length} student(s) selected</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Creating Exam...
            </span>
          ) : (
            'Create Exam'
          )}
        </button>
      </form>
    </div>
  );
}
