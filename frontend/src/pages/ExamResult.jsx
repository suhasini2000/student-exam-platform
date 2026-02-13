import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function ExamResult() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const fetchResult = async () => {
    try {
      const res = await api.get(`/api/exams/${examId}/result/`);
      setExam(res.data);

      if (['NOT_STARTED', 'GRADING_MCQ', 'GRADING_DESCRIPTIVE', 'ANALYZING'].includes(res.data.grading_status)) {
        setPolling(true);
      } else {
        setPolling(false);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [examId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchResult, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading && !exam) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500">Loading results...</p>
      </div>
    );
  }

  if (!exam) return <div className="text-center py-12 text-gray-500">Exam not found</div>;

  const isGrading = ['NOT_STARTED', 'GRADING_MCQ', 'GRADING_DESCRIPTIVE', 'ANALYZING'].includes(exam.grading_status);

  // Chart data
  const typeBreakdown = exam.analysis?.question_type_breakdown || exam.analysis_data?.question_type_breakdown || {};
  const diffBreakdown = exam.analysis?.difficulty_breakdown || exam.analysis_data?.difficulty_breakdown || {};
  const analysis = exam.analysis || {};

  const typeChartData = Object.entries(typeBreakdown).map(([key, val]) => ({
    name: key === 'MCQ' ? 'MCQ' : key === 'SHORT' ? 'Short' : 'Long',
    obtained: val.marks_obtained,
    total: val.total_marks,
  }));

  const diffChartData = Object.entries(diffBreakdown).map(([key, val]) => ({
    name: key,
    percentage: val.percentage,
  }));

  const pieData = [
    { name: 'Correct', value: exam.correct_answers },
    { name: 'Wrong', value: exam.wrong_answers },
    { name: 'Unanswered', value: exam.unanswered },
  ].filter((d) => d.value > 0);

  const gradingLabel = {
    NOT_STARTED: 'Preparing...',
    GRADING_MCQ: 'Grading MCQs...',
    GRADING_DESCRIPTIVE: 'AI Grading Descriptive Answers...',
    ANALYZING: 'Generating Analysis...',
    COMPLETED: 'Complete',
    FAILED: 'Grading Failed',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Grading status banner */}
      {isGrading && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-indigo-700 font-medium">{gradingLabel[exam.grading_status]}</p>
          <p className="text-sm text-indigo-500 mt-1">This may take a minute for descriptive answers</p>
        </div>
      )}

      {/* Score Card */}
      <div className={`rounded-2xl p-8 text-white mb-8 ${
        exam.percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
        exam.percentage >= 60 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
        exam.percentage >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
        'bg-gradient-to-r from-red-500 to-red-700'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold">{exam.subject_name}</h1>
            <p className="opacity-90">{exam.exam_type_name} | {exam.chapter_name || 'Full Subject'}</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold">{Math.round(exam.percentage)}%</div>
            <p className="opacity-90 text-lg">{exam.score}/{exam.total_questions > 0 ? '50' : '0'} marks</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/30">
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.mcq_score}</p>
            <p className="text-sm opacity-80">MCQ (out of 20)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.short_answer_score}</p>
            <p className="text-sm opacity-80">Short (out of 10)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{exam.long_answer_score}</p>
            <p className="text-sm opacity-80">Long (out of 20)</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{exam.correct_answers}</p>
          <p className="text-sm text-gray-500">Correct</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-600">{exam.wrong_answers}</p>
          <p className="text-sm text-gray-500">Wrong</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-400">{exam.unanswered}</p>
          <p className="text-sm text-gray-500">Unanswered</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-indigo-600">{analysis.percentile || '-'}%</p>
          <p className="text-sm text-gray-500">Percentile</p>
        </div>
      </div>

      {/* Charts */}
      {!isGrading && (typeChartData.length > 0 || pieData.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Marks by question type */}
          {typeChartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Marks by Question Type</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="obtained" fill="#4f46e5" name="Obtained" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Answer distribution */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Answer Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={['#10b981', '#ef4444', '#9ca3af'][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Difficulty breakdown */}
      {diffChartData.length > 0 && !isGrading && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Performance by Difficulty</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={diffChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="percentage" fill="#8b5cf6" name="Score %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strengths, Weaknesses, Recommendations */}
      {!isGrading && (analysis.strengths?.length > 0 || analysis.weaknesses?.length > 0 || analysis.recommendations?.length > 0) && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {analysis.strengths?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <h3 className="font-semibold text-green-800 mb-3">Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.weaknesses?.length > 0 && (
            <div className="bg-red-50 rounded-xl p-6 border border-red-100">
              <h3 className="font-semibold text-red-800 mb-3">Areas to Improve</h3>
              <ul className="space-y-2">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">-</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.recommendations?.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-3">Suggestions</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">*</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Suggestions text */}
      {exam.suggestions && !isGrading && (
        <div className="bg-yellow-50 rounded-xl p-6 mb-8 border border-yellow-100">
          <h3 className="font-semibold text-yellow-800 mb-2">AI Suggestions</h3>
          <p className="text-sm text-yellow-700 whitespace-pre-line">{exam.suggestions}</p>
        </div>
      )}

      {/* Answer review toggle */}
      <div className="mb-8">
        <button onClick={() => setShowAnswers(!showAnswers)}
          className="bg-white px-6 py-3 rounded-xl shadow-sm font-medium text-gray-700 hover:bg-gray-50 transition border border-gray-200">
          {showAnswers ? 'Hide Answers' : 'Review Answers'}
        </button>
      </div>

      {/* Answer review */}
      {showAnswers && exam.answers && (
        <div className="space-y-4 mb-8">
          {exam.answers.map((ans, i) => (
            <div key={ans.id} className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${
              ans.is_correct ? 'border-green-500' : ans.marks_obtained > 0 ? 'border-yellow-500' : 'border-red-500'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    ans.question.question_type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                    ans.question.question_type === 'SHORT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {ans.question.question_type}
                  </span>
                </div>
                <span className={`font-bold ${ans.is_correct ? 'text-green-600' : ans.marks_obtained > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {ans.marks_obtained}/{ans.question.marks}
                </span>
              </div>

              <p className="font-medium text-gray-800 mb-3">Q{i + 1}. {ans.question.question_text}</p>

              {ans.question.question_type === 'MCQ' ? (
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
                        {isSelected && !isCorrect && ' (your answer)'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500">Your Answer:</span>
                    <p className="text-gray-800 mt-1">{ans.text_answer || 'No answer provided'}</p>
                  </div>
                  {ans.question.model_answer && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <span className="text-green-600">Model Answer:</span>
                      <p className="text-gray-800 mt-1">{ans.question.model_answer}</p>
                    </div>
                  )}
                  {ans.ai_feedback && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="text-blue-600">AI Feedback:</span>
                      <p className="text-gray-800 mt-1">{ans.ai_feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {ans.question.explanation && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium">Explanation:</span> {ans.question.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
          Back to Dashboard
        </Link>
        <Link to="/history" className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
          Exam History
        </Link>
      </div>
    </div>
  );
}
