import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

export default function CreateFromPapers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    instructions: '',
    subject: '',
    total_marks: 50,
    num_mcq: 20,
    num_short: 5,
    num_long: 4,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [papersRes, subjectsRes] = await Promise.all([
          api.get('/api/exams/papers/'),
          api.get('/api/subjects/'),
        ]);
        const allPapers = papersRes.data.results || papersRes.data;
        setPapers(allPapers);
        setSubjects(subjectsRes.data.results || subjectsRes.data);

        // Pre-select papers from query params
        const preSelected = searchParams.get('papers');
        if (preSelected) {
          const ids = preSelected.split(',').map(Number);
          setSelectedPapers(ids.filter((id) => allPapers.some((p) => p.id === id)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [searchParams]);

  const togglePaper = (paperId) => {
    setSelectedPapers((prev) =>
      prev.includes(paperId) ? prev.filter((id) => id !== paperId) : [...prev, paperId]
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const calcMarks = () => {
    return (parseInt(form.num_mcq) || 0) * 1
      + (parseInt(form.num_short) || 0) * 2
      + (parseInt(form.num_long) || 0) * 5;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPapers.length === 0) {
      setError('Select at least one paper.');
      return;
    }
    if (!form.instructions.trim()) {
      setError('Please provide instructions for paper creation.');
      return;
    }
    if (!form.subject) {
      setError('Please select a subject.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/api/exams/papers/create-from-papers/', {
        paper_ids: selectedPapers,
        instructions: form.instructions,
        subject: parseInt(form.subject),
        total_marks: parseInt(form.total_marks),
        num_mcq: parseInt(form.num_mcq),
        num_short: parseInt(form.num_short),
        num_long: parseInt(form.num_long),
      });
      setSuccess(`${res.data.questions_count} questions generated successfully! You can now create an exam using these questions.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate paper. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teacher/papers" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Create Paper from Old Papers</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-medium">{success}</p>
          <div className="flex gap-3 mt-3">
            <Link to="/teacher/create-exam" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Create Exam Now
            </Link>
            <Link to="/teacher/papers" className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
              Back to Papers
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Papers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 1: Select Old Question Papers</h2>
          <p className="text-sm text-gray-500 mb-4">Choose the papers you want the AI to reference when creating the new paper.</p>

          {papers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-2">No papers uploaded yet.</p>
              <Link to="/teacher/upload-paper" className="text-indigo-600 font-medium hover:underline">Upload papers first</Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {papers.map((paper) => (
                <label
                  key={paper.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedPapers.includes(paper.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPapers.includes(paper.id)}
                    onChange={() => togglePaper(paper.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{paper.title}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {paper.subject_name} | {paper.total_marks} marks
                    </span>
                  </div>
                  {paper.questions_generated && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Processed</span>
                  )}
                </label>
              ))}
            </div>
          )}
          {selectedPapers.length > 0 && (
            <p className="text-sm text-indigo-600 font-medium mt-3">{selectedPapers.length} paper(s) selected</p>
          )}
        </div>

        {/* Step 2: Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 2: Your Instructions</h2>
          <p className="text-sm text-gray-500 mb-4">Tell the AI what kind of paper to create. Be specific about topics, difficulty, focus areas, etc.</p>

          <textarea
            name="instructions"
            value={form.instructions}
            onChange={handleChange}
            rows={5}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
            placeholder="e.g., Create a paper focusing on Chapters 3 and 4 (Quadratic Equations and Arithmetic Progressions). Include more application-based questions. Make 60% questions medium difficulty. Include at least 2 HOTS questions in the long answer section."
          />
        </div>

        {/* Step 3: Paper Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 3: Paper Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">Set the subject and question distribution.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MCQs (1 mark each)</label>
                <input
                  type="number"
                  name="num_mcq"
                  value={form.num_mcq}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Ans (2 marks)</label>
                <input
                  type="number"
                  name="num_short"
                  value={form.num_short}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Long Ans (5 marks)</label>
                <input
                  type="number"
                  name="num_long"
                  value={form.num_long}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-sm font-medium text-indigo-800">
                Total: {(parseInt(form.num_mcq) || 0) + (parseInt(form.num_short) || 0) + (parseInt(form.num_long) || 0)} questions | {calcMarks()} marks
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={generating || selectedPapers.length === 0}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating Paper (this may take a minute)...
            </span>
          ) : (
            'Generate Paper with AI'
          )}
        </button>
      </form>
    </div>
  );
}
