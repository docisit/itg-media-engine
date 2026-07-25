'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

interface BlogComment {
  id: number;
  author: number;
  author_name: string;
  author_role: string;
  author_profile_image: string | null;
  content: string;
  is_approved: boolean;
  created_at: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author_name: string;
  author_role: string;
  author_profile_image: string | null;
  featured_image_url: string | null;
  compressed_image_url: string | null;
  video_url: string;
  category: string;
  tags_list: string[];
  is_published: boolean;
  published_at: string;
  allow_comments: boolean;
  view_count: number;
  comment_count: number;
  like_count: number;
  reading_time: number;
  comments: BlogComment[];
  created_at: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    if (slug) fetchPost();
  }, [slug]);

  useEffect(() => {
    if (post && session) fetchLikeStatus();
  }, [post, session]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/blog/posts/${slug}/`);
      setPost(response.data);
      setLikeCount(response.data.like_count || 0);
    } catch (error) {
      console.error('Error fetching blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikeStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/blog/posts/${slug}/like-status/`, {
        headers: {
          Authorization: `Bearer ${(session?.user as any)?.accessToken}`
        }
      });
      setLiked(response.data.liked);
    } catch (error) {
      // Not authenticated or error - that's fine
    }
  };

  const handleToggleLike = async () => {
    if (!session) return;
    try {
      const response = await axios.post(
        `${API_BASE}/api/blog/posts/${slug}/like/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.accessToken}`
          }
        }
      );
      setLiked(response.data.liked);
      setLikeCount(response.data.like_count);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    setCommentError('');
    setCommentSuccess('');
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/blog/posts/${slug}/comments/`,
        { content: commentText.trim() },
        {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.accessToken}`
          }
        }
      );
      setCommentText('');
      setCommentSuccess('Comment posted!');
      // Refresh post to show new comment
      fetchPost();
    } catch (error: any) {
      setCommentError(error.response?.data?.error || 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Post Not Found</h1>
          <Link href="/blog" className="text-cyan-500 hover:text-cyan-400 transition">
            ← Back to News Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Featured Image */}
      {post.featured_image_url && (
        <div className="w-full h-64 md:h-96 overflow-hidden rounded-xl">
          <img
            src={post.compressed_image_url || post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Post Content */}
      <div className="max-w-4xl mx-auto py-8">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          {post.category && (
            <span className="text-xs font-bold bg-cyan-900/50 text-cyan-400 px-2 py-1 rounded">
              {post.category}
            </span>
          )}
          <span className="text-sm text-zinc-500">{formatDate(post.published_at)}</span>
          <span className="text-sm text-zinc-600">{post.reading_time} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-zinc-800">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-lg font-bold">
            {post.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold">{post.author_name}</p>
            <p className="text-sm text-zinc-500 capitalize">{post.author_role}</p>
          </div>
        </div>

        {/* Video Embed */}
        {post.video_url && (
          <div className="mb-8 aspect-video rounded-xl overflow-hidden">
            <iframe
              src={getVideoEmbedUrl(post.video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none mb-8">
          {post.content.split('\n').map((paragraph, i) => (
            paragraph.trim() ? (
              <p key={i} className="text-zinc-300 leading-relaxed mb-4">{paragraph}</p>
            ) : null
          ))}
        </div>

        {/* Tags */}
        {post.tags_list.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {post.tags_list.map((tag) => (
              <span key={tag} className="text-sm text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center gap-6 text-sm text-zinc-500 mb-8 pb-8 border-b border-zinc-800">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.view_count} views
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {post.comment_count} comments
          </span>
          
          {/* Like Button */}
          <button
            onClick={handleToggleLike}
            disabled={!session}
            className={`flex items-center gap-2 transition ${
              !session ? 'text-zinc-600 cursor-not-allowed' :
              liked ? 'text-red-500' : 'text-zinc-500 hover:text-red-400'
            }`}
            title={session ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
          >
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likeCount}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition"
            title="Copy link to share"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {shareCopied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">
            Comments ({post.comments.length})
          </h2>

          {/* Existing Comments */}
          {post.comments.length > 0 ? (
            <div className="space-y-6 mb-8">
              {post.comments.map((comment) => (
                <div key={comment.id} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{comment.author_name}</p>
                      <p className="text-xs text-zinc-500">{formatDateTime(comment.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 mb-8">No comments yet. Be the first to comment!</p>
          )}

          {/* Comment Form */}
          {post.allow_comments && (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-lg font-bold mb-4">Leave a Comment</h3>
              
              {!session ? (
                <p className="text-zinc-500">
                  <Link href="/login" className="text-cyan-500 hover:text-cyan-400 transition">
                    Sign in
                  </Link>{' '}
                  to leave a comment.
                </p>
              ) : (
                <form onSubmit={handleSubmitComment}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={4}
                    maxLength={2000}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition resize-none mb-4"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">
                      {commentText.length}/2000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="bg-cyan-600 text-black px-6 py-2 rounded-lg font-bold hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? 'Submitting...' : 'Submit Comment'}
                    </button>
                  </div>
                  
                  {commentError && (
                    <p className="text-red-500 text-sm mt-2">{commentError}</p>
                  )}
                  {commentSuccess && (
                    <p className="text-green-500 text-sm mt-2">{commentSuccess}</p>
                  )}
                </form>
              )}
            </div>
          )}

          {!post.allow_comments && (
            <p className="text-zinc-500 text-sm">Comments are disabled on this post.</p>
          )}
        </div>
      </div>
    </div>
  );
}
