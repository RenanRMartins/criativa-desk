import { useState, useCallback, useRef } from 'react'
import type { CopyType } from '@/types'

interface GenerateOptions {
  projectId: string
  type: CopyType
  context: string
  postId?: string
}

export function useCopyDesk() {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (options: GenerateOptions) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setOutput('')
    setLoading(true)
    setError(null)

    try {
      const token = (() => {
        try {
          const s = localStorage.getItem('criativa-desk-auth')
          return s ? (JSON.parse(s)?.state?.token ?? '') : ''
        } catch {
          return ''
        }
      })()

      const res = await fetch('/api/copydesk/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(options),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6))
              if (json.type === 'content_block_delta' && json.delta?.text) {
                setOutput((prev) => prev + json.delta.text)
              } else if (json.type === 'error') {
                setError(json.message)
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  return { output, loading, error, generate, cancel, setOutput }
}
