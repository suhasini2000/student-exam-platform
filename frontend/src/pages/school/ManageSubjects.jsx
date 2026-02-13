import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [bgImages, setBgImages] = useState({});

  // Subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [submittingSubject, setSubmittingSubject] = useState(false);

  // Chapter form
  const [chapterForSubject, setChapterForSubject] = useState(null);
  const [chapterForm, setChapterForm] = useState({ name: '', code: '' });
  const [submittingChapter, setSubmittingChapter] = useState(false);

  const [expandedSubject, setExpandedSubject] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects/');
      setSubjects(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (subjectId) => {
    try {
      const res = await api.get('/api/chapters/', { params: { subject: subjectId } });
      setChapters((prev) => ({ ...prev, [subjectId]: res.data.results || res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    api.get('/api/site-images/').then(res => setBgImages(res.data)).catch(() => {});
    fetchSubjects();
  }, []);

  const toggleExpand = (subjectId) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
      if (!chapters[subjectId]) {
        fetchChapters(subjectId);
      }
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubmittingSubject(true);
    try {
      await api.post('/api/subjects/create/', subjectForm);
      showMsg('Subject created successfully!');
      setSubjectForm({ name: '', code: '' });
      setShowSubjectForm(false);
      fetchSubjects();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create subject.';
      showMsg(msg, 'error');
    } finally {
      setSubmittingSubject(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete this subject and all its chapters/questions?')) return;
    setDeleting(`subject-${id}`);
    try {
      await api.delete(`/api/subjects/${id}/`);
      showMsg('Subject deleted.');
      fetchSubjects();
    } catch {
      showMsg('Failed to delete subject.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateChapter = async (e) => {
    e.preventDefault();
    setSubmittingChapter(true);
    try {
      await api.post('/api/chapters/create/', { ...chapterForm, subject: chapterForSubject });
      showMsg('Chapter created successfully!');
      setChapterForm({ name: '', code: '' });
      setChapterForSubject(null);
      fetchChapters(chapterForSubject);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create chapter.';
      showMsg(msg, 'error');
    } finally {
      setSubmittingChapter(false);
    }
  };

  const handleDeleteChapter = async (subjectId, chapterId) => {
    if (!window.confirm('Delete this chapter?')) return;
    setDeleting(`chapter-${chapterId}`);
    try {
      await api.delete(`/api/chapters/${chapterId}/`);
      showMsg('Chapter deleted.');
      fetchChapters(subjectId);
    } catch {
      showMsg('Failed to delete chapter.', 'error');
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
      {/* Header with Background Image */}
      <div
        className="rounded-2xl p-8 md:p-10 text-white mb-8 bg-cover bg-center relative overflow-hidden"
        style={bgImages.manage_subjects?.url ? { backgroundImage: `url(${bgImages.manage_subjects.url})` } : {}}
      >
        <div className={`absolute inset-0 ${bgImages.manage_subjects?.url ? 'bg-black/50' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">Manage Subjects & Chapters</h1>
          <p className="mt-2 text-white/80">Create subjects and organize chapters for your school curriculum.</p>
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
        <h2 className="text-xl font-bold text-gray-800">Subjects ({subjects.length})</h2>
        <button
          onClick={() => setShowSubjectForm(!showSubjectForm)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          {showSubjectForm ? (
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
              Add Subject
            </>
          )}
        </button>
      </div>

      {/* Create Subject Form */}
      {showSubjectForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Create New Subject</h3>
          <form onSubmit={handleCreateSubject} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. MATH"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submittingSubject}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              >
                {submittingSubject ? 'Creating...' : 'Create Subject'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSubjectForm(false); setSubjectForm({ name: '', code: '' }); }}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-500 mb-2">No subjects created yet.</p>
          <button onClick={() => setShowSubjectForm(true)} className="text-indigo-600 font-medium hover:underline">
            Create your first subject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Subject Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleExpand(subject.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{subject.code}</span>
                      <span className="text-xs text-gray-400">{subject.chapter_count || 0} chapters</span>
                      <span className="text-xs text-gray-400">{subject.question_count || 0} questions</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                    disabled={deleting === `subject-${subject.id}`}
                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {deleting === `subject-${subject.id}` ? 'Deleting...' : 'Delete'}
                  </button>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSubject === subject.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Chapters (expanded) */}
              {expandedSubject === subject.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Chapters</h4>
                    <button
                      onClick={() => setChapterForSubject(chapterForSubject === subject.id ? null : subject.id)}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                    >
                      {chapterForSubject === subject.id ? 'Cancel' : '+ Add Chapter'}
                    </button>
                  </div>

                  {/* Add Chapter Form */}
                  {chapterForSubject === subject.id && (
                    <form onSubmit={handleCreateChapter} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={chapterForm.name}
                          onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                          required
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                          placeholder="Chapter name"
                        />
                        <input
                          value={chapterForm.code}
                          onChange={(e) => setChapterForm({ ...chapterForm, code: e.target.value.toUpperCase() })}
                          required
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                          placeholder="Code (e.g. CH01)"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingChapter}
                        className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                      >
                        {submittingChapter ? 'Creating...' : 'Create Chapter'}
                      </button>
                    </form>
                  )}

                  {/* Chapters List */}
                  {!chapters[subject.id] ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : chapters[subject.id].length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No chapters yet. Add one above.</p>
                  ) : (
                    <div className="space-y-2">
                      {chapters[subject.id].map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-200">
                          <div>
                            <span className="text-sm font-medium text-gray-700">{ch.name}</span>
                            <span className="text-xs text-gray-400 ml-2">({ch.code})</span>
                            <span className="text-xs text-gray-400 ml-2">{ch.question_count || 0} questions</span>
                          </div>
                          <button
                            onClick={() => handleDeleteChapter(subject.id, ch.id)}
                            disabled={deleting === `chapter-${ch.id}`}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            {deleting === `chapter-${ch.id}` ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
