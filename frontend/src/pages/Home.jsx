import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Ace Your 10th Board Exams
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Practice with AI-graded exams covering CBSE &amp; State Board.
            MCQs, Short Answers, and Long Answers — all in one platform.
          </p>
          {user ? (
            <Link to="/dashboard" className="inline-block bg-white text-indigo-700 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/register" className="bg-white text-indigo-700 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition">
                Get Started Free
              </Link>
              <Link to="/login" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-white/10 transition">
                Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Choose Subject', desc: 'Pick from Mathematics, Science, English, Social Science, and Hindi.', icon: '1' },
            { title: 'Take 50-Mark Exam', desc: '20 MCQs + 5 Short Answers + 4 Long Answers. Timed and auto-saved.', icon: '2' },
            { title: 'Get AI Results', desc: 'Instant MCQ grading + AI-powered descriptive answer evaluation with detailed feedback.', icon: '3' },
          ].map((f) => (
            <div key={f.icon} className="bg-white rounded-xl shadow-md p-8 text-center hover:shadow-lg transition">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">All 5 Core Subjects</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Mathematics', 'Science', 'English', 'Social Science', 'Hindi'].map((s) => (
              <div key={s} className="bg-indigo-50 rounded-xl p-6 text-center hover:bg-indigo-100 transition">
                <p className="font-semibold text-indigo-800">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
