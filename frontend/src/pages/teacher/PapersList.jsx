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
  const [selectedPapers, setSelectedPapers] = useState([]);

  const fetchPapers = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/papers/', { params: { page: pageNum } });
      const data = res.data;
      if (data.results) {
        setPapers(data.results);
        setHasMore(!!data.next);
      } else {
        setPapers(data);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers(page);
  }, [page]);

  const handleGenerate = async (paperId) => {
    setGenerating((prev) => ({ ...prev, [paperId]: true }));
    try {
      await api.post(`/api/exams/papers/${paperId}/generate/`);
      await fetchPapers(page);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to generate questions';
      alert(msg);
    } finally {
      setGenerating((prev) => ({ ...prev, [paperId]: false }));
    }
  };

  const toggleSelect = (paperId) => {
    setSelectedPapers((prev) =>
      prev.includes(paperId) ? prev.filter((id) => id !== paperId) : [...prev, paperId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPapers.length === papers.length) {
      setSelectedPapers([]);
    } else {
      setSelectedPapers(papers.map((p) => p.id));
    }
  };

  const handleCreateFromSelected = () => {
    navigate(`/teacher/create-from-papers?papers=${selectedPapers.join(',')}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Papers</h1>
        <div className="flex gap-3">
          <Link to="/teacher/create-from-papers" className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition text-sm">
            Create Paper from Old Papers
          </Link>
          <Link to="/teacher/upload-paper" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition text-sm">
            Upload New Paper
          </Link>
        </div>
      </div>

      {/* Selection action bar */}
      {selectedPapers.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-indigo-800">
            {selectedPapers.length} paper(s) selected
          </p>
          <button
            onClick={handleCreateFromSelected}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Create Paper from Selected
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : papers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 mb-4">No papers uploaded yet.</p>
          <Link to="/teacher/upload-paper" className="text-indigo-600 font-medium hover:underline">Upload your first paper</Link>
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              <input
                type="checkbox"
                checked={selectedPapers.length === papers.length && papers.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Select All
            </label>
          </div>

          <div className="space-y-4">
            {papers.map((paper) => (
              <div key={paper.id} className={`bg-white rounded-xl p-5 shadow-sm border transition ${
                selectedPapers.includes(paper.id) ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-100'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedPapers.includes(paper.id)}
                      onChange={() => toggleSelect(paper.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-800">{paper.title}</h3>
                        {paper.questions_generated ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Questions Generated
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {paper.subject_name} | Total Marks: {paper.total_marks}
                      </p>
                      {paper.generation_error && (
                        <p className="text-sm text-red-500 mt-1">
                          Error: {paper.generation_error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleGenerate(paper.id)}
                      disabled={paper.questions_generated || generating[paper.id]}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition min-h-[44px] ${
                        paper.questions_generated
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                      }`}
                    >
                      {generating[paper.id] ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </span>
                      ) : paper.questions_generated ? (
                        'Generated'
                      ) : (
                        'Generate Questions'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-3 mt-8">
            <button onClick={() => setPage(page - 1)} disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]">
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">Page {page}</span>
            <button onClick={() => setPage(page + 1)} disabled={!hasMore}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]">
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
