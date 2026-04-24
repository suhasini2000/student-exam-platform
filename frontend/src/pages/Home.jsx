import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ORG_TYPES = [
  {
    key: 'school',
    title: 'School',
    description: 'Complete K-12 management with class and section controls.',
    color: 'from-blue-500 to-indigo-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    key: 'college',
    title: 'College',
    description: 'Scalable assessment solutions for higher education.',
    color: 'from-purple-500 to-pink-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    key: 'coaching',
    title: 'Coaching Centre',
    description: 'Optimized for EAMCET, NEET, and JEE preparation.',
    color: 'from-orange-500 to-red-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: 'AI Smart Grading',
    desc: 'Instant, accurate grading for MCQs and descriptive answers using Gemini 2.0.',
    icon: '⚡',
  },
  {
    title: 'Handwritten Analysis',
    desc: 'Upload handwritten sheets and let AI transcribe and grade them with precision.',
    icon: '📝',
  },
  {
    title: 'Advanced Analytics',
    desc: 'Detailed student progress cards and learning gap analysis for teachers.',
    icon: '📊',
  },
];

export default function Home() {
  const { user, getDashboardPath } = useAuth();
  const [selected, setSelected] = useState(null);

  if (user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-slate-50 -z-10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50" />
        
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Welcome back!</h1>
          <p className="text-gray-600 text-lg mb-8">Continue managing your exams and monitoring student progress.</p>
          <Link
            to={getDashboardPath()}
            className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-1 active:scale-95"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Hero Section ── */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden bg-white">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-50 rounded-full blur-3xl opacity-60 -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold tracking-wide uppercase mb-6">
            Powered by Gemini 2.0 AI
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
            Next Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Exam Management</span>
          </h1>
          <p className="text-gray-500 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed mb-10">
            Streamline assessments with AI grading, handwritten sheet processing, and deep learning analytics.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
             {FEATURES.map((f, i) => (
               <div key={i} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm text-sm font-medium text-gray-700">
                 <span>{f.icon}</span> {f.title}
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── Selection Section ── */}
      <section className="py-16 px-4 bg-slate-50 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h2>
            <p className="text-gray-500">{selected ? 'Sign in to your portal' : 'Choose your institution type'}</p>
          </div>

          {!selected ? (
            <div className="grid md:grid-cols-3 gap-8">
              {ORG_TYPES.map((org) => (
                <button
                  key={org.key}
                  onClick={() => setSelected(org.key)}
                  className="group relative bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 flex flex-col items-center text-center cursor-pointer border-2 border-transparent hover:border-indigo-500 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${org.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    {org.icon}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">{org.title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-6">{org.description}</p>
                  <div className="mt-auto flex items-center text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">
                    Select Portal <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 bg-gradient-to-br ${ORG_TYPES.find(o => o.key === selected).color} text-white rounded-xl flex items-center justify-center shadow-md`}>
                    {ORG_TYPES.find(o => o.key === selected).icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{ORG_TYPES.find(o => o.key === selected).title} Portal</h3>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Selected Account</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Link
                    to={`/login?org_type=${selected}`}
                    className="flex items-center justify-center w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Login to Account
                  </Link>
                  <Link
                    to={`/register?org_type=${selected}`}
                    className="flex items-center justify-center w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Register New Institution
                  </Link>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 font-medium underline"
                  >
                    Change Institution Type
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Info Footer ── */}
      <footer className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
