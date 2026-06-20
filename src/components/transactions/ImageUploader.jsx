import { useCallback, useState } from 'react'
import { Camera, X, Upload, Loader } from 'lucide-react'
import { compressImage, base64SizeKB } from '../../utils/imageCompress'
import toast from 'react-hot-toast'

// Foto struk disimpan sebagai teks base64 terkompresi langsung di Firestore.
// Ini sengaja TIDAK memakai Firebase Storage, karena sejak akhir 2024 Storage
// versi gratis (Spark) sudah tidak tersedia untuk project baru — wajib upgrade
// ke Blaze. Dengan kompresi ke ~600px & kualitas JPEG diturunkan, setiap foto
// hanya berukuran puluhan-ratusan KB, jauh di bawah limit 1MB per dokumen
// Firestore, dan tetap 100% gratis di paket Spark.

export default function ImageUploader({ value, onChange }) {
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState(value)
  const [sizeKB, setSizeKB] = useState(value ? base64SizeKB(value) : 0)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) return toast.error('Ukuran file asli maksimal 15MB')

    setProcessing(true)
    try {
      const compressed = await compressImage(file)
      setPreview(compressed)
      setSizeKB(base64SizeKB(compressed))
      onChange(compressed)
      toast.success('Foto struk berhasil ditambahkan')
    } catch (e) {
      toast.error(e.message || 'Gagal memproses gambar')
    } finally {
      setProcessing(false)
    }
  }, [onChange])

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-cu-muted" />
          <span className="text-cu-subtext text-sm">Foto Struk</span>
        </div>
        {preview && <span className="text-cu-muted text-xs">~{sizeKB} KB</span>}
      </div>

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Struk" className="w-full h-40 object-cover rounded-xl" />
          <button
            onClick={() => { setPreview(null); setSizeKB(0); onChange(null) }}
            className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-cu-border rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all ${processing ? 'opacity-50' : ''}`}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={processing}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {processing ? <Loader size={24} className="text-cu-muted animate-spin" /> : <Upload size={24} className="text-cu-muted" />}
          <span className="text-cu-muted text-sm">{processing ? 'Mengompres foto...' : 'Ambil foto atau pilih dari galeri'}</span>
        </label>
      )}
    </div>
  )
}
