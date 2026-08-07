'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface BlogPostImage {
  id: number;
  image_url: string;
  compressed_url: string;
  thumbnail_url: string;
  caption: string;
  order: number;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author_name: string;
  category: string;
  tags: string;
  is_published: boolean;
  published_at: string | null;
  allow_comments: boolean;
  view_count: number;
  comment_count: number;
  pending_comments: number;
  video_url: string;
  featured_image: string | null;
  featured_image_compressed: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogComment {
  id: number;
  post: number;
  author: number;
  author_name: string;
  author_role: string;
  content: string;
  is_approved: boolean;
  created_at: string;
}

interface BlogAdminProps {
  accessToken: string;
  API_BASE: string;
}

export default function BlogAdmin({ accessToken, API_BASE }: BlogAdminProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Image management state
  const [postImages, setPostImages] = useState<BlogPostImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    video_url: '',
    is_published: false,
    is_featured: false,
    allow_comments: true,
  });
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    fetchPosts();
    fetchComments();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/admin/blog/posts/`, { headers });
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/blog/comments/`, { headers });
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchPostImages = async (postId: number) => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/blog/posts/${postId}/images/`, { headers });
      setPostImages(response.data);
    } catch (error) {
      console.error('Error fetching post images:', error);
    }
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: '',
      tags: '',
      video_url: '',
      is_published: false,
      is_featured: false,
      allow_comments: true,
    });
    setFeaturedImage(null);
    setPostImages([]);
    setNewImageFiles([]);
    setShowCreateModal(true);
  };

  const openEditModal = async (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      video_url: post.video_url,
      is_published: post.is_published,
      is_featured: false,
      allow_comments: post.allow_comments,
    });
    setFeaturedImage(null);
    setNewImageFiles([]);
    setShowCreateModal(true);
    await fetchPostImages(post.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('content', formData.content);
      formPayload.append('excerpt', formData.excerpt);
      formPayload.append('category', formData.category);
      formPayload.append('tags', formData.tags);
      formPayload.append('video_url', formData.video_url);
      formPayload.append('is_published', String(formData.is_published));
      formPayload.append('is_featured', String(formData.is_featured));
      formPayload.append('allow_comments', String(formData.allow_comments));

      if (featuredImage) {
        formPayload.append('featured_image', featuredImage);
      }

      let savedPost: BlogPost;

      if (editingPost) {
        const response = await axios.put(
          `${API_BASE}/api/admin/blog/posts/${editingPost.id}/`,
          formPayload,
          { headers }
        );
        savedPost = response.data;
      } else {
        const response = await axios.post(
          `${API_BASE}/api/admin/blog/posts/`,
          formPayload,
          { headers }
        );
        savedPost = response.data;
      }

      // Upload new images if any
      if (newImageFiles.length > 0 && savedPost?.id) {
        setUploadingImages(true);
        const imageForm = new FormData();
        newImageFiles.forEach((file) => {
          imageForm.append('images', file);
        });

        await axios.post(
          `${API_BASE}/api/admin/blog/posts/${savedPost.id}/images/`,
          imageForm,
          { headers }
        );
        setUploadingImages(false);
      }

      setShowCreateModal(false);
      fetchPosts();
    } catch (error) {
      console.error('Error saving blog post:', error);
      alert('Error saving post. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!confirm('Delete this image?')) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/blog/images/${imageId}/`, { headers });
      setPostImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/blog/posts/${postId}/`, { headers });
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const formPayload = new FormData();
      formPayload.append('is_published', String(!post.is_published));
      await axios.put(`${API_BASE}/api/admin/blog/posts/${post.id}/`, formPayload, { headers });
      fetchPosts();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const approveComment = async (commentId: number) => {
    try {
      await axios.post(`${API_BASE}/api/admin/blog/comments/${commentId}/approve/`, {}, { headers });
      fetchComments();
    } catch (error) {
      console.error('Error approving comment:', error);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/blog/comments/${commentId}/delete/`, { headers });
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const pendingComments = comments.filter((c) => !c.is_approved);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-zinc-900 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 px-6 py-3 rounded-md transition ${
            activeTab === 'posts' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Blog Posts ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-6 py-3 rounded-md transition ${
            activeTab === 'comments' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Comments{' '}
          {pendingComments.length > 0 && (
            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingComments.length} pending
            </span>
          )}
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Blog Posts</h2>
            <button
              onClick={openCreateModal}
              className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
            >
              + New Post
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <p>No blog posts yet. Create your first post!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{post.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            post.is_published ? 'bg-green-600' : 'bg-zinc-700'
                          }`}
                        >
                          {post.is_published ? 'Published' : 'Draft'}
                        </span>
                        {post.pending_comments > 0 && (
                          <span className="text-xs bg-yellow-600 text-black px-2 py-0.5 rounded">
                            {post.pending_comments} pending comments
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span>By: {post.author_name}</span>
                        {post.category && <span>Category: {post.category}</span>}
                        <span>Views: {post.view_count}</span>
                        <span>Comments: {post.comment_count}</span>
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                      </div>
                      {post.excerpt && (
                        <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => togglePublish(post)}
                        className={`px-3 py-1.5 rounded text-xs font-bold ${
                          post.is_published
                            ? 'bg-yellow-600 text-black hover:bg-yellow-500'
                            : 'bg-green-600 text-white hover:bg-green-500'
                        } transition`}
                      >
                        {post.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => openEditModal(post)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-500 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-500 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Comments
            {pendingComments.length > 0 && (
              <span className="ml-2 text-sm text-yellow-500">
                ({pendingComments.length} pending approval)
              </span>
            )}
          </h2>

          {comments.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">No comments yet.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`bg-zinc-900/50 rounded-xl p-4 border ${
                    comment.is_approved ? 'border-zinc-800' : 'border-yellow-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-sm">{comment.author_name}</span>
                        <span className="text-xs text-zinc-500 capitalize">{comment.author_role}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            comment.is_approved ? 'bg-green-600' : 'bg-yellow-600 text-black'
                          }`}
                        >
                          {comment.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-sm">{comment.content}</p>
                      <p className="text-xs text-zinc-600 mt-1">{formatDate(comment.created_at)}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!comment.is_approved && (
                        <button
                          onClick={() => approveComment(comment.id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-500 transition"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-500 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-3xl w-full border border-zinc-800 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white"
                  placeholder="Post title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Excerpt (short summary)</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white resize-none"
                  rows={2}
                  placeholder="Brief summary of the post..."
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white resize-none font-mono text-sm"
                  rows={10}
                  placeholder="Write your post content here..."
                  required
                />
                <p className="text-xs text-zinc-600 mt-1">HTML is supported for formatting.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white"
                    placeholder="e.g., News, Story, Update"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white"
                    placeholder="football, recruiting, training"
                  />
                </div>
              </div>

              {/* Backward-compatible featured image */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Featured Image (legacy — single)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFeaturedImage(e.target.files?.[0] || null)}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white text-sm"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Max file size: <strong>5MB</strong>. Keep images under 1920px wide for best performance.
                </p>
              </div>

              {/* Multi-Image Upload Section */}
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                <label className="block text-sm text-zinc-400 mb-2">
                  Additional Images{' '}
                  <span className="text-cyan-400 font-bold">(carousel)</span>
                </label>
                <p className="text-xs text-zinc-500 mb-3">
                  Select multiple images. They will auto-rotate in a carousel on the post page.
                  First image is the hero.
                </p>

                {editingPost && postImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Existing images:</p>
                    <div className="flex gap-3 flex-wrap">
                      {postImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.thumbnail_url || img.compressed_url || img.image_url}
                            alt={img.caption || `Image ${img.order}`}
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                          />
                          <button
                            type="button"
                            onClick={() => deleteImage(img.id)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            title="Delete image"
                          >
                            &times;
                          </button>
                          {img.caption && (
                            <p className="text-[10px] text-zinc-500 mt-1 truncate w-20 text-center">
                              {img.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewImageFiles(Array.from(e.target.files));
                    }
                  }}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white text-sm"
                />
                {newImageFiles.length > 0 && (
                  <p className="text-xs text-cyan-400 mt-2">
                    {newImageFiles.length} file(s) selected — will upload after saving the post
                  </p>
                )}
                <p className="text-xs text-zinc-600 mt-1">
                  Images auto-compressed to WebP (max 1920px) on upload. Thumbnails generated automatically.
                </p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Video URL (optional)</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2.5 rounded-lg text-white"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-zinc-400">Publish immediately</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-cyan-400 font-bold">Feature on Front Page</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_comments}
                    onChange={(e) => setFormData({ ...formData, allow_comments: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-zinc-400">Allow comments</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || uploadingImages}
                  className="flex-1 bg-cyan-600 text-black py-2.5 rounded-lg font-bold hover:bg-cyan-400 transition disabled:opacity-50"
                >
                  {uploadingImages
                    ? 'Uploading images...'
                    : submitting
                    ? 'Saving...'
                    : editingPost
                    ? 'Update Post'
                    : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-zinc-800 py-2.5 rounded-lg hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}