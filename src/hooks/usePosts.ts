import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { MOCK_POSTS } from '@/lib/mockData'
import type { Post } from '@/types'

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function usePosts(projectId?: string) {
  const { token } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPosts = useCallback(async () => {
    if (isDemo(token)) {
      const filtered = projectId
        ? MOCK_POSTS.filter(p => p.projectId === projectId)
        : MOCK_POSTS
      setPosts(filtered.length > 0 ? filtered : MOCK_POSTS)
      return
    }
    setLoading(true)
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const data = await api.get<Post[]>(`/posts${query}`)
      setPosts(data.length > 0 ? data : MOCK_POSTS)
    } catch {
      setPosts(MOCK_POSTS)
    } finally {
      setLoading(false)
    }
  }, [token, projectId])

  const createPost = useCallback(async (body: Partial<Post> & { projectId: string; title: string; format: string }) => {
    if (isDemo(token)) {
      const mock: Post = {
        id: `post-${Date.now()}`,
        projectId: body.projectId,
        authorId: 'demo-admin',
        title: body.title,
        format: body.format as Post['format'],
        networks: body.networks ?? [],
        status: body.status ?? 'IDEA',
        caption: body.caption,
        hashtags: body.hashtags ?? [],
        publishDate: body.publishDate,
        scheduledAt: body.scheduledAt,
        theme: body.theme,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setPosts(prev => [...prev, mock])
      return mock
    }
    const data = await api.post<Post>('/posts', body)
    setPosts(prev => [...prev, data])
    return data
  }, [token])

  const updatePost = useCallback(async (id: string, updates: Partial<Post>) => {
    if (isDemo(token)) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      return
    }
    try {
      const data = await api.patch<Post>(`/posts/${id}`, updates)
      setPosts(prev => prev.map(p => p.id === id ? data : p))
    } catch {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    }
  }, [token])

  return { posts, loading, setPosts, fetchPosts, createPost, updatePost }
}
