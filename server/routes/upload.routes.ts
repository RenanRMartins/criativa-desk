import { Router, type Response } from 'express'
import multer from 'multer'
import { cloudinary } from '../services/cloudinary.service'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'Nenhum arquivo enviado' }); return }

  const resourceType = req.file.mimetype.startsWith('video') ? 'video' : 'image'

  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: resourceType as 'video' | 'image', folder: 'criativa-desk' },
        (error, data) => { if (error) reject(error); else resolve(data as Record<string, unknown>) }
      ).end(req.file!.buffer)
    })

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    })
  } catch (err) {
    res.status(500).json({ message: 'Erro ao fazer upload', error: String(err) })
  }
})

export default router
