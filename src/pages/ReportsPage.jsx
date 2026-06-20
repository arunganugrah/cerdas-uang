import { useState, useMemo } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah } from '../utils/nlp'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { FileText, TrendingUp, Download } from 'lucide-react'
import HealthScoreCard from '../components/charts/HealthScoreCard'

const REPORT_TYPES = [
  { key: 'pnl', label: 'Laba-Rugi' },
  { key: 'networth', label: 'Net Worth' },
  { key: 'review', label: 'Review Bulanan' },
  { key: 'health', label: 'Skor Kesehatan' },
]

export default function ReportsPage() {
  const { transactions, accounts, categories, budgets, goals, healthScore, monthlyReview } = useStore()
  const [reportType, setReportType] = useState('pnl')
  const [selectedMonth, setSelectedMonth] = useState(0) // 0 = current, 1 = last, etc.

  const targetMonth = subMonths(new Date(), selectedMonth)
  const monthLabel = format(targetMonth, 'MMMM yyyy', { locale: idLocale })
  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)

  const monthTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date)
    return d >= monthStart && d <= monthEnd
  }), [transactions, selectedMonth])

  // P&L data
  const pnl = useMemo(() => {
    const income = {}
    const expense = {}
    monthTxns.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId)
      const parentCat = cat?.parentId ? categories.find(c => c.id === cat.parentId) : cat
      const name = parentCat?.name || 'Lainnya'
      if (t.type === 'income') income[name] = (income[name] || 0) + t.amount
      else if (t.type === 'expense') expense[name] = (expense[name] || 0) + t.amount
    })
    const totalIncome = Object.values(income).reduce((s, v) => s + v, 0)
    const totalExpense = Object.values(expense).reduce((s, v) => s + v, 0)
    return { income, expense, totalIncome, totalExpense, net: totalIncome - totalExpense }
  }, [monthTxns, categories])

  // Net worth history (last 6 months)
  const netWorthHistory = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i)
      const label = format(m, 'MMM yy', { locale: idLocale })
      // Estimate: current balance minus transactions after this month
      const futureExpense = transactions.filter(t => t.type === 'expense' && new Date(t.date) > endOfMonth(m)).reduce((s, t) => s + t.amount, 0)
      const futureIncome = transactions.filter(t => t.type === 'income' && new Date(t.date) > endOfMonth(m)).reduce((s, t) => s + t.amount, 0)
      const currentBalance = accounts.filter(a => !a.isArchived).reduce((s, a) => s + (a.balance || 0), 0)
      return { label, value: currentBalance + futureExpense - futureIncome }
    })
  }, [transactions, accounts])

  const currentNetWorth = accounts.filter(a => !a.isArchived).reduce((s, a) => s + (a.balance || 0), 0)

  const exportReport = () => {
    const lines = [
      `LAPORAN KEUANGAN - ${monthLabel.toUpperCase()}`,
      `Dibuat: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: idLocale })}`,
      `Aplikasi: Cerdas Uang`,
      '',
      '=== PEMASUKAN ===',
      ...Object.entries(pnl.income).map(([k,v]) => `${k}: ${formatRupiah(v)}`),
      `TOTAL PEMASUKAN: ${formatRupiah(pnl.totalIncome)}`,
      '',
      '=== PENGELUARAN ===',
      ...Object.entries(pnl.expense).map(([k,v]) => `${k}: ${formatRupiah(v)}`),
      `TOTAL PENGELUARAN: ${formatRupiah(pnl.totalExpense)}`,
      '',
      `LABA/RUGI BERSIH: ${formatRupiah(pnl.net)}`,
      '',
      '=== REVIEW ===',
      monthlyReview || 'Belum ada data',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `laporan-${format(targetMonth,'yyyy-MM')}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cu-text font-bold text-lg">Laporan Keuangan</h2>
          <p className="text-cu-muted text-xs capitalize">{monthLabel}</p>
        </div>
        <button onClick={exportReport} className="flex items-center gap-1.5 bg-cu-surface border border-cu-border rounded-xl px-3 py-2 text-cu-subtext text-xs hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
          <Download size={13} /> Export
        </button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {Array.from({ length: 6 }, (_, i) => {
          const m = subMonths(new Date(), i)
          return (
            <button key={i} onClick={() => setSelectedMonth(i)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedMonth===i ? 'bg-emerald-500 text-white' : 'bg-cu-surface border border-cu-border text-cu-muted hover:text-cu-text'}`}>
              {i === 0 ? 'Bulan Ini' : format(m, 'MMM yy', { locale: idLocale })}
            </button>
          )
        })}
      </div>

      {/* Report tabs */}
      <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1 overflow-x-auto">
        {REPORT_TYPES.map(({key,label}) => (
          <button key={key} onClick={() => setReportType(key)} className={`flex-shrink-0 flex-1 py-2 rounded-lg text-xs font-medium transition-all ${reportType===key ? 'bg-emerald-500 text-white' : 'text-cu-muted'}`}>{label}</button>
        ))}
      </div>

      {/* P&L REPORT */}
      {reportType === 'pnl' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`card p-4 border-l-4 ${pnl.net >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-cu-muted text-xs mb-1">Laba / Rugi Bersih</div>
                <div className={`text-2xl font-bold font-mono ${pnl.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pnl.net >= 0 ? '+' : ''}{formatRupiah(pnl.net, true)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-cu-muted text-xs mb-1">Savings Rate</div>
                <div className={`text-lg font-bold ${pnl.totalIncome > 0 && pnl.net/pnl.totalIncome >= 0.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {pnl.totalIncome > 0 ? Math.round((pnl.net/pnl.totalIncome)*100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Income breakdown */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-cu-text font-semibold text-sm flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400" /> Pemasukan</h4>
              <span className="text-emerald-400 font-mono font-bold text-sm">{formatRupiah(pnl.totalIncome, true)}</span>
            </div>
            {Object.entries(pnl.income).sort((a,b)=>b[1]-a[1]).map(([name, val]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-cu-border/50 last:border-0">
                <span className="text-cu-subtext text-sm">{name}</span>
                <span className="text-emerald-400 font-mono text-sm">{formatRupiah(val, true)}</span>
              </div>
            ))}
            {Object.keys(pnl.income).length === 0 && <p className="text-cu-muted text-sm text-center py-3">Tidak ada pemasukan</p>}
          </div>

          {/* Expense breakdown */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-cu-text font-semibold text-sm flex items-center gap-2"><FileText size={14} className="text-rose-400" /> Pengeluaran</h4>
              <span className="text-rose-400 font-mono font-bold text-sm">{formatRupiah(pnl.totalExpense, true)}</span>
            </div>
            {Object.entries(pnl.expense).sort((a,b)=>b[1]-a[1]).map(([name, val]) => {
              const pct = pnl.totalExpense > 0 ? Math.round((val/pnl.totalExpense)*100) : 0
              return (
                <div key={name} className="py-2 border-b border-cu-border/50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-cu-subtext text-sm">{name}</span>
                    <span className="text-rose-400 font-mono text-sm">{formatRupiah(val, true)}</span>
                  </div>
                  <div className="h-1 bg-cu-bg rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(pnl.expense).length === 0 && <p className="text-cu-muted text-sm text-center py-3">Tidak ada pengeluaran</p>}
          </div>
        </div>
      )}

      {/* NET WORTH */}
      {reportType === 'networth' && (
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div className="text-cu-muted text-sm mb-1">Kekayaan Bersih Saat Ini</div>
            <div className={`text-4xl font-bold font-mono ${currentNetWorth >= 0 ? 'text-cu-text' : 'text-rose-400'}`}>{formatRupiah(currentNetWorth)}</div>
          </div>
          <div className="space-y-2">
            {accounts.filter(a => !a.isArchived).map(acc => (
              <div key={acc.id} className="card p-4 flex items-center gap-3">
                <span className="text-2xl">{acc.icon}</span>
                <div className="flex-1">
                  <div className="text-cu-text text-sm font-medium">{acc.name}</div>
                  <div className="text-cu-muted text-xs capitalize">{acc.type}</div>
                </div>
                <div className={`font-bold font-mono ${(acc.balance||0) >= 0 ? 'text-cu-text' : 'text-rose-400'}`}>{formatRupiah(acc.balance||0, true)}</div>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <h4 className="text-cu-text font-semibold text-sm mb-3">Tren Net Worth</h4>
            <div className="space-y-2">
              {netWorthHistory.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-cu-subtext">{m.label}</span>
                  <span className={`font-mono font-medium ${m.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRupiah(m.value, true)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY REVIEW */}
      {reportType === 'review' && (
        <div className="card p-5">
          <h3 className="text-cu-text font-semibold mb-4">📊 Review {monthLabel}</h3>
          {monthlyReview ? (
            <div className="space-y-3">
              {monthlyReview.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />
                const isBold = line.startsWith('**') || line.startsWith('##') || line.startsWith('📊')
                const cleaned = line.replace(/\*\*/g, '').replace(/##\s*/,'')
                return (
                  <p key={i} className={`text-sm leading-relaxed ${isBold ? 'text-cu-text font-semibold' : 'text-cu-subtext'}`}>
                    {cleaned}
                  </p>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-cu-muted">
              <div className="text-4xl mb-3">📅</div>
              <div>Tambah transaksi lebih banyak untuk mendapatkan review otomatis</div>
            </div>
          )}
        </div>
      )}

      {/* HEALTH SCORE */}
      {reportType === 'health' && healthScore && (
        <div className="space-y-4">
          <div className="card p-6 text-center">
            <div className="text-cu-muted text-sm mb-2">Skor Kesehatan Finansial</div>
            <div className="text-7xl font-bold font-mono mb-2" style={{ color: healthScore.color }}>{healthScore.score}</div>
            <div className="text-2xl font-bold mb-1" style={{ color: healthScore.color }}>{healthScore.grade}</div>
            <div className="text-cu-subtext">{healthScore.label}</div>
            <div className="text-cu-muted text-xs mt-1">Savings Rate: {healthScore.savingsRate}%</div>
          </div>
          <div className="space-y-3">
            {healthScore.breakdown.map((item, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cu-text text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cu-muted text-xs">{item.value}</span>
                    <span className={`text-sm font-bold ${item.status==='good'?'text-emerald-400':item.status==='ok'?'text-amber-400':'text-rose-400'}`}>{item.score}/{item.max}</span>
                  </div>
                </div>
                <div className="h-2 bg-cu-bg rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${item.status==='good'?'bg-emerald-500':item.status==='ok'?'bg-amber-400':'bg-rose-500'}`} style={{ width: `${(item.score/item.max)*100}%` }} />
                </div>
                <p className="text-cu-muted text-xs">{item.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
