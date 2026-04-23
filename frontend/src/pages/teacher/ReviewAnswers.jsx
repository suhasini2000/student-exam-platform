import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import Avatar from '../../components/Common/Avatar';

export default function ReviewAnswers() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewData, setReviewData] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await api.get(`/api/exams/review/${examId}/`);
        setExam(res.data);
        // Initialize review data from existing teacher scores
        const initial = {};
        (res.data.answers || []).forEach((ans) => {
          if (ans.teacher_score !== null || ans.teacher_feedback) {
            initial[ans.id] = {
              teacher_score: ans.teacher_score ?? '',
              teacher_feedback: ans.teacher_feedback ?? '',
            };
          }
        });
        setReviewData(initial);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load review data');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [examId]);

  const handleReviewChange = (answerId, field, value) => {
    setReviewData((prev) => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value,
      },
    }));
    // Clear saved indicator when user edits
    setSaved((prev) => ({ ...prev, [answerId]: false }));
  };

  const handleSave = async (answerId) => {
    const data = reviewData[answerId];
    if (!data) return;

    setSaving((prev) => ({ ...prev, [answerId]: true }));
    try {
      await api.patch(`/api/exams/review/${examId}/`, {
        answer_id: answerId,
        teacher_score: parseFloat(data.teacher_score) || 0,
        teacher_feedback: data.teacher_feedback || '',
      });
      setSaved((prev) => ({ ...prev, [answerId]: true }));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save review');
    } finally {
      setSaving((prev) => ({ ...prev, [answerId]: false }));
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/api/exams/${examId}/analyze/`);
      setAnalysisDone(true);
      // Refetch to get updated analysis
      const res = await api.get(`/api/exams/review/${examId}/`);
      setExam(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500">Loading review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Link to="/teacher/created-exams" className="text-indigo-600 font-medium hover:underline mt-2 inline-block">
            Back to Created Exams
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) return <div className="text-center py-12 text-gray-500">Exam not found</div>;

  const answers = exam.answers || [];
  const descriptiveAnswers = answers.filter(
    (ans) => ans.question?.question_type === 'SHORT' || ans.question?.question_type === 'LONG'
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={exam.assigned_exam_id ? `/teacher/exam/${exam.assigned_exam_id}/submissions` : '/teacher/created-exams'}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar src={exam.profile_photo} name={exam.student_name || exam.student_username} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{exam.title || 'Review Answers'}</h1>
            <p className="text-sm text-gray-500">
              Student: {exam.student_name || exam.student_username} | {exam.subject_name || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-600 rounded-2xl p-6 text-white mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.score ?? '-'}</p>
            <p className="text-sm text-indigo-100">Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.total_marks ?? '-'}</p>
            <p className="text-sm text-indigo-100">Total Marks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.percentage != null ? `${Math.round(exam.percentage)}%` : '-'}</p>
            <p className="text-sm text-indigo-100">Percentage</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{answers.length}</p>
            <p className="text-sm text-indigo-100">Total Answers</p>
          </div>
        </div>
      </div>

      {/* Analysis Section */}
      {exam.analysis ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Analysis</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {exam.analysis.strengths?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h3 className="text-sm font-semibold text-green-700 mb-2">Strengths</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  {exam.analysis.strengths.map((s, i) => <li key={i}>- {s}</li>)}
                </ul>
              </div>
            )}
            {exam.analysis.weaknesses?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Weaknesses</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  {exam.analysis.weaknesses.map((w, i) => <li key={i}>- {w}</li>)}
                </ul>
              </div>
            )}
            {exam.analysis.recommendations?.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {exam.analysis.recommendations.map((r, i) => <li key={i}>- {r}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : analysisDone ? (
              'Analysis Generated'
            ) : (
              'Run Analysis'
            )}
          </button>
          <span className="text-sm text-gray-500">Generate strengths, weaknesses, and recommendations</span>
        </div>
      )}

      {/* All Answers */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">All Answers</h2>
        {answers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500">No answers submitted yet.</p>
          </div>
        ) : (
          answers.map((ans, i) => {
            const isDescriptive = ans.question?.question_type === 'SHORT' || ans.question?.question_type === 'LONG';
            const review = reviewData[ans.id] || { teacher_score: '', teacher_feedback: '' };

            return (
              <div key={ans.id} className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${
                ans.is_correct ? 'border-green-500' :
                (ans.marks_obtained > 0 || ans.ai_score > 0) ? 'border-yellow-500' : 'border-red-500'
              }`}>
                {/* Question header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      ans.question?.question_type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                      ans.question?.question_type === 'SHORT' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {ans.question?.question_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {ans.question?.marks} mark{ans.question?.marks !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`font-bold text-sm ${
                    ans.is_correct ? 'text-green-600' :
                    (ans.marks_obtained > 0 || ans.ai_score > 0) ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {ans.marks_obtained ?? ans.ai_score ?? 0}/{ans.question?.marks}
                  </span>
                </div>

                {/* Question text */}
                <p className="font-medium text-gray-800 mb-3">Q{i + 1}. {ans.question?.question_text}</p>

                {/* MCQ options */}
                {ans.question?.question_type === 'MCQ' ? (
                  <div className="space-y-1.5 text-sm">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const text = ans.question[`option_${opt.toLowerCase()}`];
                      if (!text) return null;
                      const isCorrect = opt === ans.question.correct_answer;
                      const isSelected = opt === ans.selected_answer;
                      return (
                        <div key={opt} className={`px-3 py-2 rounded-lg ${
                          isCorrect ? 'bg-green-50 text-green-800 font-medium' :
                          isSelected && !isCorrect ? 'bg-red-50 text-red-800' : 'text-gray-600'
                        }`}>
                          {opt}. {text}
                          {isCorrect && ' (correct)'}
                          {isSelected && !isCorrect && ' (student answer)'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm space-y-2">
                    {/* Student answer */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-500 font-medium">Student Answer:</span>
                      <p className="text-gray-800 mt-1">{ans.text_answer || 'No answer provided'}</p>
                    </div>

                    {/* Model answer */}
                    {ans.question?.model_answer && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <span className="text-green-600 font-medium">Model Answer:</span>
                        <p className="text-gray-800 mt-1">{ans.question.model_answer}</p>
                      </div>
                    )}

                    {/* AI feedback */}
                    {(ans.ai_feedback || ans.ai_score != null) && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <span className="text-blue-600 font-medium">AI Score: {ans.ai_score ?? '-'}/{ans.question?.marks}</span>
                        {ans.ai_feedback && (
                          <p className="text-gray-800 mt-1">{ans.ai_feedback}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher review section for descriptive answers */}
                {isDescriptive && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Teacher Review</h4>
                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Score (out of {ans.question?.marks})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={ans.question?.marks}
                          step="0.5"
                          value={review.teacher_score}
                          onChange={(e) => handleReviewChange(ans.id, 'teacher_score', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                          placeholder="0"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Feedback</label>
                        <input
                          type="text"
                          value={review.teacher_feedback}
                          onChange={(e) => handleReviewChange(ans.id, 'teacher_feedback', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                          placeholder="Optional feedback..."
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleSave(ans.id)}
                          disabled={saving[ans.id]}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition min-h-[38px] ${
                            saved[ans.id]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          } disabled:opacity-50`}
                        >
                          {saving[ans.id] ? (
                            <span className="flex items-center justify-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            </span>
                          ) : saved[ans.id] ? (
                            'Saved'
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Show existing teacher review if present and not being edited */}
                    {ans.teacher_score != null && !reviewData[ans.id] && (
                      <div className="mt-2 bg-indigo-50 p-3 rounded-lg text-sm">
                        <span className="text-indigo-600 font-medium">
                          Your Score: {ans.teacher_score}/{ans.question?.marks}
                        </span>
                        {ans.teacher_feedback && (
                          <p className="text-gray-700 mt-1">{ans.teacher_feedback}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {ans.question?.explanation && (
                  <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium">Explanation:</span> {ans.question.explanation}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          to={exam.assigned_exam_id ? `/teacher/exam/${exam.assigned_exam_id}/submissions` : '/teacher/created-exams'}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
        >
          ← Back to Submissions
        </Link>
        <Link to="/teacher/dashboard" className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
