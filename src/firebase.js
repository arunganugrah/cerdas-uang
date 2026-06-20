import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

// Ganti dengan konfigurasi Firebase project Anda dari Firebase Console
// https://console.firebase.google.com → Project Settings → Your apps
//
// Catatan: aplikasi ini TIDAK memakai Firebase Storage, karena sejak akhir
// 2024 Storage versi gratis (Spark) sudah tidak tersedia untuk project baru.
// Foto struk disimpan sebagai teks base64 terkompresi langsung di Firestore
// (lihat src/utils/imageCompress.js) — tetap 100% gratis.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser')
  }
})

// Firebase Cloud Messaging (untuk notifikasi push - gratis)
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}

export default app
