import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useTimer } from '../hooks/useTimer';

export default function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load exam data from sessionStorage (set during generation)
    const stored = sessionStorage.getItem(`exam_${examId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setExamData(data);
      setLoading(false);
    } else {
      // If no stored data, redirect to dashboard
      navigate('/dashboard');
    }
  }, [examId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Save all answers first
      for (const [qId, answer] of Object.entries(answers)) {
        await api.post(`/api/exams/${examId}/answer/`, {
          question_id: parseInt(qId),
          selected_answer: answer.selected || '',
          text_answer: answer.text || '',
          time_taken_seconds: answer.time || 0,
        });
      }
      await api.post(`/api/exams/${examId}/submit/`);
      sessionStorage.removeItem(`exam_${examId}`);
      navigate(`/result/${examId}`);
    } catch {
      alert('Failed to submit exam. Please try again.');
      setSubmitting(false);
    }
  }, [examId, answers, navigate, submitting]);

  const { timeLeft, formatTime } = useTimer(
    examData?.total_time_seconds || 3600,
    handleSubmit
  );

  if (loading || !examData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const questions = examData.questions;
  const question = questions[currentIndex];
  const answer = answers[question.id] || {};

  const updateAnswer = (field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...prev[question.id], [field]: value },
    }));
  };

  const isAnswered = (qId) => {
    const a = answers[qId];
    return a && (a.selected || a.text?.trim());
  };

  // MCQ, SHORT, LONG counts
  const mcqQuestions = questions.filter((q) => q.question_type === 'MCQ');
  const shortQuestions = questions.filter((q) => q.question_type === 'SHORT');
  const longQuestions = questions.filter((q) => q.question_type === 'LONG');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer bar */}
      <div className={`sticky top-0 z-50 px-4 py-3 flex justify-between items-center shadow-sm ${timeLeft < 300 ? 'bg-red-600 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-sm">
          <span className="font-medium">{examData.subject}</span>
          <span className="text-gray-400 mx-2">|</span>
          <span>Q {currentIndex + 1}/{questions.length}</span>
        </div>
        <div className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'animate-pulse' : ''}`}>
          {formatTime()}
        </div>
        <button onClick={() => { if (confirm('Are you sure you want to submit?')) handleSubmit(); }}
          disabled={submitting}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition min-h-[44px] ${timeLeft < 300 ? 'bg-white text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Question Navigator - Desktop sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-600 mb-3">Questions</h3>

            {mcqQuestions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">MCQ (1 mark each)</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, i) => q.question_type === 'MCQ' && (
                    <button key={q.id} onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition ${
                        i === currentIndex ? 'bg-indigo-600 text-white' :
                        isAnswered(q.id) ? 'bg-green-100 text-green-700 border border-green-300' :
                        'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {shortQuestions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Short Answer (2 marks each)</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, i) => q.question_type === 'SHORT' && (
                    <button key={q.id} onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition ${
                        i === currentIndex ? 'bg-indigo-600 text-white' :
                        isAnswered(q.id) ? 'bg-green-100 text-green-700 border border-green-300' :
                        'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {longQuestions.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Long Answer (5 marks each)</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, i) => q.question_type === 'LONG' && (
                    <button key={q.id} onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition ${
                        i === currentIndex ? 'bg-indigo-600 text-white' :
                        isAnswered(q.id) ? 'bg-green-100 text-green-700 border border-green-300' :
                        'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t text-xs text-gray-500">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-100 rounded"></span> Unanswered
              </div>
            </div>
          </div>
        </div>

        {/* Mobile question strip */}
        <div className="lg:hidden overflow-x-auto pb-2">
          <div className="flex gap-1.5 min-w-max">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIndex(i)}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                  i === currentIndex ? 'bg-indigo-600 text-white' :
                  isAnswered(q.id) ? 'bg-green-100 text-green-700 border border-green-300' :
                  'bg-white text-gray-600 border border-gray-200'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
            {/* Question header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  question.question_type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                  question.question_type === 'SHORT' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {question.question_type === 'MCQ' ? 'MCQ' : question.question_type === 'SHORT' ? 'Short Answer' : 'Long Answer'}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  {question.marks} mark{question.marks > 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {question.difficulty}
              </span>
            </div>

            {/* Question text */}
            <h2 className="text-lg font-medium text-gray-800 mb-6 leading-relaxed">
              Q{currentIndex + 1}. {question.question_text}
            </h2>

            {/* Answer area */}
            {question.question_type === 'MCQ' ? (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const optionText = question[`option_${opt.toLowerCase()}`];
                  if (!optionText) return null;
                  const isSelected = answer.selected === opt;
                  return (
                    <button key={opt} onClick={() => updateAnswer('selected', opt)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition min-h-[44px] ${
                        isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mr-3 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {opt}
                      </span>
                      <span className="text-gray-800">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <textarea
                  value={answer.text || ''}
                  onChange={(e) => updateAnswer('text', e.target.value)}
                  placeholder={question.question_type === 'SHORT'
                    ? 'Write your answer in 2-3 sentences...'
                    : 'Write a detailed answer with explanation, examples, and diagrams if needed...'}
                  className="w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none resize-y text-gray-800"
                  rows={question.question_type === 'LONG' ? 10 : 5}
                />
                <p className="text-xs text-gray-400 mt-2">
                  {(answer.text || '').length} characters
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-6 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition disabled:opacity-50 min-h-[44px]">
                Previous
              </button>
              {currentIndex === questions.length - 1 ? (
                <button onClick={() => { if (confirm('Submit exam?')) handleSubmit(); }}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50 min-h-[44px]">
                  {submitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition min-h-[44px]">
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
