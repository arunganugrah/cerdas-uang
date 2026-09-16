import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './stores/useStore'
import { useFCM } from './hooks/useFCM'

import Layout from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import AccountsPage from './pages/AccountsPage'
import BudgetPage from './pages/BudgetPage'
import GoalsPage from './pages/GoalsPage'
import ChartsPage from './pages/ChartsPage'
import InsightsPage from './pages/InsightsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import QuickInputModal from './components/nlp/QuickInputModal'

function App() {
  const { user, setUser, theme, loadAllData, syncData, showQuickInput } = useStore()
  useFCM(user?.uid)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        loadAllData()
        syncData()
      } else {
        // Load local data even without auth
        loadAllData()
      }
    })
    return unsub
  }, [])

  // Apply theme
  useEffect(() => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
}, [theme])

  // Online/offline sync
  useEffect(() => {
    const handleOnline = () => syncData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user])

  // Quick input shortcut
  const { setShowQuickInput } = useStore()
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowQuickInput(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle PWA quick actions from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quick = params.get('quick')
    if (quick === 'expense' || quick === 'income') {
      setShowQuickInput(true)
    }
  }, [])

  return (
    <>
      <div className={`min-h-screen bg-cu-bg ${theme === 'light' ? 'bg-slate-50 text-slate-900' : ''}`}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="charts" element={<ChartsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showQuickInput && <QuickInputModal />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } }
        }}
      />
    </>
  )
}

export default App
