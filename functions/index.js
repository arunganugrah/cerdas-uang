/**
 * Cerdas Uang - Firebase Cloud Functions
 * Gratis tier: 2.000.000 invocations/bulan, cukup untuk notifikasi terjadwal
 *
 * Deploy: firebase deploy --only functions
 * Pastikan project sudah di-upgrade ke Blaze plan (tetap gratis di bawah limit)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()
const messaging = admin.messaging()

// ============================================================
// 1. CEK BUDGET HARIAN - jalan setiap hari jam 20:00 WIB
// ============================================================
exports.checkBudgetAlerts = onSchedule({
  schedule: '0 20 * * *',
  timeZone: 'Asia/Jakarta',
  region: 'asia-southeast2'
}, async () => {
  const usersSnap = await db.collection('users').get()

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const fcmToken = userDoc.data().fcmToken
    if (!fcmToken) continue

    const budgetsSnap = await db.collection(`users/${userId}/budgets`).where('period', '==', 'monthly').get()

    for (const budgetDoc of budgetsSnap.docs) {
      const budget = budgetDoc.data()
      const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0

      if (pct >= 80 && pct < 100 && !budget.alertSent80) {
        await sendNotification(fcmToken, '⚠️ Budget Hampir Habis', `Budget kategori sudah terpakai ${Math.round(pct)}%`)
        await budgetDoc.ref.update({ alertSent80: true })
      } else if (pct >= 100 && !budget.alertSent100) {
        await sendNotification(fcmToken, '🔴 Budget Terlampaui!', `Budget kategori sudah melebihi limit`)
        await budgetDoc.ref.update({ alertSent100: true })
      }
    }
  }
})

// ============================================================
// 2. PENGINGAT TAGIHAN JATUH TEMPO - jalan setiap hari jam 09:00
// ============================================================
exports.checkBillReminders = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'Asia/Jakarta',
  region: 'asia-southeast2'
}, async () => {
  const usersSnap = await db.collection('users').get()
  const today = new Date().getDate()

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const fcmToken = userDoc.data().fcmToken
    if (!fcmToken) continue

    // Cek kartu kredit dengan jatuh tempo 3 hari ke depan
    const accountsSnap = await db.collection(`users/${userId}/accounts`).where('type', '==', 'credit').get()
    for (const accDoc of accountsSnap.docs) {
      const acc = accDoc.data()
      if (!acc.dueDate) continue
      const daysUntilDue = (Number(acc.dueDate) - today + 31) % 31
      if (daysUntilDue === 3) {
        await sendNotification(fcmToken, '💳 Tagihan Akan Jatuh Tempo', `${acc.name} jatuh tempo 3 hari lagi`)
      }
    }

    // Cek transaksi terjadwal yang akan datang
    const scheduledSnap = await db.collection(`users/${userId}/scheduledTransactions`).get()
    for (const stDoc of scheduledSnap.docs) {
      const st = stDoc.data()
      const nextDate = new Date(st.nextDate)
      const daysUntil = Math.ceil((nextDate - new Date()) / 86400000)
      if (daysUntil === 1) {
        await sendNotification(fcmToken, '📅 Transaksi Terjadwal Besok', `${st.note || 'Transaksi'} sebesar Rp${st.amount.toLocaleString('id-ID')}`)
      }
    }
  }
})

// ============================================================
// 3. NOTIFIKASI TRANSAKSI BESAR/TIDAK BIASA - trigger on create
// ============================================================
exports.detectUnusualSpending = onDocumentCreated('users/{userId}/transactions/{txnId}', async (event) => {
  const txn = event.data.data()
  const userId = event.params.userId
  if (txn.type !== 'expense') return

  const userDoc = await db.collection('users').doc(userId).get()
  const fcmToken = userDoc.data()?.fcmToken
  if (!fcmToken) return

  // Hitung rata-rata pengeluaran kategori ini dalam 3 bulan terakhir
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const historySnap = await db.collection(`users/${userId}/transactions`)
    .where('categoryId', '==', txn.categoryId)
    .where('type', '==', 'expense')
    .where('date', '>=', threeMonthsAgo.toISOString())
    .get()

  const amounts = historySnap.docs.map(d => d.data().amount).filter(a => a !== txn.amount)
  if (amounts.length < 3) return // butuh data historis cukup

  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length

  if (txn.amount > avg * 2.5) {
    await sendNotification(
      fcmToken,
      '👀 Pengeluaran Tidak Biasa',
      `Transaksi Rp${txn.amount.toLocaleString('id-ID')} lebih besar dari rata-rata biasanya (Rp${Math.round(avg).toLocaleString('id-ID')})`
    )
  }
})

// ============================================================
// 4. MONTHLY REVIEW NOTIFICATION - tanggal 1 setiap bulan jam 08:00
// ============================================================
exports.sendMonthlyReviewNotif = onSchedule({
  schedule: '0 8 1 * *',
  timeZone: 'Asia/Jakarta',
  region: 'asia-southeast2'
}, async () => {
  const usersSnap = await db.collection('users').get()
  for (const userDoc of usersSnap.docs) {
    const fcmToken = userDoc.data().fcmToken
    if (!fcmToken) continue
    await sendNotification(fcmToken, '📊 Review Bulanan Siap!', 'Lihat bagaimana performa keuanganmu bulan lalu')
  }
})

// ============================================================
// HELPER
// ============================================================
async function sendNotification(token, title, body) {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        notification: { icon: '/icons/icon-192x192.png' },
        fcmOptions: { link: '/' }
      }
    })
  } catch (e) {
    console.error('Gagal mengirim notifikasi:', e.message)
  }
}
