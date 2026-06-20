import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../stores/useStore'
import { LayoutDashboard, ArrowLeftRight, Wallet, Target, PieChart, BarChart3, FileText, Settings, Plus, Zap, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import SyncIndicator from './SyncIndicator'
import TransactionFormModal from '../transactions/TransactionFormModal'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { path: '/budget', icon: Target, label: 'Budget' },
  { path: '/charts', icon: PieChart, label: 'Grafik' },
  { path: '/settings', icon: Settings, label: 'Lainnya' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { syncStatus, pendingSyncCount, setShowQuickInput } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <div className="flex flex-col h-screen-safe bg-cu-bg overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-cu-text text-lg tracking-tight">Cerdas Uang</span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs px-2 py-1 rounded-full">
              <WifiOff size={11} />
              <span>Offline</span>
            </div>
          )}
          <SyncIndicator status={syncStatus} pending={pendingSyncCount} />
          {/* NLP Quick Input button */}
          <button
            onClick={() => setShowQuickInput(true)}
            className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs px-3 py-1.5 rounded-full hover:bg-emerald-500/25 transition-all"
          >
            <Zap size={12} />
            <span className="hidden sm:inline">Cepat</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav flex-shrink-0 glass border-t border-cu-border/50">
        <div className="flex items-center justify-around px-2 pt-2">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${active ? 'text-emerald-400' : 'text-cu-muted'}`}>{label}</span>
              </button>
            )
          })}

          {/* FAB - Add transaction */}
          <button
            onClick={() => setShowAddModal(true)}
            className="relative -mt-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-95 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all duration-150"
          >
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {showAddModal && <TransactionFormModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
