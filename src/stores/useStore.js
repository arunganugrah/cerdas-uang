import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import localDB, { seedDefaultData } from '../db'
import { pushTransaction, pushAccount, pushBudget, pushGoal, pullFromFirestore, processSyncQueue, deleteTransaction } from '../utils/sync'
import { calculateHealthScore, predictCashflow, generateMonthlyReview } from '../utils/finance'
import { startOfMonth, subMonths } from 'date-fns'

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── Auth ───────────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),

      // ─── UI ─────────────────────────────────────────────
      theme: 'light',
      language: 'id',
      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isLoading: false,
      setLoading: (v) => set({ isLoading: v }),

      // ─── Quick Input ─────────────────────────────────────
      showQuickInput: false,
      setShowQuickInput: (v) => set({ showQuickInput: v }),
      nlpDraft: null,
      setNlpDraft: (draft) => set({ nlpDraft: draft }),

      // ─── Data ────────────────────────────────────────────
      transactions: [],
      accounts: [],
      categories: [],
      budgets: [],
      goals: [],
      goalDeposits: [],
      templates: [],
      tags: [],

      // ─── Load all data from IndexedDB ────────────────────
      loadAllData: async () => {
        set({ isLoading: true })
        await seedDefaultData()
        const [transactions, accounts, categories, budgets, goals, goalDeposits, templates, tags] = await Promise.all([
          localDB.transactions.orderBy('date').reverse().toArray(),
          localDB.accounts.toArray(),
          localDB.categories.toArray(),
          localDB.budgets.toArray(),
          localDB.goals.toArray(),
          localDB.goalDeposits.toArray(),
          localDB.templates.toArray(),
          localDB.tags.toArray()
        ])

        // Calculate budget spending
        const now = new Date()
        const monthStart = startOfMonth(now).getTime()
        const budgetsWithSpent = budgets.map(b => {
          const spent = transactions.filter(t =>
            t.type === 'expense' &&
            t.categoryId === b.categoryId &&
            new Date(t.date).getTime() >= monthStart
          ).reduce((s, t) => s + t.amount, 0)
          return { ...b, spent }
        })

        // Calculate goal savings
        const goalsWithSaved = goals.map(g => {
          const saved = goalDeposits.filter(d => d.goalId === g.id).reduce((s, d) => s + d.amount, 0)
          return { ...g, saved }
        })

        set({ transactions, accounts, categories, budgets: budgetsWithSpent, goals: goalsWithSaved, goalDeposits, templates, tags, isLoading: false })
      },

      // ─── TRANSACTIONS ─────────────────────────────────────
      addTransaction: async (txnData) => {
        const { user, accounts } = get()
        const id = await pushTransaction(user?.uid || 'local', txnData)
        const newTxn = { ...txnData, id }

        // Update account balance
        if (txnData.type === 'expense') {
          await get().updateAccountBalance(txnData.accountId, -txnData.amount)
        } else if (txnData.type === 'income') {
          await get().updateAccountBalance(txnData.accountId, txnData.amount)
        } else if (txnData.type === 'transfer') {
          await get().updateAccountBalance(txnData.fromAccountId, -txnData.amount)
          await get().updateAccountBalance(txnData.toAccountId, txnData.amount)
        }

        set(s => ({ transactions: [newTxn, ...s.transactions] }))
        get().refreshDerivedData()
        return id
      },

      editTransaction: async (id, updates) => {
        const { user } = get()
        await localDB.transactions.update(id, updates)
        await pushTransaction(user?.uid || 'local', { id, ...updates })
        set(s => ({ transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t) }))
        get().refreshDerivedData()
      },

      removeTransaction: async (id) => {
        const { user } = get()
        await deleteTransaction(user?.uid || 'local', id)
        set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }))
        get().refreshDerivedData()
      },

      // ─── ACCOUNTS ────────────────────────────────────────
      addAccount: async (accountData) => {
        const { user } = get()
        const id = await pushAccount(user?.uid || 'local', accountData)
        const newAcc = { ...accountData, id }
        set(s => ({ accounts: [...s.accounts, newAcc] }))
        return id
      },

      updateAccountBalance: async (accountId, delta) => {
        const acc = get().accounts.find(a => a.id === accountId)
        if (!acc) return
        const newBalance = (acc.balance || 0) + delta
        await localDB.accounts.update(accountId, { balance: newBalance })
        set(s => ({ accounts: s.accounts.map(a => a.id === accountId ? { ...a, balance: newBalance } : a) }))
      },

      archiveAccount: async (id) => {
        await localDB.accounts.update(id, { isArchived: true })
        set(s => ({ accounts: s.accounts.map(a => a.id === id ? { ...a, isArchived: true } : a) }))
      },
      updateAccount: async (id, updates) => {
        await localDB.accounts.update(id, updates)
        set(s => ({
          accounts: s.accounts.map(a => a.id === id ? { ...a, ...updates } : a)
        }))
      },

      deleteAccount: async (id) => {
        await localDB.accounts.delete(id)
        set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }))
      },

      // ─── BUDGETS ─────────────────────────────────────────
      addBudget: async (budgetData) => {
        const { user } = get()
        const id = await pushBudget(user?.uid || 'local', budgetData)
        set(s => ({ budgets: [...s.budgets, { ...budgetData, id, spent: 0 }] }))
        return id
      },
      updateBudget: async (id, updates) => {
        await localDB.budgets.update(id, updates)
        set(s => ({
          budgets: s.budgets.map(b => b.id === id ? { ...b, ...updates } : b)
        }))
      },

      deleteBudget: async (id) => {
        await localDB.budgets.delete(id)
        set(s => ({ budgets: s.budgets.filter(b => b.id !== id) }))
      },

      // ─── GOALS ───────────────────────────────────────────
      addGoal: async (goalData) => {
        const { user } = get()
        const id = await pushGoal(user?.uid || 'local', goalData)
        set(s => ({ goals: [...s.goals, { ...goalData, id, saved: 0 }] }))
        return id
      },

      depositToGoal: async (goalId, amount, note) => {
        const deposit = { id: `dep_${Date.now()}`, goalId, amount, note, date: new Date().toISOString() }
        await localDB.goalDeposits.add(deposit)
        set(s => ({
          goals: s.goals.map(g => g.id === goalId ? { ...g, saved: (g.saved || 0) + amount } : g),
          goalDeposits: [...s.goalDeposits, deposit]
        }))
      },
      updateGoal: async (id, updates) => {
        await localDB.goals.update(id, updates)
        set(s => ({
          goals: s.goals.map(g => g.id === id ? { ...g, ...updates } : g)
        }))
      },

      deleteGoal: async (id) => {
        await localDB.goals.delete(id)
        // Hapus juga deposit terkait
        await localDB.goalDeposits.where('goalId').equals(id).delete()
        set(s => ({
          goals: s.goals.filter(g => g.id !== id),
          goalDeposits: s.goalDeposits.filter(d => d.goalId !== id)
        }))
      },

      // ─── TEMPLATES ────────────────────────────────────────
      saveAsTemplate: async (txnData, templateName) => {
        const template = { id: `tpl_${Date.now()}`, name: templateName, ...txnData, synced: false }
        await localDB.templates.add(template)
        set(s => ({ templates: [...s.templates, template] }))
      },

      // ─── DRAFT ───────────────────────────────────────────
      saveDraft: async (draftData) => {
        await localDB.drafts.put({ id: 'current', ...draftData, savedAt: Date.now() })
      },

      loadDraft: async () => {
        return await localDB.drafts.get('current')
      },

      clearDraft: async () => {
        await localDB.drafts.delete('current')
      },

      // ─── CATEGORIES ──────────────────────────────────────
      addCategory: async (catData) => {
        const id = `cat_${Date.now()}`
        await localDB.categories.put({ ...catData, id, synced: false })
        set(s => ({ categories: [...s.categories, { ...catData, id }] }))
      },

      // ─── DERIVED DATA ─────────────────────────────────────
      healthScore: null,
      cashflow: null,
      monthlyReview: null,

      refreshDerivedData: () => {
        const { transactions, accounts, budgets, goals } = get()
        const now = new Date()
        const prevMonthStart = startOfMonth(subMonths(now, 1))
        const prevMonthEnd = startOfMonth(now)
        const prevMonthTxns = transactions.filter(t => {
          const d = new Date(t.date)
          return d >= prevMonthStart && d < prevMonthEnd
        })

        const healthScore = calculateHealthScore(transactions, budgets, goals)
        const cashflow = predictCashflow(transactions, accounts, [], 90)
        const monthlyReview = generateMonthlyReview(transactions, budgets, goals, prevMonthTxns)

        set({ healthScore, cashflow, monthlyReview })
      },

      // ─── SYNC ─────────────────────────────────────────────
      syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
      pendingSyncCount: 0,

      syncData: async () => {
        const { user } = get()
        if (!user || !navigator.onLine) return
        set({ syncStatus: 'syncing' })
        try {
          const result = await processSyncQueue(user.uid)
          const pending = await localDB.syncQueue.count()
          set({ syncStatus: 'synced', pendingSyncCount: pending })
        } catch {
          set({ syncStatus: 'error' })
        }
      },

      fullSyncFromCloud: async () => {
        const { user } = get()
        if (!user) return
        await pullFromFirestore(user.uid)
        await get().loadAllData()
      }
    }),
    {
      name: 'cerdas-uang-ui',
      partialize: (s) => ({ theme: s.theme, language: s.language, activeTab: s.activeTab })
    }
  )
)
