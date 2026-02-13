import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Profile() {
  const { user, fetchProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  const [message, setMessage] = useState('');

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

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Profile</h1>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
              <input value={formData.school_name || ''} onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={formData.phone_number || ''} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <input value={formData.parent_phone || ''} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">Save</button>
              <button type="button" onClick={() => { setEditing(false); setFormData({ ...user }); }}
                className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{user.first_name} {user.last_name}</h2>
                <p className="text-gray-500">@{user.username}</p>
              </div>
              <button onClick={() => setEditing(true)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
                Edit Profile
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div><span className="text-sm text-gray-500">Email</span><p className="font-medium">{user.email}</p></div>
              <div><span className="text-sm text-gray-500">Board</span><p className="font-medium">{user.board}</p></div>
              <div><span className="text-sm text-gray-500">Class</span><p className="font-medium">{user.grade}</p></div>
              <div><span className="text-sm text-gray-500">School</span><p className="font-medium">{user.school_name || '-'}</p></div>
              <div><span className="text-sm text-gray-500">Phone</span><p className="font-medium">{user.phone_number || '-'}</p></div>
              <div><span className="text-sm text-gray-500">Parent Phone</span><p className="font-medium">{user.parent_phone || '-'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
