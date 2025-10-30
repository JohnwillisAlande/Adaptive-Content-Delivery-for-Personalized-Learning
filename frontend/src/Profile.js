import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import './App.css';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const resolveImage = (image) => {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${image}`;
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing, refresh, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', image: null, password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/profile');
        setProfile(data);
        setForm(f => ({ ...f, name: data.name }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [initializing, isAuthenticated, navigate]);

  const handleChange = e => {
    const { name, value, files } = e.target;
    setForm(f => ({ ...f, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!profile) return;
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    if ((profile.userType === 'Student' || profile.userType === 'Teacher') && form.name) fd.append('name', form.name);
    if (form.image) fd.append('image', form.image);
    if (form.password) fd.append('password', form.password);
    if (form.confirmPassword) fd.append('confirmPassword', form.confirmPassword);
    try {
      const { data } = await api.put('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Profile updated');
      setProfile(prev => ({ ...prev, ...data.user }));
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
    setLoading(false);
  };

  const handleDelete = () => {
    if (!profile) return;
    confirmAlert({
      title: 'Confirm Account Deletion',
      message: 'Are you sure? This action is irreversible.',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            setLoading(true);
            try {
              await api.delete('/profile');
              toast.success('Account deleted');
              logout();
              setTimeout(() => navigate('/register'), 1000);
            } catch (err) {
              toast.error(err.response?.data?.error || 'Delete failed');
            }
            setLoading(false);
          }
        },
        {
          label: 'No',
          onClick: () => {}
        }
      ]
    });
  };

  if (loading || !profile) {
    return <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" size={32} /></div>;
  }

  const imageSrc = resolveImage(profile.image);
  const canEditName = profile.userType === 'Student' || profile.userType === 'Teacher';
  const disablePassword = profile.userType === 'Admin';
  const displayName = canEditName ? form.name : profile.name;

  return (
    <section className="profile">
      <h1 className="heading">Profile Details</h1>
      <div className="form-screen form-screen--plain form-screen--stacked">
        <form className="form-card form-card--wide profile-card" onSubmit={handleSubmit} encType="multipart/form-data" autoComplete="off">
          <div className="profile-card__header">
            <div className="profile-card__avatar">
              {imageSrc ? <img src={imageSrc} alt="Profile" /> : <div className="profile-card__placeholder" />}
            </div>
            <div className="profile-card__summary">
              <span className="profile-card__role">{profile.userType} account</span>
              <span className="profile-card__name">{displayName}</span>
              <span className="profile-card__email">{profile.email}</span>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="profile-name">
                Full name <span className="required-indicator">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                name="name"
                value={displayName}
                onChange={handleChange}
                required={canEditName}
                readOnly={!canEditName}
                aria-label="Name"
              />
            </div>
            <div>
              <label htmlFor="profile-email">
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                readOnly
                aria-label="Email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-image">Profile image</label>
            <input
              id="profile-image"
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              aria-label="Profile image"
            />
          </div>

          <div className="form-row">
            <div className="profile-card__password">
              <label htmlFor="profile-password">New password</label>
              <input
                id="profile-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={disablePassword ? 'Password updates disabled' : 'Enter new password'}
                aria-label="Password"
                disabled={disablePassword}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label="Toggle password visibility"
                disabled={disablePassword}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="profile-card__password">
              <label htmlFor="profile-confirm">Confirm password</label>
              <input
                id="profile-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder={disablePassword ? 'Password updates disabled' : 'Confirm new password'}
                aria-label="Confirm password"
                disabled={disablePassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                aria-label="Toggle confirm password visibility"
                disabled={disablePassword}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-actions horizontal profile-card__actions">
            <button type="submit" className="btn">
              Save changes
            </button>
            {canEditName && (
              <button type="button" onClick={handleDelete} className="delete-btn">
                Delete account
              </button>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="option-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Profile;
