import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import BibliotecaMidia from '@/components/design/BibliotecaMidia'
import { useProjectStore } from '@/store/projectStore'

/**
 * Grupo C do design system: fundo branco com acentos vinho.
 *
 * A página inteira era interface de mentira — arquivos, pastas e contagens
 * escritos no código, e nada do que se enviasse ficava guardado. O modelo
 * MediaAsset já existia no banco e nunca tinha sido ligado a nada.
 */
export default function LibraryPage() {
  const { activeProject } = useProjectStore()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Biblioteca de Conteúdo</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Arquivos de {activeProject?.name ?? 'nenhum projeto selecionado'} — enviados uma vez, reusados em qualquer post.
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
        <BibliotecaMidia />
      </div>
    </motion.div>
  )
}
