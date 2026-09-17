// exportado porque o CopyDesk usa fetch cru (streaming SSE) e precisa da mesma
// base — com caminho relativo ele batia na Vercel em produção e voltava 405
export const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

function getToken(): string | null {
  try {
    const auth = localStorage.getItem('criativa-desk-auth')
    if (!auth) return null
    const parsed = JSON.parse(auth)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    // "Request failed" sozinho escondia até o código HTTP: quando o servidor
    // devolve página de erro em vez de JSON, era isso que chegava na tela.
    const corpo = await res.text().catch(() => '')
    let mensagem = ''
    try { mensagem = (JSON.parse(corpo) as { message?: string }).message ?? '' } catch { /* não é JSON */ }
    throw new Error(mensagem || `HTTP ${res.status} em ${path}${corpo ? ` — ${corpo.slice(0, 200)}` : ''}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<T>
      })
  },
}
