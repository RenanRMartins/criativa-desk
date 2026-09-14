import { CloudOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// O login só cai em token demo quando o backend não respondeu (useAuth.signIn),
// então token demo === servidor inacessível. Sem este aviso a queda do backend
// aparece como dados errados em várias telas, sem explicação.
export default function OfflineBanner() {
  const { token } = useAuthStore()
  if (!token?.startsWith('demo-token')) return null

  return (
    <div
      className="flex items-center gap-2.5 px-8 py-2.5 text-sm"
      style={{ background: '#5A3A12', color: '#FFE9C7' }}
      role="status"
    >
      <CloudOff size={15} className="shrink-0" />
      <span>
        <strong className="font-semibold">Sem conexão com o servidor.</strong>{' '}
        Dados de exemplo — nada é salvo e as integrações (redes sociais, CopyDesk,
        música) não funcionam. Saia e entre de novo quando o servidor voltar.
      </span>
    </div>
  )
}
