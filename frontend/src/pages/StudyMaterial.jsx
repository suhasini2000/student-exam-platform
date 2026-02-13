import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function StudyMaterial() {
  const { chapterId } = useParams();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/study-materials/', { params: { chapter: chapterId } }).then((res) => {
      setMaterials(res.data.results || res.data);
      setLoading(false);
    });
  }, [chapterId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Study Material</h1>
        <Link to={-1} className="text-indigo-600 hover:underline text-sm">Back to Chapters</Link>
      </div>

      {materials.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500">No study material available for this chapter yet.</p>
        </div>
      ) : (
        materials.map((mat) => (
          <div key={mat.id} className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{mat.title}</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">{mat.content}</div>

            {mat.key_concepts?.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-800 mb-3">Key Concepts</h3>
                <div className="space-y-3">
                  {mat.key_concepts.map((kc) => (
                    <div key={kc.id} className="bg-indigo-50 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-800">{kc.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{kc.description}</p>
                      {kc.formula && (
                        <p className="text-sm text-indigo-600 mt-1 font-mono">{kc.formula}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
