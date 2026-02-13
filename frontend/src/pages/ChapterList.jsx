import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ChapterList() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/api/chapters/', { params: { subject: subjectId } }).then((res) => {
      setChapters(res.data.results || res.data);
      setLoading(false);
    });
  }, [subjectId]);

  const startExam = async (chapterId = null) => {
    setGenerating(true);
    try {
      const data = { subject_id: parseInt(subjectId) };
      if (chapterId) data.chapter_id = chapterId;
      const res = await api.post('/api/exams/generate/', data);
      // Store exam data for the TakeExam page
      sessionStorage.setItem(`exam_${res.data.exam_id}`, JSON.stringify(res.data));
      navigate(`/exam/${res.data.exam_id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate exam');
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
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Select Chapter</h1>
      <p className="text-gray-500 mb-6">Choose a specific chapter or take a full-subject exam</p>

      {/* Full subject exam */}
      <button onClick={() => startExam()} disabled={generating}
        className="w-full mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50">
        {generating ? 'Generating Exam...' : 'Take Full Subject Exam (50 Marks)'}
      </button>

      {/* Chapter list */}
      <div className="space-y-3">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800">{chapter.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{chapter.question_count} questions available</p>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => navigate(`/study/${chapter.id}`)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition min-h-[44px]">
                  Study
                </button>
                <button onClick={() => startExam(chapter.id)} disabled={generating}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 min-h-[44px]">
                  Exam
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
