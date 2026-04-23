import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function UploadPaper() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    chapter: '',
    total_marks: 50,
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/api/subjects/');
        setSubjects(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!form.subject) {
      setChapters([]);
      setForm((prev) => ({ ...prev, chapter: '' }));
      return;
    }
    const fetchChapters = async () => {
      try {
        const res = await api.get('/api/chapters/', { params: { subject: form.subject } });
        setChapters(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchChapters();
  }, [form.subject]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setForm((prev) => ({ ...prev, file: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('subject', form.subject);
      if (form.chapter) formData.append('chapter', form.chapter);
      formData.append('total_marks', form.total_marks);
      formData.append('file', form.file);

      await api.post('/api/exams/papers/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Paper uploaded successfully! You can now generate questions from the Papers list.');
      setForm({ title: '', subject: '', chapter: '', total_marks: 50, file: null });
      // Reset file input
      const fileInput = document.getElementById('paper-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to upload paper. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teacher/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Upload Paper</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-medium">{success}</p>
          <Link to="/teacher/papers" className="text-green-600 text-sm font-medium hover:underline mt-1 inline-block">
            Go to Papers List
          </Link>
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="e.g. Mid-term Physics Paper 2024"
          />
        </div>

        {/* Subject */}
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
        </div>

        {/* Chapter */}
        <div>
          <label htmlFor="chapter" className="block text-sm font-medium text-gray-700 mb-1">Chapter (optional)</label>
          <select
            id="chapter"
            name="chapter"
            value={form.chapter}
            onChange={handleChange}
            disabled={!form.subject}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">All Chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Total Marks */}
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

        {/* File */}
        <div>
          <label htmlFor="paper-file-input" className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
          <input
            type="file"
            id="paper-file-input"
            name="file"
            accept=".pdf"
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="text-xs text-gray-400 mt-1">Only PDF files are accepted</p>
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
              Uploading...
            </span>
          ) : (
            'Upload Paper'
          )}
        </button>
      </form>
    </div>
  );
}
