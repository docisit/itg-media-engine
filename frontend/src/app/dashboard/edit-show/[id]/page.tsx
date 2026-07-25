'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function EditShowPage() {
  const { id } = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    guest_name: '',
    air_date: '',
    video_url: '',
    transcript: '',
  });

  // 1. Load the existing data into the form
  useEffect(() => {
    const fetchShow = async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shows/${id}/`);
      setFormData(res.data);
    };
    fetchShow();
  }, [id]);

  // 2. Handle saving the changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/shows/${id}/`, formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // If you use JWT
      });
      alert('Show Updated!');
      router.push('/shows'); // Send them back to the calendar
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Edit Show: {formData.title}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-zinc-400">Title</label>
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded"
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />
        </div>
        {/* Add more fields for guest_name, video_url, etc. */}
        <button type="submit" className="bg-cyan-600 px-6 py-2 rounded font-bold">
          Save Changes
        </button>
      </form>
    </div>
  );
}