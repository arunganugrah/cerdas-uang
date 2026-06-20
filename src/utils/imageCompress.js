/**
 * Kompresi gambar di sisi browser sebelum disimpan sebagai base64.
 * Dipakai karena Firebase Storage versi gratis (Spark) sudah tidak tersedia
 * untuk project baru sejak akhir 2024 — solusinya, foto disimpan langsung
 * sebagai teks base64 terkompresi di Firestore (tetap gratis di paket Spark).
 *
 * Firestore membatasi ukuran 1 dokumen maksimal 1MB, jadi kita kompres habis
 * gambar ke ukuran kecil (maks ~500px, kualitas JPEG diturunkan) agar setiap
 * foto struk hanya makan beberapa puluh KB.
 */

const MAX_DIMENSION = 600 // px, sisi terpanjang
const JPEG_QUALITY = 0.6
const MAX_OUTPUT_BYTES = 700 * 1024 // ~700KB, aman di bawah limit 1MB Firestore

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas bukan gambar'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Coba beberapa level kualitas sampai ukurannya cukup kecil
        let quality = JPEG_QUALITY
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        let attempts = 0
        while (dataUrl.length > MAX_OUTPUT_BYTES && quality > 0.2 && attempts < 6) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
          attempts++
        }

        if (dataUrl.length > MAX_OUTPUT_BYTES) {
          reject(new Error('Gambar masih terlalu besar setelah dikompres. Coba foto lain.'))
          return
        }

        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca berkas'))
    reader.readAsDataURL(file)
  })
}

// Estimasi ukuran string base64 dalam KB (untuk ditampilkan ke user bila perlu)
export function base64SizeKB(dataUrl) {
  if (!dataUrl) return 0
  const base64 = dataUrl.split(',')[1] || ''
  return Math.round((base64.length * 0.75) / 1024)
}
