import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../api';

export default function Profile() {
  const { user: profile, updateUser, refreshUser, logout } = useAuth();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', shopName: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [changes, setChanges] = useState([]);
  const [showPicDelete, setShowPicDelete] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        shopName: profile.shopName || ''
      });
      // If profilePicUrl is empty string or falsy, set preview to null
      setPreview(profile.profilePicUrl ? (profile.profilePicUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_BASE_URL}${profile.profilePicUrl}` : profile.profilePicUrl) : null);
    }
  }, [profile]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Compare old and new values for confirmation
  const getChanges = () => {
    if (!profile) return [];
    const diff = [];
    if (form.fullName !== profile.fullName) diff.push({ field: 'Full Name', old: profile.fullName, new: form.fullName });
    if (form.mobile !== profile.mobile) diff.push({ field: 'Mobile', old: profile.mobile, new: form.mobile });
    if (form.shopName !== profile.shopName) diff.push({ field: 'Shop Name', old: profile.shopName, new: form.shopName });
    // Profile picture change detection
    if (profilePic) { 
      diff.push({ field: 'Profile Picture', old: profile.profilePicUrl ? 'Set' : 'Not Set', new: 'Changed' });
    } else if (
      preview === '/default-avatar.svg'
    ) {
      // Pic was deleted (was set, now preview is null or default avatar), or was already deleted and user tries again
      diff.push({ field: 'Profile Picture', old: profile.profilePicUrl ? 'Set' : 'Not Set', new: 'Deleted' });
    }
    return diff;
  };

  const handlePicChange = e => {
    const file = e.target.files[0];
    setProfilePic(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const diff = getChanges();
    setChanges(diff);
    setShowConfirm(true);
  };

  const doSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let profilePicUrl = profile?.profilePicUrl;
      // If preview is default avatar, always treat as delete
      if (preview === '/default-avatar.png') {
        profilePicUrl = '';
      } else if (profilePic) {
        const fd = new FormData();
        fd.append('profilePic', profilePic);
        const uploadRes = await api.post('/auth/profile-pic', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        profilePicUrl = uploadRes.data.url;
      }
      
      // Use the updateUser function from AuthContext
      const updateData = { ...form, profilePicUrl };
      const result = await updateUser(updateData);
      
      if (result.success) {
        setSuccess('Profile updated!');
        setEdit(false);
        setProfilePic(null);
        setPreview(profilePicUrl
          ? (profilePicUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_BASE_URL}${profilePicUrl}` : profilePicUrl)
          : null);
        // If deleted, ensure local state is also cleared
        if (!profilePicUrl) {
          setPreview(null);
        }
      } else {
        setError(result.error || 'Update failed');
      }
    } catch (err) {
      setError('Update failed');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // Delete profile picture
  const handlePicDelete = async () => {
    // Instead of deleting immediately, just set preview to default avatar and clear profilePic
    setPreview('/default-avatar.svg');
    setProfilePic(null);
    setShowPicDelete(false);
  };

  const handleDelete = async () => {
    setConfirmError('');
    if (!confirmPassword) {
      setConfirmError('Please enter your password to confirm.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.delete('/auth/me', { data: { password: confirmPassword } });
      logout(); // Use logout from AuthContext
      window.location.href = '/login';
    } catch (err) {
      setError('Account deletion failed. Password may be incorrect.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div className="text-center text-white mt-10">Loading profile...</div>;

  return (
    <div className="max-w-lg mx-auto bg-gray-900 rounded-lg shadow-lg p-8 mt-10 text-white">
      <h2 className="text-2xl font-bold mb-6">Profile</h2>
      <div className="flex flex-col items-center mb-6">
        <label className="cursor-pointer relative group">
          <img
            src={
              preview
                ? preview
                : profile && profile.profilePicUrl
                  ? (profile.profilePicUrl.startsWith('/uploads')
                      ? `${import.meta.env.VITE_API_BASE_URL}${profile.profilePicUrl}`
                      : profile.profilePicUrl)
                  : '/default-avatar.svg'
            }
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 mb-2"
          />
          {edit && (
            <>
              <input type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
              <span className="absolute bottom-2 right-2 bg-indigo-600 text-xs px-2 py-1 rounded text-white opacity-80 group-hover:opacity-100 transition">Edit</span>
              {profile?.profilePicUrl && (
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-red-700 text-xs px-2 py-1 rounded text-white opacity-80 hover:opacity-100 transition"
                  onClick={() => setShowPicDelete(true)}
                >Delete</button>
              )}
            </>
          )}
        </label>
        <span className="text-gray-400 text-xs">Profile Picture</span>
      </div>
      {edit ? (
        <form onSubmit={handleSubmit}>
          <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full Name" className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none" required disabled />
          <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile Number" className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none" required />
          <input name="shopName" value={form.shopName} onChange={handleChange} placeholder="Meesho Shop Name" className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none" required />
          {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
          {success && <div className="text-green-400 mb-4 text-sm">{success}</div>}
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      ) : (
        <div>
          <div className="mb-2"><b>Name:</b> {profile.fullName}</div>
          <div className="mb-2"><b>Email:</b> {profile.email}</div>
          <div className="mb-2"><b>Mobile:</b> {profile.mobile}</div>
          <div className="mb-2"><b>Shop Name:</b> {profile.shopName}</div>
          <button onClick={() => setEdit(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded transition">Edit Profile</button>
        </div>
      )}

      {/* Confirm Save Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-900 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
            <div className="text-lg font-bold mb-4 text-white">Are you sure you want to save these changes?</div>
            <ul className="text-left text-sm mb-4">
              {changes.length === 0 ? <li className="text-gray-400">No changes detected.</li> : changes.map((c, i) => (
                <li key={i} className="mb-1"><b>{c.field}:</b> <span className="text-red-400">{c.old}</span> → <span className="text-green-400">{c.new}</span></li>
              ))}
            </ul>
            <button
              onClick={doSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded mr-4"
              disabled={loading || changes.length === 0}
            >
              Yes, Save
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Profile Pic Dialog */}
      {showPicDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-900 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
            <div className="text-lg font-bold mb-4 text-white">Delete Profile Picture?</div>
            <div className="mb-4 text-sm text-gray-300">Are you sure you want to delete your profile picture? This cannot be undone.</div>
            <button
              onClick={handlePicDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded mr-4"
              disabled={loading}
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowPicDelete(false)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="mt-10">
        <button
          onClick={() => setShowDelete(true)}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 rounded transition mt-4"
        >
          Delete My Account
        </button>
        {showDelete && (
          <div className="mt-4 bg-red-900 text-red-200 p-4 rounded-lg text-center">
            <div className="font-bold mb-2">Warning: This action is irreversible!</div>
            <div className="mb-4">Are you sure you want to delete your account? All your data will be permanently removed.</div>
            <input
              type="password"
              placeholder="Enter your password to confirm"
              className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            {confirmError && <div className="text-red-400 mb-2 text-sm">{confirmError}</div>}
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded mr-4"
              disabled={loading}
            >
              Yes, Delete
            </button>
            <button
              onClick={() => { setShowDelete(false); setConfirmPassword(''); setConfirmError(''); }}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded"
            >
              No, Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
