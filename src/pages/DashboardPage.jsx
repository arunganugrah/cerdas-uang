import { useEffect, useState } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah, formatDate, relativeDate } from '../utils/nlp'
import { TrendingUp, TrendingDown, ArrowLeftRight, Bell, ChevronRight, Zap, Target, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { startOfMonth } from 'date-fns'
import HealthScoreCard from '../components/charts/HealthScoreCard'
import CashflowMiniChart from '../components/charts/CashflowMiniChart'
import NotificationPanel from '../components/layout/NotificationPanel'

export default function DashboardPage() {
  const { transactions, accounts, categories, budgets, goals, healthScore, cashflow, monthlyReview, refreshDerivedData } = useStore()
  const navigate = useNavigate()
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => { refreshDerivedData() }, [transactions.length])

  const totalBalance = accounts.filter(a => !a.isArchived).reduce((s, a) => s + (a.balance || 0), 0)
  const now = new Date()
  const monthStart = startOfMonth(now)
  const thisMonth = transactions.filter(t => new Date(t.date) >= monthStart)
  const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const recent = transactions.slice(0, 5)

  // Budget alerts
  const budgetAlerts = budgets.filter(b => b.amount > 0 && (b.spent || 0) / b.amount >= 0.8)
  const goalNear = goals.filter(g => !g.isCompleted && g.target > 0 && (g.saved || 0) / g.target >= 0.9)

  const notifCount = budgetAlerts.length + goalNear.length

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      {/* Balance card */}
      <div className="card p-5 bg-gradient-to-br from-emerald-900/40 to-cu-surface border-emerald-800/30">
        <div className="flex items-start justify-between mb-1">
          <div className="text-cu-subtext text-sm">Total Saldo</div>
          <button onClick={() => setShowNotif(true)} className="relative btn-ghost p-1.5">
            <Bell size={18} />
            {notifCount > 0 && (
              <span className="notif-badge">{notifCount}</span>
            )}
          </button>
        </div>
        <div className={`text-3xl font-bold font-mono mb-4 ${totalBalance >= 0 ? 'text-cu-text' : 'text-rose-400'}`}>
          {formatRupiah(totalBalance)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
              <TrendingUp size={12} />
              Pemasukan
            </div>
            <div className="text-emerald-400 font-semibold font-mono text-sm">{formatRupiah(monthIncome, true)}</div>
          </div>
          <div className="bg-rose-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-1">
              <TrendingDown size={12} />
              Pengeluaran
            </div>
            <div className="text-rose-400 font-semibold font-mono text-sm">{formatRupiah(monthExpense, true)}</div>
          </div>
        </div>
      </div>

      {/* Account list (horizontal scroll) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-cu-text font-semibold text-sm">Akun</h2>
          <button onClick={() => navigate('/accounts')} className="text-emerald-400 text-xs flex items-center gap-1">
            Lihat semua <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
          {accounts.filter(a => !a.isArchived).slice(0, 6).map(acc => (
            <div key={acc.id} className="flex-shrink-0 card p-3 min-w-[130px]">
              <div className="text-2xl mb-2">{acc.icon}</div>
              <div className="text-cu-text text-sm font-medium truncate">{acc.name}</div>
              <div className={`font-mono text-sm font-semibold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatRupiah(acc.balance || 0, true)}
              </div>
            </div>
          ))}
          <button onClick={() => navigate('/accounts')} className="flex-shrink-0 card p-3 min-w-[80px] flex flex-col items-center justify-center text-cu-muted hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
            <span className="text-2xl">+</span>
            <span className="text-xs mt-1">Tambah</span>
          </button>
        </div>
      </div>

      {/* Health Score + Cashflow mini */}
      <div className="grid grid-cols-2 gap-3">
        {healthScore && <HealthScoreCard score={healthScore} onClick={() => navigate('/reports')} />}
        {cashflow && <CashflowMiniChart cashflow={cashflow} onClick={() => navigate('/charts')} />}
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-cu-text font-semibold text-sm flex items-center gap-2">
              <Target size={15} className="text-amber-400" />
              Peringatan Budget
            </h2>
          </div>
          <div className="space-y-2">
            {budgetAlerts.slice(0, 3).map(b => {
              const pct = Math.min(100, Math.round((b.spent / b.amount) * 100))
              const cat = categories.find(c => c.id === b.categoryId)
              return (
                <div key={b.id} onClick={() => navigate('/budget')} className="card p-3 cursor-pointer hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{cat?.icon}</span>
                      <span className="text-cu-text text-sm">{cat?.name || b.categoryId}</span>
                    </div>
                    <span className={`text-xs font-medium ${pct >= 100 ? 'text-rose-400' : 'text-amber-400'}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-cu-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-cu-muted">
                    <span>{formatRupiah(b.spent, true)} terpakai</span>
                    <span>dari {formatRupiah(b.amount, true)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals near completion */}
      {goalNear.length > 0 && (
        <div className="card p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Goal hampir tercapai! 🎉</span>
          </div>
          {goalNear.slice(0, 2).map(g => {
            const pct = Math.round((g.saved / g.target) * 100)
            return (
              <div key={g.id} className="flex items-center gap-3" onClick={() => navigate('/goals')}>
                <span className="text-2xl">{g.icon || '🎯'}</span>
                <div className="flex-1">
                  <div className="text-cu-text text-sm font-medium">{g.name}</div>
                  <div className="text-emerald-400 text-xs">{pct}% tercapai · {formatRupiah(g.saved, true)} / {formatRupiah(g.target, true)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-cu-text font-semibold text-sm">Transaksi Terbaru</h2>
          <button onClick={() => navigate('/transactions')} className="text-emerald-400 text-xs flex items-center gap-1">
            Semua <ChevronRight size={12} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">💸</div>
            <div className="text-cu-text font-medium mb-1">Belum ada transaksi</div>
            <div className="text-cu-muted text-sm">Tap tombol + untuk mulai mencatat</div>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(txn => {
              const cat = categories.find(c => c.id === txn.categoryId)
              const acc = accounts.find(a => a.id === txn.accountId)
              return (
                <div key={txn.id} className="card p-3 flex items-center gap-3 hover:border-cu-muted/50 transition-all cursor-pointer" onClick={() => navigate('/transactions')}>
                  <div className="w-10 h-10 rounded-xl bg-cu-bg flex items-center justify-center text-xl flex-shrink-0">
                    {cat?.icon || (txn.type === 'transfer' ? '🔄' : txn.type === 'income' ? '💰' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-cu-text text-sm font-medium truncate">
                      {txn.note || cat?.name || 'Transaksi'}
                    </div>
                    <div className="text-cu-muted text-xs flex items-center gap-1.5">
                      <span>{relativeDate(txn.date)}</span>
                      {acc && <><span>·</span><span>{acc.name}</span></>}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold font-mono flex-shrink-0 ${txn.type === 'income' ? 'text-emerald-400' : txn.type === 'transfer' ? 'text-blue-400' : 'text-rose-400'}`}>
                    {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '→' : '-'}{formatRupiah(txn.amount, true)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Monthly review snippet */}
      {monthlyReview && (
        <div className="card p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-semibold">Review Bulanan</span>
          </div>
          <p className="text-cu-subtext text-sm leading-relaxed line-clamp-3">
            {monthlyReview.split('\n').slice(1, 4).join(' ')}
          </p>
          <button onClick={() => navigate('/reports')} className="text-blue-400 text-xs mt-2 flex items-center gap-1">
            Lihat lengkap <ChevronRight size={11} />
          </button>
        </div>
      )}

      {showNotif && <NotificationPanel budgetAlerts={budgetAlerts} goalNear={goalNear} categories={categories} goals={goals} onClose={() => setShowNotif(false)} />}
    </div>
  )
}
