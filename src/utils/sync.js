import { db } from '../firebase'
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore'
import localDB from '../db'

const COLLECTIONS = ['transactions', 'accounts', 'categories', 'budgets', 'goals', 'goalDeposits', 'templates', 'tags', 'settings']

// ============================================================
// QUEUE OFFLINE OPERATIONS
// ============================================================
export async function queueSync(collectionName, docId, action, data) {
  await localDB.syncQueue.add({
    collection: collectionName,
    docId,
    action, // 'set' | 'delete'
    data,
    createdAt: Date.now()
  })
}

// ============================================================
// PROCESS SYNC QUEUE (call when online)
// ============================================================
export async function processSyncQueue(userId) {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  const queue = await localDB.syncQueue.toArray()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  const batch = writeBatch(db)
  const processedIds = []
  let failed = 0

  for (const item of queue) {
    try {
      const ref = doc(db, `users/${userId}/${item.collection}`, item.docId)
      if (item.action === 'delete') {
        batch.delete(ref)
      } else {
        batch.set(ref, { ...item.data, syncedAt: serverTimestamp() }, { merge: true })
      }
      processedIds.push(item.id)
    } catch (e) {
      failed++
    }
  }

  try {
    await batch.commit()
    await localDB.syncQueue.bulkDelete(processedIds)
    // Mark local records as synced
    await localDB.transactions.where('synced').equals(false).modify({ synced: true })
    await localDB.accounts.where('synced').equals(false).modify({ synced: true })
    return { synced: processedIds.length, failed }
  } catch (e) {
    console.error('Sync batch failed:', e)
    return { synced: 0, failed: queue.length }
  }
}

// ============================================================
// PUSH LOCAL → FIRESTORE
// ============================================================
export async function pushTransaction(userId, transaction) {
  const id = transaction.id || `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const data = { ...transaction, id, updatedAt: Date.now() }

  // Always save locally first
  await localDB.transactions.put({ ...data, synced: false })

  // Try Firebase, otherwise queue
  if (navigator.onLine) {
    try {
      await setDoc(doc(db, `users/${userId}/transactions`, id), { ...data, syncedAt: serverTimestamp() })
      await localDB.transactions.update(id, { synced: true })
    } catch {
      await queueSync('transactions', id, 'set', data)
    }
  } else {
    await queueSync('transactions', id, 'set', data)
  }
  return id
}

export async function pushAccount(userId, account) {
  const id = account.id || `acc_${Date.now()}`
  const data = { ...account, id, updatedAt: Date.now() }

  await localDB.accounts.put({ ...data, synced: false })

  if (navigator.onLine) {
    try {
      await setDoc(doc(db, `users/${userId}/accounts`, id), data, { merge: true })
      await localDB.accounts.update(id, { synced: true })
    } catch {
      await queueSync('accounts', id, 'set', data)
    }
  } else {
    await queueSync('accounts', id, 'set', data)
  }
  return id
}

export async function pushBudget(userId, budget) {
  const id = budget.id || `bud_${Date.now()}`
  const data = { ...budget, id, updatedAt: Date.now() }
  await localDB.budgets.put({ ...data, synced: false })
  if (navigator.onLine) {
    try {
      await setDoc(doc(db, `users/${userId}/budgets`, id), data, { merge: true })
    } catch {
      await queueSync('budgets', id, 'set', data)
    }
  } else {
    await queueSync('budgets', id, 'set', data)
  }
  return id
}

export async function pushGoal(userId, goal) {
  const id = goal.id || `goal_${Date.now()}`
  const data = { ...goal, id, updatedAt: Date.now() }
  await localDB.goals.put({ ...data, synced: false })
  if (navigator.onLine) {
    try {
      await setDoc(doc(db, `users/${userId}/goals`, id), data, { merge: true })
    } catch {
      await queueSync('goals', id, 'set', data)
    }
  } else {
    await queueSync('goals', id, 'set', data)
  }
  return id
}

// ============================================================
// PULL FIRESTORE → LOCAL (full sync on login)
// ============================================================
export async function pullFromFirestore(userId) {
  if (!navigator.onLine) return

  try {
    for (const col of COLLECTIONS) {
      const snap = await getDocs(collection(db, `users/${userId}/${col}`))
      if (snap.empty) continue

      const items = snap.docs.map(d => ({ ...d.data(), synced: true }))

      if (col === 'transactions') await localDB.transactions.bulkPut(items)
      else if (col === 'accounts') await localDB.accounts.bulkPut(items)
      else if (col === 'categories') await localDB.categories.bulkPut(items)
      else if (col === 'budgets') await localDB.budgets.bulkPut(items)
      else if (col === 'goals') await localDB.goals.bulkPut(items)
      else if (col === 'goalDeposits') await localDB.goalDeposits.bulkPut(items)
      else if (col === 'templates') await localDB.templates.bulkPut(items)
    }
  } catch (e) {
    console.error('Pull from Firestore failed:', e)
  }
}

// ============================================================
// DELETE WITH SYNC
// ============================================================
export async function deleteTransaction(userId, transactionId) {
  await localDB.transactions.delete(transactionId)
  if (navigator.onLine) {
    try {
      await deleteDoc(doc(db, `users/${userId}/transactions`, transactionId))
    } catch {
      await queueSync('transactions', transactionId, 'delete', null)
    }
  } else {
    await queueSync('transactions', transactionId, 'delete', null)
  }
}
