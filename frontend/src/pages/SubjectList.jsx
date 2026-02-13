import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function SubjectList() {
  const [searchParams] = useSearchParams();
  const examTypeId = searchParams.get('exam_type');
  const [subjects, setSubjects] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(examTypeId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/exam-types/').then((res) => {
      setExamTypes(res.data.results || res.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = selectedType ? { exam_type: selectedType } : {};
    api.get('/api/subjects/', { params }).then((res) => {
      setSubjects(res.data.results || res.data);
      setLoading(false);
    });
  }, [selectedType]);

  const subjectColors = {
    Mathematics: 'from-blue-500 to-blue-700',
    Science: 'from-green-500 to-green-700',
    English: 'from-purple-500 to-purple-700',
    'Social Science': 'from-orange-500 to-orange-700',
    Hindi: 'from-red-500 to-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Choose a Subject</h1>

      {/* Board filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setSelectedType('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selectedType ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          All Boards
        </button>
        {examTypes.map((et) => (
          <button key={et.id} onClick={() => setSelectedType(String(et.id))}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedType === String(et.id) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {et.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link key={subject.id} to={`/chapters/${subject.id}`}
              className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition">
              <div className={`bg-gradient-to-r ${subjectColors[subject.name] || 'from-gray-500 to-gray-700'} p-6 text-white`}>
                <h3 className="text-xl font-bold">{subject.name}</h3>
                <p className="text-sm opacity-90 mt-1">{subject.exam_type_name}</p>
              </div>
              <div className="bg-white p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{subject.chapter_count} Chapters</span>
                  <span>{subject.question_count} Questions</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>{subject.duration_minutes} min exam</span>
                  <span>{subject.total_marks} marks</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
