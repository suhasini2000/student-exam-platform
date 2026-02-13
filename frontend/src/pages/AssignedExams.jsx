import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AssignedExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/exams/assigned/my/').then((res) => {
      setExams(res.data.results || res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const startAssignedExam = async (assignedExam) => {
    if (assignedExam.my_attempt?.status === 'COMPLETED') {
      navigate(`/result/${assignedExam.my_attempt.exam_id}`);
      return;
    }
    if (assignedExam.my_attempt?.status === 'IN_PROGRESS') {
      navigate(`/exam/${assignedExam.my_attempt.exam_id}`);
      return;
    }

    setGenerating(assignedExam.id);
    try {
      const data = { subject_id: assignedExam.subject };
      const res = await api.post('/api/exams/generate/', data);
      sessionStorage.setItem(`exam_${res.data.exam_id}`, JSON.stringify(res.data));
      navigate(`/exam/${res.data.exam_id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start exam');
      setGenerating(null);
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
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Assigned Exams</h1>

      {exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-500">No exams assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const attempt = exam.my_attempt;
            const isCompleted = attempt?.status === 'COMPLETED';
            const isInProgress = attempt?.status === 'IN_PROGRESS';
            const now = new Date();
            const startTime = exam.start_time ? new Date(exam.start_time) : null;
            const endTime = exam.end_time ? new Date(exam.end_time) : null;
            const notStartedYet = startTime && now < startTime;
            const expired = endTime && now > endTime && !attempt;

            return (
              <div key={exam.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {exam.subject_name} | {exam.total_marks} marks | {exam.duration_minutes} min
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      By {exam.teacher_name}
                      {startTime && ` | Starts: ${startTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                      {endTime && ` | Ends: ${endTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCompleted && (
                      <>
                        <div className={`text-lg font-bold ${attempt.percentage >= 60 ? 'text-green-600' : attempt.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Math.round(attempt.percentage)}%
                        </div>
                        <button
                          onClick={() => navigate(`/result/${attempt.exam_id}`)}
                          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition"
                        >
                          View Result
                        </button>
                      </>
                    )}
                    {isInProgress && (
                      <button
                        onClick={() => startAssignedExam(exam)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition"
                      >
                        Continue Exam
                      </button>
                    )}
                    {!attempt && !expired && !notStartedYet && (
                      <button
                        onClick={() => startAssignedExam(exam)}
                        disabled={generating === exam.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {generating === exam.id ? 'Starting...' : 'Start Exam'}
                      </button>
                    )}
                    {notStartedYet && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm">Not started yet</span>
                    )}
                    {expired && (
                      <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm">Expired</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
