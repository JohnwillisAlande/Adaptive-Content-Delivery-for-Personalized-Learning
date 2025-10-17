import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { ClipLoader } from 'react-spinners';

function ModifyCourse() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let userType = null;
  if (token) {
    try {
      userType = jwtDecode(token).userType;
    } catch {}
  }
  if (userType !== 'Admin') {
    toast.error('Access denied. Admins only.');
    navigate('/login');
    return null;
  }

  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumb, setThumb] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setCourses(data);
        else toast.error(data.error || 'Failed to fetch courses');
      } catch {
        toast.error('Error fetching courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [token]);

  const handleEdit = (course) => {
    setSelected(course);
    setTitle(course.title);
    setDescription(course.description);
    setPreview(course.thumb);
    setThumb(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (thumb) formData.append('thumb', thumb);
    try {
      const res = await fetch(`/api/courses/${selected._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Course updated successfully!');
        setTimeout(() => navigate('/courses'), 1200);
      } else {
        toast.error(data.error || 'Failed to update course');
      }
    } catch {
      toast.error('Error updating course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-[#1a1d2e] p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-teal-400 mb-6">Modify Course Material</h2>
        {loading && <div className="flex justify-center py-4"><ClipLoader color="#14b8a6" size={32} /></div>}
        {!selected ? (
          <div>
            <label className="block mb-4 text-white font-semibold">Select a course to edit:</label>
            <ul className="mb-6">
              {courses.map(course => (
                <li key={course._id} className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-white font-semibold">{course.title}</span>
                  <button onClick={() => handleEdit(course)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-all duration-300 ml-4">Edit</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            <label className="block mb-4 text-white font-semibold" htmlFor="title">Course Title</label>
            <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-teal-400" aria-label="Course Title" />
            <label className="block mb-4 text-white font-semibold" htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-teal-400" aria-label="Course Description" />
            <label className="block mb-4 text-white font-semibold" htmlFor="thumb">Thumbnail</label>
            <input id="thumb" type="file" accept="image/*" onChange={e => { setThumb(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0])); }} className="w-full mb-6 text-white" aria-label="Course Thumbnail" />
            {preview && <img src={preview} alt="Thumbnail Preview" className="w-32 h-20 object-cover rounded-lg mb-6" />}
            <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all duration-300" disabled={loading} aria-label="Update Course">
              {loading ? <ClipLoader color="#fff" size={24} /> : 'Update Course'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ModifyCourse;
