import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

export default function GeneratePaper() {
  const [searchParams] = useSearchParams();
  // 'old_papers' or 'instructions'
  const [method, setMethod] = useState(null);

  // Shared state
  const [assignments, setAssignments] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  // Option 1 state (From Old Papers)
  const [paperFiles, setPaperFiles] = useState([]);
  const [existingPapers, setExistingPapers] = useState([]);
  const [selectedExistingPaperIds, setSelectedExistingPaperIds] = useState([]);
  const [paperForm, setPaperForm] = useState({
    subject: '',
    instructions: '',
    total_marks: 50,
    num_mcq: 20,
    num_short: 5,
    num_long: 4,
  });

  // Option 2 state (From Instructions)
  const [instructionForm, setInstructionForm] = useState({
    subject: '',
    chapter_ids: [],
    topics: '',
    total_marks: 50,
    num_mcq: 20,
    num_short: 5,
    num_long: 4,
  });

  // Fetch subjects - from assignments for teachers, from subjects API for school admins
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const profileRes = await api.get('/api/auth/profile/');
        const role = profileRes.data.role;
        if (role === 'school') {
          const res = await api.get('/api/subjects/');
          const subs = res.data.results || res.data;
          setAssignments(subs.map(s => ({ subject: s.id, subject_name: s.name })));
        } else {
          const res = await api.get('/api/assignments/my/');
          setAssignments(res.data.results || res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // Pre-select papers from query params (e.g. ?papers=1,2,3)
  useEffect(() => {
    const preSelected = searchParams.get('papers');
    if (preSelected) {
      const ids = preSelected.split(',').map(Number).filter(Boolean);
      if (ids.length > 0) {
        setMethod('old_papers');
        setSelectedExistingPaperIds(ids);
      }
    }
  }, [searchParams]);

  // Derive subjects from assignments
  const subjects = assignments.map((a) => ({
    id: a.subject,
    name: a.subject_name,
  }));

  // Fetch existing uploaded papers when subject changes (for Option 1)
  useEffect(() => {
    if (!paperForm.subject) {
      setExistingPapers([]);
      setSelectedExistingPaperIds([]);
      return;
    }
    api.get('/api/exams/papers/').then((res) => {
      const papers = (res.data.results || res.data).filter(
        (p) => String(p.subject) === String(paperForm.subject)
      );
      setExistingPapers(papers);
      setSelectedExistingPaperIds([]);
    }).catch(() => {});
  }, [paperForm.subject]);

  // Fetch chapters when subject changes (for Option 2)
  useEffect(() => {
    if (!instructionForm.subject) {
      setChapters([]);
      setInstructionForm((prev) => ({ ...prev, chapter_ids: [] }));
      return;
    }
    const fetchChapters = async () => {
      try {
        const res = await api.get('/api/chapters/', { params: { subject: instructionForm.subject } });
        setChapters(res.data.results || res.data);
        setInstructionForm((prev) => ({ ...prev, chapter_ids: [] }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchChapters();
  }, [instructionForm.subject]);

  // Paper form handlers
  const handlePaperChange = (e) => {
    const { name, value } = e.target;
    setPaperForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + paperFiles.length > 5) {
      setError('You can upload a maximum of 5 papers.');
      return;
    }
    setPaperFiles((prev) => [...prev, ...files].slice(0, 5));
    setError('');
  };

  const removeFile = (index) => {
    setPaperFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleExistingPaper = (paperId) => {
    setSelectedExistingPaperIds((prev) =>
      prev.includes(paperId) ? prev.filter((id) => id !== paperId) : [...prev, paperId]
    );
  };

  // Instruction form handlers
  const handleInstructionChange = (e) => {
    const { name, value } = e.target;
    setInstructionForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleChapter = (chapterId) => {
    setInstructionForm((prev) => {
      const ids = prev.chapter_ids.includes(chapterId)
        ? prev.chapter_ids.filter((id) => id !== chapterId)
        : [...prev.chapter_ids, chapterId];
      return { ...prev, chapter_ids: ids };
    });
  };

  // Marks calculators
  const calcPaperMarks = () => {
    return (parseInt(paperForm.num_mcq) || 0) * 1
      + (parseInt(paperForm.num_short) || 0) * 2
      + (parseInt(paperForm.num_long) || 0) * 5;
  };

  const calcInstructionMarks = () => {
    return (parseInt(instructionForm.num_mcq) || 0) * 1
      + (parseInt(instructionForm.num_short) || 0) * 2
      + (parseInt(instructionForm.num_long) || 0) * 5;
  };

  // Submit Option 1: From Old Papers
  const handlePaperSubmit = async (e) => {
    e.preventDefault();
    if (paperFiles.length === 0 && selectedExistingPaperIds.length === 0) {
      setError('Please select existing papers or upload new ones.');
      return;
    }
    if (!paperForm.subject) {
      setError('Please select a subject.');
      return;
    }
    if (!paperForm.instructions.trim()) {
      setError('Please provide instructions for paper generation.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress('');

    try {
      // Start with already-selected existing paper IDs
      const paperIds = [...selectedExistingPaperIds];

      // Upload any new paper files
      for (let i = 0; i < paperFiles.length; i++) {
        setUploadProgress(`Uploading paper ${i + 1} of ${paperFiles.length}...`);
        const formData = new FormData();
        formData.append('title', paperFiles[i].name.replace('.pdf', ''));
        formData.append('subject', paperForm.subject);
        formData.append('total_marks', paperForm.total_marks);
        formData.append('file', paperFiles[i]);

        const res = await api.post('/api/exams/papers/upload/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        paperIds.push(res.data.id);
      }

      // Generate paper from all selected papers (runs in background)
      setUploadProgress('Starting AI question generation...');
      await api.post('/api/exams/papers/create-from-papers/', {
        paper_ids: paperIds,
        instructions: paperForm.instructions,
        subject: parseInt(paperForm.subject),
        total_marks: parseInt(paperForm.total_marks),
        num_mcq: parseInt(paperForm.num_mcq),
        num_short: parseInt(paperForm.num_short),
        num_long: parseInt(paperForm.num_long),
      });

      setSuccess('Question generation started! The AI is working on your questions in the background. Please check the "Uploaded Papers" list in a few moments to see the results.');
      setPaperFiles([]);
      setSelectedExistingPaperIds([]);
      setPaperForm({ subject: '', instructions: '', total_marks: 50, num_mcq: 20, num_short: 5, num_long: 4 });
      const fileInput = document.getElementById('paper-files-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // Submit Option 2: From Instructions
  const handleInstructionSubmit = async (e) => {
    e.preventDefault();
    if (!instructionForm.subject) {
      setError('Please select a subject.');
      return;
    }
    if (instructionForm.chapter_ids.length === 0) {
      setError('Please select at least one chapter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/api/exams/generate-from-instructions/', {
        subject: parseInt(instructionForm.subject),
        chapter_ids: instructionForm.chapter_ids,
        topics: instructionForm.topics,
        total_marks: parseInt(instructionForm.total_marks),
        num_mcq: parseInt(instructionForm.num_mcq),
        num_short: parseInt(instructionForm.num_short),
        num_long: parseInt(instructionForm.num_long),
      });

      setSuccess('Question generation started! The AI is working on your questions in the background. Please check the "Uploaded Papers" list in a few moments to see the results.');
      setInstructionForm({ subject: '', chapter_ids: [], topics: '', total_marks: 50, num_mcq: 20, num_short: 5, num_long: 4 });
      setChapters([]);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teacher/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Generate Questions</h1>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 relative">
          <button 
            onClick={() => setSuccess('')}
            className="absolute top-4 right-4 text-green-500 hover:text-green-700 transition"
            title="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-800">Generation Successful!</h3>
              <p className="text-green-700 mt-1">{success}</p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link to="/teacher/create-exam" className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium">
                  Create Exam Now
                </Link>
                <Link to="/teacher/papers" className="text-sm bg-white text-green-700 border border-green-200 px-5 py-2 rounded-lg hover:bg-green-100 transition font-medium">
                  View Questions Bank
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Method Selection Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Option 1: From Old Papers */}
        <button
          type="button"
          onClick={() => { setMethod('old_papers'); setError(''); setSuccess(''); }}
          className={`text-left p-6 rounded-xl border-2 transition-all ${
            method === 'old_papers'
              ? 'border-indigo-600 bg-indigo-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              method === 'old_papers' ? 'bg-indigo-600' : 'bg-indigo-100'
            }`}>
              <svg className={`w-6 h-6 ${method === 'old_papers' ? 'text-white' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">From Old Papers</h3>
              <p className="text-sm text-gray-500">Upload previous papers, AI generates new one</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Upload up to 5 old question papers (PDF). The AI will analyze them and generate new questions with similar style and difficulty.
          </p>
          {method === 'old_papers' && (
            <div className="mt-3 flex items-center gap-1 text-indigo-600 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Selected
            </div>
          )}
        </button>

        {/* Option 2: From Instructions */}
        <button
          type="button"
          onClick={() => { setMethod('instructions'); setError(''); setSuccess(''); }}
          className={`text-left p-6 rounded-xl border-2 transition-all ${
            method === 'instructions'
              ? 'border-purple-600 bg-purple-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              method === 'instructions' ? 'bg-purple-600' : 'bg-purple-100'
            }`}>
              <svg className={`w-6 h-6 ${method === 'instructions' ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">From Instructions</h3>
              <p className="text-sm text-gray-500">Specify chapters, topics, and marks</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Choose specific chapters and topics, set question distribution, and the AI will generate questions based on your instructions.
          </p>
          {method === 'instructions' && (
            <div className="mt-3 flex items-center gap-1 text-purple-600 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Selected
            </div>
          )}
        </button>
      </div>

      {/* Option 1 Form: From Old Papers */}
      {method === 'old_papers' && (
        <form onSubmit={handlePaperSubmit} className="space-y-6">
          {/* Subject */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 1: Select Subject</h2>
            <p className="text-sm text-gray-500 mb-4">Choose the subject for the question paper.</p>
            <select
              name="subject"
              value={paperForm.subject}
              onChange={handlePaperChange}
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

          {/* Select Papers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 2: Select Papers</h2>
            <p className="text-sm text-gray-500 mb-4">Choose from previously uploaded papers or upload new ones.</p>

            {/* Previously uploaded papers */}
            {paperForm.subject && existingPapers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Previously Uploaded Papers</p>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {existingPapers.map((paper) => (
                    <label
                      key={paper.id}
                      className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg transition ${
                        selectedExistingPaperIds.includes(paper.id)
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExistingPaperIds.includes(paper.id)}
                        onChange={() => toggleExistingPaper(paper.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 block truncate">{paper.title}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(paper.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedExistingPaperIds.length > 0 && (
                  <p className="text-sm text-indigo-600 font-medium mt-2">{selectedExistingPaperIds.length} paper(s) selected</p>
                )}
              </div>
            )}

            {paperForm.subject && existingPapers.length === 0 && (
              <p className="text-sm text-gray-400 mb-4">No previously uploaded papers for this subject.</p>
            )}

            {/* Upload new papers */}
            <p className="text-sm font-medium text-gray-700 mb-2">
              {existingPapers.length > 0 ? 'Or Upload New Papers' : 'Upload Papers'}
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition">
              <svg className="mx-auto w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400">PDF files only, up to 5 files</p>
              <input
                type="file"
                id="paper-files-input"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ position: 'relative' }}
              />
            </div>

            {/* Newly selected files list */}
            {paperFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">{paperFiles.length} new file(s) selected:</p>
                {paperFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 3: Instructions</h2>
            <p className="text-sm text-gray-500 mb-4">Tell the AI what kind of paper to create. Be specific about topics, difficulty, focus areas, etc.</p>
            <textarea
              name="instructions"
              value={paperForm.instructions}
              onChange={handlePaperChange}
              rows={4}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
              placeholder="e.g., Create a paper focusing on Chapters 3 and 4. Include more application-based questions. Make 60% medium difficulty. Include at least 2 HOTS questions."
            />
          </div>

          {/* Marks Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 4: Question Distribution</h2>
            <p className="text-sm text-gray-500 mb-4">Set how many questions of each type to generate.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MCQs (1 mark each)</label>
                  <input
                    type="number"
                    name="num_mcq"
                    value={paperForm.num_mcq}
                    onChange={handlePaperChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Ans (2 marks)</label>
                  <input
                    type="number"
                    name="num_short"
                    value={paperForm.num_short}
                    onChange={handlePaperChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Ans (5 marks)</label>
                  <input
                    type="number"
                    name="num_long"
                    value={paperForm.num_long}
                    onChange={handlePaperChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  name="total_marks"
                  value={paperForm.total_marks}
                  onChange={handlePaperChange}
                  min="1"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-sm font-medium text-indigo-800">
                  Total: {(parseInt(paperForm.num_mcq) || 0) + (parseInt(paperForm.num_short) || 0) + (parseInt(paperForm.num_long) || 0)} questions | {calcPaperMarks()} marks (from distribution)
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-700 font-medium">{uploadProgress}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (paperFiles.length === 0 && selectedExistingPaperIds.length === 0)}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating Paper...
              </span>
            ) : (
              'Upload & Generate Questions'
            )}
          </button>
        </form>
      )}

      {/* Option 2 Form: From Instructions */}
      {method === 'instructions' && (
        <form onSubmit={handleInstructionSubmit} className="space-y-6">
          {/* Subject */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 1: Select Subject</h2>
            <p className="text-sm text-gray-500 mb-4">Choose the subject for the question paper.</p>
            <select
              name="subject"
              value={instructionForm.subject}
              onChange={handleInstructionChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
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

          {/* Chapters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 2: Select Chapters</h2>
            <p className="text-sm text-gray-500 mb-4">Choose one or more chapters to include in the paper.</p>

            {!instructionForm.subject ? (
              <p className="text-sm text-gray-400">Select a subject first</p>
            ) : chapters.length === 0 ? (
              <p className="text-sm text-gray-400">No chapters found for this subject</p>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
                {chapters.map((ch) => (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition ${
                      instructionForm.chapter_ids.includes(ch.id)
                        ? 'bg-purple-50 border border-purple-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={instructionForm.chapter_ids.includes(ch.id)}
                      onChange={() => toggleChapter(ch.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{ch.name}</span>
                  </label>
                ))}
              </div>
            )}
            {instructionForm.chapter_ids.length > 0 && (
              <p className="text-sm text-purple-600 font-medium mt-3">{instructionForm.chapter_ids.length} chapter(s) selected</p>
            )}
          </div>

          {/* Topics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 3: Topics & Focus Areas</h2>
            <p className="text-sm text-gray-500 mb-4">Describe the specific topics, difficulty level, or any special focus areas you want.</p>
            <textarea
              name="topics"
              value={instructionForm.topics}
              onChange={handleInstructionChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition resize-none"
              placeholder="e.g., Focus on quadratic equations, arithmetic progressions. Include application-based problems. Mix easy and medium difficulty. Add 2-3 HOTS questions."
            />
          </div>

          {/* Marks Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 4: Question Distribution</h2>
            <p className="text-sm text-gray-500 mb-4">Set how many questions of each type to generate.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MCQs (1 mark each)</label>
                  <input
                    type="number"
                    name="num_mcq"
                    value={instructionForm.num_mcq}
                    onChange={handleInstructionChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Ans (2 marks)</label>
                  <input
                    type="number"
                    name="num_short"
                    value={instructionForm.num_short}
                    onChange={handleInstructionChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Ans (5 marks)</label>
                  <input
                    type="number"
                    name="num_long"
                    value={instructionForm.num_long}
                    onChange={handleInstructionChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  name="total_marks"
                  value={instructionForm.total_marks}
                  onChange={handleInstructionChange}
                  min="1"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                />
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-sm font-medium text-purple-800">
                  Total: {(parseInt(instructionForm.num_mcq) || 0) + (parseInt(instructionForm.num_short) || 0) + (parseInt(instructionForm.num_long) || 0)} questions | {calcInstructionMarks()} marks (from distribution)
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || instructionForm.chapter_ids.length === 0}
            className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating Paper (this may take a minute)...
              </span>
            ) : (
              'Generate Questions with AI'
            )}
          </button>
        </form>
      )}

      {/* Prompt to select a method */}
      {!method && (
        <div className="text-center py-12">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7l4-4m0 0l4 4m-4-4v18" />
          </svg>
          <p className="text-gray-500 text-lg">Choose a method above to get started</p>
          <p className="text-gray-400 text-sm mt-1">Select how you want to generate the question paper</p>
        </div>
      )}
    </div>
  );
}
