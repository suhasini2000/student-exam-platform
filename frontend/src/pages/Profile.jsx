import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Avatar from '../components/Common/Avatar';

const PREVIEW_SIZE = 220;

export default function Profile() {
  const { user, fetchProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Photo crop modal state
  const [photoModal, setPhotoModal] = useState(false);
  const [rawPhoto, setRawPhoto] = useState(null);
  const [photoPos, setPhotoPos] = useState({ x: 0, y: 0 });
  const [photoScale, setPhotoScale] = useState(1);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/profile/', formData);
      await fetchProfile();
      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to update profile');
    }
  };

  // File selected → open crop modal
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawPhoto(url);
    setPhotoPos({ x: 0, y: 0 });
    setPhotoScale(1);
    setPhotoModal(true);
    e.target.value = '';
  };

  // When image loads inside modal, scale to cover and center
  const handleImgLoad = (e) => {
    const img = e.target;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setImgNatural({ w, h });
    const scale = Math.max(PREVIEW_SIZE / w, PREVIEW_SIZE / h);
    setPhotoScale(scale);
    const scaledW = w * scale;
    const scaledH = h * scale;
    setPhotoPos({ x: (PREVIEW_SIZE - scaledW) / 2, y: (PREVIEW_SIZE - scaledH) / 2 });
  };

  // Clamp position so image always covers the circle
  const clampPos = useCallback((pos, scale) => {
    const scaledW = imgNatural.w * scale;
    const scaledH = imgNatural.h * scale;
    return {
      x: Math.min(0, Math.max(PREVIEW_SIZE - scaledW, pos.x)),
      y: Math.min(0, Math.max(PREVIEW_SIZE - scaledH, pos.y)),
    };
  }, [imgNatural]);

  const startDrag = (clientX, clientY) => {
    dragging.current = true;
    lastPtr.current = { x: clientX, y: clientY };
  };
  const moveDrag = (clientX, clientY) => {
    if (!dragging.current) return;
    const dx = clientX - lastPtr.current.x;
    const dy = clientY - lastPtr.current.y;
    lastPtr.current = { x: clientX, y: clientY };
    setPhotoPos(prev => clampPos({ x: prev.x + dx, y: prev.y + dy }, photoScale));
  };
  const endDrag = () => { dragging.current = false; };

  const handleScaleChange = (newScale) => {
    setPhotoScale(newScale);
    setPhotoPos(prev => clampPos(prev, newScale));
  };

  // Crop via canvas and upload
  const handleApply = () => {
    const img = new Image();
    img.src = rawPhoto;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PREVIEW_SIZE;
      canvas.height = PREVIEW_SIZE;
      const ctx = canvas.getContext('2d');
      const srcX = -photoPos.x / photoScale;
      const srcY = -photoPos.y / photoScale;
      const srcW = PREVIEW_SIZE / photoScale;
      const srcH = PREVIEW_SIZE / photoScale;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      canvas.toBlob(async (blob) => {
        setPhotoModal(false);
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append('profile_photo', blob, 'profile.jpg');
          await api.patch('/api/auth/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          await fetchProfile();
          setMessage('Photo updated successfully!');
          setTimeout(() => setMessage(''), 3000);
        } catch {
          setMessage('Failed to upload photo');
        } finally {
          setUploading(false);
          URL.revokeObjectURL(rawPhoto);
        }
      }, 'image/jpeg', 0.92);
    };
  };

  const cancelModal = () => {
    setPhotoModal(false);
    URL.revokeObjectURL(rawPhoto);
    setRawPhoto(null);
  };

  const minScale = imgNatural.w && imgNatural.h
    ? Math.max(PREVIEW_SIZE / imgNatural.w, PREVIEW_SIZE / imgNatural.h)
    : 1;

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Profile</h1>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${message.includes('success') || message.includes('updated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        {/* Profile Photo */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-200">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <Avatar src={user.profile_photo} name={user.first_name || user.username} size="xl" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{user.first_name} {user.last_name}</h2>
            <p className="text-gray-500">@{user.username}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {uploading ? 'Uploading...' : user.profile_photo ? 'Change Photo' : 'Add Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
              <input value={formData.school_name || ''} onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={formData.phone_number || ''} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <input value={formData.parent_phone || ''} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition">Save</button>
              <button type="button" onClick={() => { setEditing(false); setFormData({ ...user }); }}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2.5 rounded-lg font-medium transition">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setEditing(true)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
                Edit Profile
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div><span className="text-sm text-gray-500">Email</span><p className="font-medium text-gray-800">{user.email}</p></div>
              <div><span className="text-sm text-gray-500">Board</span><p className="font-medium text-gray-800">{user.board}</p></div>
              <div><span className="text-sm text-gray-500">Class</span><p className="font-medium text-gray-800">{user.grade}</p></div>
              <div><span className="text-sm text-gray-500">School</span><p className="font-medium text-gray-800">{user.school_name || '-'}</p></div>
              <div><span className="text-sm text-gray-500">Phone</span><p className="font-medium text-gray-800">{user.phone_number || '-'}</p></div>
              <div><span className="text-sm text-gray-500">Parent Phone</span><p className="font-medium text-gray-800">{user.parent_phone || '-'}</p></div>
            </div>
          </div>
        )}
      </div>

      {/* ── Photo Crop Modal ── */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Adjust Photo</h3>
            <p className="text-sm text-gray-500 mb-5">Drag to reposition · Scroll or use slider to zoom</p>

            {/* Circular preview with drag */}
            <div className="flex justify-center mb-5">
              <div
                className="relative overflow-hidden rounded-full border-4 border-indigo-400 shadow-lg select-none"
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, cursor: dragging.current ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
                onTouchMove={(e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
                onTouchEnd={endDrag}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  handleScaleChange(Math.max(minScale, Math.min(4, photoScale + delta)));
                }}
              >
                <img
                  src={rawPhoto}
                  alt="Preview"
                  onLoad={handleImgLoad}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: photoPos.x,
                    top: photoPos.y,
                    width: imgNatural.w * photoScale,
                    height: imgNatural.h * photoScale,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {/* Zoom slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Zoom</span>
                <span>{Math.round(photoScale * 100)}%</span>
              </div>
              <input
                type="range"
                min={Math.round(minScale * 100)}
                max={400}
                value={Math.round(photoScale * 100)}
                onChange={(e) => handleScaleChange(parseInt(e.target.value) / 100)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApply}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition"
              >
                Apply
              </button>
              <button
                onClick={cancelModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
