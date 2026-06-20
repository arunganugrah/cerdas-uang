import { useEffect } from 'react'
import { getMessagingInstance } from '../firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import toast from 'react-hot-toast'

/**
 * Hook untuk setup Firebase Cloud Messaging (push notification gratis)
 * Panggil sekali di komponen App setelah user login
 */
export function useFCM(userId) {
  useEffect(() => {
    if (!userId) return

    let unsubscribe = null

    async function setup() {
      try {
        const messaging = await getMessagingInstance()
        if (!messaging) return // browser tidak support (misal Safari lama)

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        })

        if (token) {
          await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true })
        }

        unsubscribe = onMessage(messaging, (payload) => {
          toast(payload.notification?.body || 'Notifikasi baru', {
            icon: '🔔',
            duration: 5000
          })
        })
      } catch (e) {
        console.warn('FCM setup gagal (mungkin tidak didukung browser ini):', e.message)
      }
    }

    setup()
    return () => unsubscribe?.()
  }, [userId])
}
