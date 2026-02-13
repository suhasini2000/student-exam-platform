import { useState, useEffect } from 'react';
import api from '../../api/axios';

const IMAGE_SLOTS = [
  { key: 'school_dashboard', label: 'School Dashboard', desc: 'Header background for the main dashboard' },
  { key: 'manage_teachers', label: 'Manage Teachers', desc: 'Header background for the teachers page' },
  { key: 'manage_students', label: 'Manage Students', desc: 'Header background for the students page' },
  { key: 'manage_subjects', label: 'Manage Subjects', desc: 'Header background for the subjects page' },
];

export default function ManageImages() {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchImages = async () => {
    try {
      const res = await api.get('/api/site-images/');
      setImages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const formData = new FormData();
      formData.append('key', key);
      formData.append('image', file);
      formData.append('title', key);
      await api.post('/api/site-images/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg('Image uploaded successfully!');
      fetchImages();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (key) => {
    const img = images[key];
    if (!img?.id) return;
    if (!window.confirm('Remove this background image?')) return;
    setDeleting(key);
    try {
      await api.delete(`/api/site-images/${img.id}/`);
      showMsg('Image removed.');
      fetchImages();
    } catch (err) {
      showMsg('Failed to remove image.', 'error');
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
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Background Images</h1>
        <p className="mt-2 text-white/80">Upload background images for your school pages. Each page can have its own image.</p>
      </div>

      {message.text && (
        <div className={`px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IMAGE_SLOTS.map((slot) => {
          const img = images[slot.key];
          const hasImage = !!img?.url;

          return (
            <div key={slot.key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Preview */}
              <div
                className="h-40 bg-cover bg-center relative"
                style={hasImage ? { backgroundImage: `url(${img.url})` } : {}}
              >
                <div className={`absolute inset-0 ${hasImage ? 'bg-black/30' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}></div>
                <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                  <h3 className="text-white font-bold text-lg">{slot.label}</h3>
                  <p className="text-white/70 text-xs">{slot.desc}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition ${uploading === slot.key ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {uploading === slot.key ? 'Uploading...' : hasImage ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === slot.key}
                    onChange={(e) => handleUpload(slot.key, e.target.files[0])}
                  />
                </label>
                {hasImage && (
                  <button
                    onClick={() => handleDelete(slot.key)}
                    disabled={deleting === slot.key}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {deleting === slot.key ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
