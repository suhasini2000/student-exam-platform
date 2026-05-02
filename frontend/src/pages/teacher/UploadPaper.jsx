import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const INPUT_CLS = 'w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 transition bg-gray-50 text-sm';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

export default function UploadPaper() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [form, setForm] = useState({ title: '', subject: '', chapter: '', total_marks: 50, file: null });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, generated: 0, subjects: 0 });

  useEffect(() => {
    api.get('/api/subjects/').then(res => setSubjects(res.data.results || res.data)).catch(console.error);
    api.get('/api/exams/papers/').then(res => {
      const papers = res.data.results || res.data || [];
      const subjectSet = new Set(papers.map(p => p.subject));
      setStats({
        total: papers.length,
        generated: papers.filter(p => p.questions_generated).length,
        subjects: subjectSet.size,
      });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.subject) { setChapters([]); setForm(p => ({ ...p, chapter: '' })); return; }
    api.get('/api/chapters/', { params: { subject: form.subject } })
      .then(res => setChapters(res.data.results || res.data)).catch(console.error);
  }, [form.subject]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') setForm(p => ({ ...p, file: files[0] }));
    else setForm(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subject', form.subject);
      if (form.chapter) fd.append('chapter', form.chapter);
      fd.append('total_marks', form.total_marks);
      fd.append('file', form.file);
      await api.post('/api/exams/papers/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Paper uploaded successfully! You can now generate questions from the Papers list.');
      setForm({ title: '', subject: '', chapter: '', total_marks: 50, file: null });
      const fi = document.getElementById('paper-file-input');
      if (fi) fi.value = '';
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to upload paper. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
        <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1400&q=80"
          alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Teacher Portal</p>
          <div className="flex items-center justify-between gap-4 mb-1">
            <h1 className="text-3xl font-extrabold text-white">Upload Paper</h1>
            <Link to="/teacher/papers"
              className="hidden sm:inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/20 transition shrink-0">
              Papers List
            </Link>
          </div>
          <p className="text-indigo-200 text-sm mb-6">Upload a PDF question paper for use in your exams</p>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]">
              <p className="text-xl font-extrabold text-white">{stats.total}</p>
              <p className="text-white/50 text-xs">Total Papers</p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]">
              <p className="text-xl font-extrabold text-emerald-200">{stats.generated}</p>
              <p className="text-white/50 text-xs">Generated</p>
            </div>
            <div className="bg-indigo-500/30 border border-indigo-400/40 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]">
              <p className="text-xl font-extrabold text-indigo-200">{stats.subjects}</p>
              <p className="text-white/50 text-xs">Subjects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-emerald-800 font-semibold text-sm">{success}</p>
            <Link to="/teacher/papers" className="text-emerald-600 text-sm font-medium hover:underline mt-1 inline-block">
              Go to Papers List →
            </Link>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Details card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4">
              <p className="font-semibold text-white text-sm">Paper Details</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={LABEL_CLS}>Paper Title</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required className={INPUT_CLS} placeholder="e.g. Mid-term Physics Paper 2024" />
              </div>
              <div>
                <label className={LABEL_CLS}>Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} required className={INPUT_CLS}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Chapter <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <select name="chapter" value={form.chapter} onChange={handleChange} disabled={!form.subject} className={INPUT_CLS + ' disabled:opacity-50'}>
                  <option value="">All Chapters</option>
                  {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Total Marks</label>
                <input type="number" name="total_marks" value={form.total_marks} onChange={handleChange} min="1" required className={INPUT_CLS} />
              </div>
            </div>
          </div>

          {/* File upload card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
              <p className="font-semibold text-white text-sm">PDF File</p>
            </div>
            <div className="p-5">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-8 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition bg-gray-50">
                <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {form.file ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">{form.file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(form.file.size / 1024).toFixed(0)} KB — click to change</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium">Click to select a PDF</p>
                    <p className="text-xs text-gray-400 mt-1">Only PDF files are accepted</p>
                  </div>
                )}
                <input type="file" id="paper-file-input" name="file" accept=".pdf" onChange={handleChange} required className="hidden" />
              </label>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Uploading…
              </span>
            ) : 'Upload Paper'}
          </button>
        </form>
      </div>
    </div>
  );
}
