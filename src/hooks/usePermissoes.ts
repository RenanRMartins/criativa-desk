import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'

/**
 * O que a pessoa pode fazer no projeto ativo. Vem calculado do servidor —
 * duplicar a regra aqui criaria duas versões divergindo com o tempo.
 *
 * Isto serve só para ESCONDER o que não serve. Quem barra é o backend: um
 * item de menu oculto não protege nada sozinho.
 */
export function usePermissoes() {
  const { token } = useAuthStore()
  const { activeProject } = useProjectStore()
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)

  const ehDemo = !token || token.startsWith('demo-token')

  useEffect(() => {
    // no modo demonstração não há servidor para consultar; libera tudo para a
    // tela não aparecer quebrada com dados de exemplo
    if (ehDemo || !activeProject?.id) {
      setPermissoes([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    api.get<{ permissoes: string[] }>(`/acessos/minhas?projectId=${activeProject.id}`)
      .then(r => setPermissoes(r.permissoes))
      .catch(() => setPermissoes([]))
      .finally(() => setCarregando(false))
  }, [activeProject?.id, token, ehDemo])

  return {
    permissoes,
    carregando,
    // enquanto carrega, ou sem servidor, não escondemos nada: piscar o menu a
    // cada troca de projeto é pior que mostrar um item que dará 403 ao abrir
    pode: (chave: string) => ehDemo || carregando || permissoes.includes(chave),
  }
}
