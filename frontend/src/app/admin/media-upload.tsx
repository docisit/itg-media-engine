'use client';
import { useState } from 'react';
import axios from 'axios';

interface MediaUploadProps {
  onUploadSuccess: () => void;
  accessToken: string;
}

export default function MediaUpload({ onUploadSuccess, accessToken }: MediaUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState('video');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnail(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !file) {
      setError('Title and file are required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('media_type', mediaType);
      formData.append('file', file);
      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
      }

      await axios.post('/api/media/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Reset form
      setTitle('');
      setDescription('');
      setMediaType('video');
      setFile(null);
      setThumbnail(null);
      
      // Notify parent
      onUploadSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
      <h3 className="text-xl font-bold mb-4">Upload Media</h3>
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-zinc-400 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              placeholder="Enter media title"
              required
            />
          </div>
          
          <div>
            <label className="block text-zinc-400 mb-2">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="document">Document</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-zinc-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
              placeholder="Enter media description"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-zinc-400 mb-2">Media File *</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-black hover:file:bg-cyan-500"
              required
            />
            {file && (
              <p className="text-zinc-400 text-sm mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-zinc-400 mb-2">Thumbnail (Optional)</label>
            <input
              type="file"
              onChange={handleThumbnailChange}
              accept="image/*"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-black hover:file:bg-purple-500"
            />
            {thumbnail && (
              <p className="text-zinc-400 text-sm mt-2">
                Selected: {thumbnail.name}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="bg-cyan-600 text-black px-6 py-2 rounded-lg font-bold hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </form>
    </div>
  );
}