import Dexie from 'dexie'

export const localDB = new Dexie('CerdasUangDB')

localDB.version(1).stores({
  transactions: '++id, type, date, accountId, categoryId, amount, tags, synced, updatedAt',
  accounts: '++id, type, name, synced, updatedAt',
  categories: '++id, parentId, type, name, synced',
  tags: '++id, name, groupId, synced',
  tagGroups: '++id, name, synced',
  budgets: '++id, categoryId, period, month, year, synced',
  goals: '++id, name, deadline, synced',
  goalDeposits: '++id, goalId, date, amount, synced',
  templates: '++id, name, type, synced',
  drafts: '++id, type, savedAt',
  settings: 'key',
  syncQueue: '++id, collection, docId, action, data, createdAt'
})

// Seed default categories
export async function seedDefaultData() {
  const count = await localDB.categories.count()
  if (count > 0) return

  const now = Date.now()
  const defaultCategories = [
    // Pengeluaran
    { id: 'exp-makanan', parentId: null, type: 'expense', name: 'Makanan & Minuman', icon: '🍽️', color: '#f97316', synced: true },
    { id: 'exp-makan-resto', parentId: 'exp-makanan', type: 'expense', name: 'Restoran', icon: '🍜', color: '#f97316', synced: true },
    { id: 'exp-makan-warung', parentId: 'exp-makanan', type: 'expense', name: 'Warung/Warteg', icon: '🥘', color: '#f97316', synced: true },
    { id: 'exp-makan-grabfood', parentId: 'exp-makanan', type: 'expense', name: 'GrabFood/GoFood', icon: '🛵', color: '#f97316', synced: true },
    { id: 'exp-makan-kopi', parentId: 'exp-makanan', type: 'expense', name: 'Kopi & Minuman', icon: '☕', color: '#f97316', synced: true },

    { id: 'exp-transportasi', parentId: null, type: 'expense', name: 'Transportasi', icon: '🚗', color: '#3b82f6', synced: true },
    { id: 'exp-trans-bensin', parentId: 'exp-transportasi', type: 'expense', name: 'Bensin', icon: '⛽', color: '#3b82f6', synced: true },
    { id: 'exp-trans-ojek', parentId: 'exp-transportasi', type: 'expense', name: 'Ojek Online', icon: '🛵', color: '#3b82f6', synced: true },
    { id: 'exp-trans-angkot', parentId: 'exp-transportasi', type: 'expense', name: 'Angkot/Bus', icon: '🚌', color: '#3b82f6', synced: true },
    { id: 'exp-trans-parkir', parentId: 'exp-transportasi', type: 'expense', name: 'Parkir', icon: '🅿️', color: '#3b82f6', synced: true },

    { id: 'exp-belanja', parentId: null, type: 'expense', name: 'Belanja', icon: '🛒', color: '#8b5cf6', synced: true },
    { id: 'exp-belanja-grocery', parentId: 'exp-belanja', type: 'expense', name: 'Groceries', icon: '🧺', color: '#8b5cf6', synced: true },
    { id: 'exp-belanja-fashion', parentId: 'exp-belanja', type: 'expense', name: 'Pakaian', icon: '👕', color: '#8b5cf6', synced: true },
    { id: 'exp-belanja-online', parentId: 'exp-belanja', type: 'expense', name: 'Online Shop', icon: '📦', color: '#8b5cf6', synced: true },

    { id: 'exp-tagihan', parentId: null, type: 'expense', name: 'Tagihan & Utilitas', icon: '📋', color: '#ef4444', synced: true },
    { id: 'exp-tagihan-listrik', parentId: 'exp-tagihan', type: 'expense', name: 'Listrik (PLN)', icon: '💡', color: '#ef4444', synced: true },
    { id: 'exp-tagihan-air', parentId: 'exp-tagihan', type: 'expense', name: 'Air (PDAM)', icon: '💧', color: '#ef4444', synced: true },
    { id: 'exp-tagihan-internet', parentId: 'exp-tagihan', type: 'expense', name: 'Internet', icon: '🌐', color: '#ef4444', synced: true },
    { id: 'exp-tagihan-hp', parentId: 'exp-tagihan', type: 'expense', name: 'Pulsa/Paket Data', icon: '📱', color: '#ef4444', synced: true },
    { id: 'exp-tagihan-kos', parentId: 'exp-tagihan', type: 'expense', name: 'Kos/Sewa', icon: '🏠', color: '#ef4444', synced: true },

    { id: 'exp-hiburan', parentId: null, type: 'expense', name: 'Hiburan', icon: '🎮', color: '#ec4899', synced: true },
    { id: 'exp-hibur-streaming', parentId: 'exp-hiburan', type: 'expense', name: 'Streaming', icon: '📺', color: '#ec4899', synced: true },
    { id: 'exp-hibur-game', parentId: 'exp-hiburan', type: 'expense', name: 'Game', icon: '🎮', color: '#ec4899', synced: true },
    { id: 'exp-hibur-bioskop', parentId: 'exp-hiburan', type: 'expense', name: 'Bioskop', icon: '🎬', color: '#ec4899', synced: true },

    { id: 'exp-kesehatan', parentId: null, type: 'expense', name: 'Kesehatan', icon: '🏥', color: '#14b8a6', synced: true },
    { id: 'exp-kes-dokter', parentId: 'exp-kesehatan', type: 'expense', name: 'Dokter', icon: '👨‍⚕️', color: '#14b8a6', synced: true },
    { id: 'exp-kes-obat', parentId: 'exp-kesehatan', type: 'expense', name: 'Obat-obatan', icon: '💊', color: '#14b8a6', synced: true },
    { id: 'exp-kes-gym', parentId: 'exp-kesehatan', type: 'expense', name: 'Gym/Olahraga', icon: '🏋️', color: '#14b8a6', synced: true },

    { id: 'exp-pendidikan', parentId: null, type: 'expense', name: 'Pendidikan', icon: '📚', color: '#f59e0b', synced: true },
    { id: 'exp-lain', parentId: null, type: 'expense', name: 'Lain-lain', icon: '💸', color: '#64748b', synced: true },

    // Pemasukan
    { id: 'inc-gaji', parentId: null, type: 'income', name: 'Gaji', icon: '💼', color: '#10b981', synced: true },
    { id: 'inc-gaji-pokok', parentId: 'inc-gaji', type: 'income', name: 'Gaji Pokok', icon: '💰', color: '#10b981', synced: true },
    { id: 'inc-gaji-bonus', parentId: 'inc-gaji', type: 'income', name: 'Bonus', icon: '🎁', color: '#10b981', synced: true },
    { id: 'inc-gaji-thr', parentId: 'inc-gaji', type: 'income', name: 'THR', icon: '🎊', color: '#10b981', synced: true },
    { id: 'inc-freelance', parentId: null, type: 'income', name: 'Freelance', icon: '💻', color: '#34d399', synced: true },
    { id: 'inc-bisnis', parentId: null, type: 'income', name: 'Bisnis', icon: '🏪', color: '#6ee7b7', synced: true },
    { id: 'inc-investasi', parentId: null, type: 'income', name: 'Investasi', icon: '📈', color: '#a7f3d0', synced: true },
    { id: 'inc-invest-dividen', parentId: 'inc-investasi', type: 'income', name: 'Dividen', icon: '💹', color: '#a7f3d0', synced: true },
    { id: 'inc-invest-bunga', parentId: 'inc-investasi', type: 'income', name: 'Bunga/Return', icon: '🏦', color: '#a7f3d0', synced: true },
    { id: 'inc-hadiah', parentId: null, type: 'income', name: 'Hadiah', icon: '🎀', color: '#fbbf24', synced: true },
    { id: 'inc-lain', parentId: null, type: 'income', name: 'Pemasukan Lain', icon: '💵', color: '#64748b', synced: true },
  ]

  await localDB.categories.bulkAdd(defaultCategories)

  // Default accounts
  const defaultAccounts = [
    { id: 'acc-kas', type: 'cash', name: 'Dompet', icon: '👛', color: '#f59e0b', balance: 0, currency: 'IDR', isArchived: false, order: 0, synced: true },
    { id: 'acc-bca', type: 'bank', name: 'BCA', icon: '🏦', color: '#0066b2', balance: 0, currency: 'IDR', bankName: 'BCA', isArchived: false, order: 1, synced: true },
    { id: 'acc-gopay', type: 'ewallet', name: 'GoPay', icon: '💚', color: '#00AA13', balance: 0, currency: 'IDR', isArchived: false, order: 2, synced: true },
    { id: 'acc-ovo', type: 'ewallet', name: 'OVO', icon: '💜', color: '#4c3494', balance: 0, currency: 'IDR', isArchived: false, order: 3, synced: true },
  ]

  await localDB.accounts.bulkAdd(defaultAccounts)
}

export default localDB
