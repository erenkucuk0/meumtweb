import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, Plus, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    username: string;
  } | null;
  likes: string[];
  views: number;
  commentCount: number;
  createdAt: string;
  lastActivity: string;
  isPinned: boolean;
  comments: ForumComment[];
}

interface ForumComment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    username: string;
  } | null;
  likes: string[];
  createdAt: string;
}

const Forum: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [view, setView] = useState<'list' | 'post' | 'new-post'>('list');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const [newComment, setNewComment] = useState('');

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await fetch('/api/forum/posts');
      const data = await response.json();
      if (response.ok) {
        setPosts(data.data || []);
      } else {
        toast.error(data.message || 'Gönderiler yüklenemedi.');
      }
    } catch (error) {
      toast.error('Gönderileri yüklerken bir hata oluştu.');
      console.error(error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const selectPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/forum/posts/${postId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedPost({
          ...data.data.post,
          comments: data.data.comments
        });
        setView('post');
      } else {
        toast.error(data.message || 'Gönderi yüklenemedi.');
      }
    } catch (error) {
      toast.error('Gönderi yüklenirken bir hata oluştu.');
    }
  };
  
  const handleCreatePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Başlık ve içerik boş olamaz!');
      return;
    }
    if (newPostTitle.trim().length < 5) {
      toast.error('Başlık en az 5 karakter olmalı!');
      return;
    }
    if (newPostContent.trim().length < 10) {
      toast.error('İçerik en az 10 karakter olmalı!');
      return;
    }
    const payload = {
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
    };
    try {
      const response = await api.post('/forum/posts', payload);
      if (response.data.success) {
        toast.success('Konu başarıyla açıldı!');
        setNewPostTitle('');
        setNewPostContent('');
        fetchPosts();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Konu açılırken hata oluştu!');
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Gönderi silindi.');
        if (view === 'post' && selectedPost?._id === postId) {
            setView('list');
            setSelectedPost(null);
        }
        fetchPosts();
      } else {
        toast.error(data.message || 'Gönderi silinemedi.');
      }
    } catch (error) {
      toast.error('Gönderi silinirken bir hata oluştu.');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment) return;

    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Yorum eklendi.');
        setNewComment('');
        if(selectedPost) {
          selectPost(selectedPost._id); // Refresh comments
        }
      } else {
        toast.error(data.message || 'Yorum eklenemedi.');
      }
    } catch (error) {
      toast.error('Yorum eklenirken bir hata oluştu.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost?._id) return;
    if (!window.confirm('Yorumu silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Yorum silindi!');
        selectPost(selectedPost._id);
      } else {
        toast.error(data.message || 'Yorum silinirken hata oluştu.');
      }
    } catch (error) {
      toast.error('Yorum silinirken beklenmeyen bir hata oluştu.');
    }
  };
  
  const canModify = (authorId?: string) => {
    if (!isAuthenticated || !user || !authorId) return false;
    return user.role === 'admin' || user._id === authorId;
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString("tr-TR", options);
  };
  
  const renderContent = () => {
    if (isLoading || loadingPosts) {
      return <div className="text-center p-8">Yükleniyor...</div>;
    }

    switch (view) {
      case 'list':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold">Forum</h1>
              {isAuthenticated && (
                <button onClick={() => setView('new-post')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center">
                  <Plus size={18} className="mr-2" /> Yeni Konu Aç
                </button>
              )}
            </div>
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post._id} className="bg-gray-800 p-4 rounded-lg flex items-start space-x-4">
                  <div className="flex-1 cursor-pointer" onClick={() => selectPost(post._id)}>
                    <h2 className="text-xl font-semibold text-white">{post.title}</h2>
                    <div className="flex items-center text-xs text-gray-400 mt-2">
                      <User size={14} className="mr-1" />
                      <span>{post.author ? post.author.name : 'Bilinmeyen Kullanıcı'}</span>
                      <Clock size={14} className="ml-4 mr-1" />
                      <span>{formatDate(post.createdAt)}</span>
                      <MessageCircle size={14} className="ml-4 mr-1" />
                      <span>{post.commentCount}</span>
                    </div>
                  </div>
                  {canModify(post.author?._id) && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }} className="text-red-500 hover:text-red-400">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'post':
        if (!selectedPost) return <div className="text-center p-8">Gönderi bulunamadı.</div>;
        return (
          <div>
            <button onClick={() => setView('list')} className="mb-4 flex items-center text-blue-400 hover:text-blue-300">
              <ArrowLeft size={18} className="mr-2" /> Foruma Geri Dön
            </button>
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">{selectedPost.title}</h1>
                        <div className="flex items-center text-sm text-gray-400 mt-2">
                          <User size={14} className="mr-1" />
                          <span>{selectedPost.author ? selectedPost.author.name : 'Bilinmeyen Kullanıcı'}</span>
                          <Clock size={14} className="ml-4 mr-1" />
                          <span>{formatDate(selectedPost.createdAt)}</span>
                        </div>
                    </div>
                    {canModify(selectedPost.author?._id) && (
                        <button onClick={() => handleDeletePost(selectedPost._id)} className="text-red-500 hover:text-red-400">
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
              <p className="mt-4 text-gray-300 whitespace-pre-wrap">{selectedPost.content}</p>
            </div>
            
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-4">Yorumlar ({selectedPost.comments.length})</h2>
              {isAuthenticated && (
                <div className="mt-4">
                    <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded-md text-white"
                    placeholder="Yorumunuzu yazın..."
                    rows={3}
                    />
                    <button onClick={() => handleAddComment(selectedPost._id)} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Yorum Yap
                    </button>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {selectedPost.comments.map(comment => (
                  <div key={comment._id} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{comment.author ? comment.author.name : 'Bilinmeyen Kullanıcı'}</p>
                            <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                        </div>
                        {canModify(comment.author?._id) && (
                          <button onClick={() => handleDeleteComment(comment._id)} className="text-red-500 hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        )}
                    </div>
                    <p className="mt-2 text-gray-300">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'new-post':
        return (
          <div>
            <button onClick={() => setView('list')} className="mb-4 flex items-center text-blue-400 hover:text-blue-300">
                <ArrowLeft size={18} className="mr-2" /> Vazgeç
            </button>
            <form onSubmit={handleCreatePost} className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Yeni Konu Oluştur</h2>
              <div className="mb-4">
                <label htmlFor="post-title" className="block text-sm font-medium text-gray-300 mb-1">Başlık</label>
                <input
                  id="post-title"
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded-md text-white"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="post-content" className="block text-sm font-medium text-gray-300 mb-1">İçerik</label>
                <textarea
                  id="post-content"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded-md text-white"
                  rows={10}
                />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Konuyu Yayınla
              </button>
            </form>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-white">
      {renderContent()}
    </div>
  );
};

export default Forum; 