import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function PapersList() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [generating, setGenerating] = useState({});
  const [deleting, setDeleting] = useState({});
  const [selectedPapers, setSelectedPapers] = useState([]);

  const fetchPapers = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/papers/', { params: { page: pageNum } });
      const data = res.data;
      if (data.results) { setPapers(data.results); setHasMore(!!data.next); }
      else { setPapers(data); setHasMore(false); }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPapers(page); }, [page]);

  const handleGenerate = async (paperId) => {
    setGenerating(prev => ({ ...prev, [paperId]: true }));
    try {
      await api.post(`/api/exams/papers/${paperId}/generate/`);
      const poll = setInterval(async () => {
        try {
          const res = await api.get('/api/exams/papers/', { params: { page } });
          const data = res.data.results || res.data;
          const paper = data.find(p => p.id === paperId);
          if (paper && (paper.questions_generated || paper.generation_error)) {
            clearInterval(poll);
            setPapers(data);
            setHasMore(!!res.data.next);
            setGenerating(prev => ({ ...prev, [paperId]: false }));
          }
        } catch { /* ignore */ }
      }, 5000);
      setTimeout(() => { clearInterval(poll); setGenerating(prev => ({ ...prev, [paperId]: false })); fetchPapers(page); }, 180000);
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to generate questions');
      setGenerating(prev => ({ ...prev, [paperId]: false }));
    }
  };

  const handleDelete = async (paperId) => {
    if (!confirm('Delete this paper? This cannot be undone.')) return;
    setDeleting(prev => ({ ...prev, [paperId]: true }));
    try {
      await api.delete(`/api/exams/papers/${paperId}/`);
      setSelectedPapers(prev => prev.filter(id => id !== paperId));
      await fetchPapers(page);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete paper');
    } finally { setDeleting(prev => ({ ...prev, [paperId]: false })); }
  };

  const toggleSelect = id => setSelectedPapers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedPapers(selectedPapers.length === papers.length ? [] : papers.map(p => p.id));
  const handleCreateFromSelected = () => navigate(`/teacher/generate-paper?papers=${selectedPapers.join(',')}`);

  const generated = papers.filter(p => p.questions_generated).length;

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
            <h1 className="text-3xl font-extrabold text-white">Uploaded Papers</h1>
            <div className="hidden sm:flex gap-3 shrink-0">
              <Link to="/teacher/upload-paper"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Paper
              </Link>
              <Link to="/teacher/generate-paper"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/20 transition">
                Generate
              </Link>
            </div>
          </div>
          <p className="text-indigo-200 text-sm mb-6">Select papers to assign to your exam</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Papers', value: papers.length,              color: 'bg-white/10 border-white/20',             text: 'text-white'      },
              { label: 'Generated',    value: generated,                  color: 'bg-indigo-500/30 border-indigo-400/40',   text: 'text-indigo-200' },
              { label: 'Uploaded',     value: papers.length - generated,  color: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-200'},
            ].map(({ label, value, color, text }) => (
              <div key={label} className={`${color} border rounded-xl px-4 py-2.5 text-center backdrop-blur-sm min-w-[80px]`}>
                <p className={`text-xl font-extrabold ${text}`}>{value}</p>
                <p className="text-white/50 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Selection action bar */}
        {selectedPapers.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-800">
              {selectedPapers.length} paper{selectedPapers.length !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handleCreateFromSelected}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              Generate Questions from Selected
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No papers uploaded yet</h3>
            <Link to="/teacher/upload-paper" className="text-indigo-600 font-medium text-sm hover:underline">Upload your first paper →</Link>
          </div>
        ) : (
          <>
            {/* Select all */}
            <label className="inline-flex items-center gap-2 mb-4 cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              <input type="checkbox"
                checked={selectedPapers.length === papers.length && papers.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Select All
            </label>

            <div className="grid grid-cols-1 gap-4">
              {papers.map((paper) => (
                <div key={paper.id} className={`bg-white rounded-2xl shadow-sm border-2 transition-all overflow-hidden ${selectedPapers.includes(paper.id) ? 'border-indigo-400' : 'border-gray-100'}`}>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <input
                        type="checkbox"
                        checked={selectedPapers.includes(paper.id)}
                        onChange={() => toggleSelect(paper.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800 text-sm">{paper.title}</h3>
                          {paper.questions_generated ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Generated</span>
                          ) : paper.generation_error && !paper.generation_error.startsWith('[') ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Error</span>
                          ) : paper.generation_error ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Processing…</span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{paper.subject_name} · {paper.total_marks} marks</p>
                        {paper.generation_error && !paper.generation_error.startsWith('[') && (
                          <p className="text-xs text-red-500 mt-1">{paper.generation_error}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerate(paper.id)}
                        disabled={paper.questions_generated || generating[paper.id]}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                          paper.questions_generated
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 shadow-sm'
                        }`}
                      >
                        {generating[paper.id] ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                            Generating…
                          </span>
                        ) : paper.questions_generated ? 'Generated' : 'Generate Questions'}
                      </button>
                      <button
                        onClick={() => handleDelete(paper.id)}
                        disabled={deleting[paper.id]}
                        className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 border-2 border-gray-100 hover:border-red-200 transition disabled:opacity-50"
                        title="Delete paper"
                      >
                        {deleting[paper.id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 hover:border-indigo-300 text-gray-600 font-medium text-sm transition disabled:opacity-40">
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl border-2 border-indigo-100">
                Page {page}
              </span>
              <button onClick={() => setPage(page + 1)} disabled={!hasMore}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 hover:border-indigo-300 text-gray-600 font-medium text-sm transition disabled:opacity-40">
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
