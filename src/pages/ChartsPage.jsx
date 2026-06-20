import { useState, useMemo } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah } from '../utils/nlp'
import { startOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Sankey
} from 'recharts'

const CHART_TYPES = [
  { key: 'pie', label: 'Kategori' },
  { key: 'bar', label: 'Bulanan' },
  { key: 'area', label: 'Tren' },
  { key: 'radar', label: 'Radar' },
  { key: 'cashflow', label: 'Cashflow' },
  { key: 'yoy', label: 'YoY' },
]

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b','#22d3ee']

const CustomTooltip = ({ active, payload, label, isCurrency = true }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-cu-surface border border-cu-border rounded-xl p-3 shadow-xl text-xs">
      {label && <div className="text-cu-subtext mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-cu-text">{p.name}: </span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            {isCurrency ? formatRupiah(p.value, true) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ChartsPage() {
  const { transactions, categories, cashflow } = useStore()
  const [chartType, setChartType] = useState('pie')
  const [txnType, setTxnType] = useState('expense')
  const [months, setMonths] = useState(6)

  const now = new Date()

  // Category pie data
  const pieData = useMemo(() => {
    const monthStart = startOfMonth(subMonths(now, months - 1))
    const filtered = transactions.filter(t => t.type === txnType && new Date(t.date) >= monthStart)
    const byCategory = {}
    filtered.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId)
      const name = cat?.name || 'Lainnya'
      byCategory[name] = (byCategory[name] || 0) + t.amount
    })
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
  }, [transactions, categories, txnType, months])

  // Monthly bar/area data
  const monthlyData = useMemo(() => {
    const monthRange = eachMonthOfInterval({ start: subMonths(now, months - 1), end: now })
    return monthRange.map(month => {
      const label = format(month, 'MMM yy', { locale: idLocale })
      const monthTxns = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
      })
      return {
        label,
        Pemasukan: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Pengeluaran: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        Tabungan: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      }
    })
  }, [transactions, months])

  // Radar data (top 6 categories this month)
  const radarData = useMemo(() => {
    const monthStart = startOfMonth(now)
    const monthExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= monthStart)
    const byCat = {}
    monthExpenses.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId && !c.parentId)
      if (cat) byCat[cat.name] = (byCat[cat.name] || 0) + t.amount
    })
    return Object.entries(byCat).slice(0, 6).map(([name, value]) => ({ name, value }))
  }, [transactions, categories])

  // Year-over-year
  const yoyData = useMemo(() => {
    const currentYear = now.getFullYear()
    return Array.from({ length: 12 }, (_, i) => {
      const label = format(new Date(2024, i, 1), 'MMM', { locale: idLocale })
      const thisYear = transactions.filter(t => { const d = new Date(t.date); return d.getFullYear() === currentYear && d.getMonth() === i && t.type === 'expense' }).reduce((s, t) => s + t.amount, 0)
      const lastYear = transactions.filter(t => { const d = new Date(t.date); return d.getFullYear() === currentYear - 1 && d.getMonth() === i && t.type === 'expense' }).reduce((s, t) => s + t.amount, 0)
      return { label, [String(currentYear)]: thisYear, [String(currentYear - 1)]: lastYear }
    })
  }, [transactions])

  const axisStyle = { fontSize: 11, fill: '#64748b', fontFamily: 'Plus Jakarta Sans' }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Chart type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
        {CHART_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setChartType(key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${chartType === key ? 'bg-emerald-500 text-white' : 'bg-cu-surface border border-cu-border text-cu-muted hover:text-cu-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {(chartType === 'pie' || chartType === 'bar' || chartType === 'area') && (
          <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1">
            {[{v:'expense',l:'Keluar'},{v:'income',l:'Masuk'}].map(({v,l}) => (
              <button key={v} onClick={() => setTxnType(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${txnType===v ? (v==='expense'?'bg-rose-500':'bg-emerald-500') + ' text-white' : 'text-cu-muted'}`}>{l}</button>
            ))}
          </div>
        )}
        <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1 ml-auto">
          {[3,6,12].map(m => (
            <button key={m} onClick={() => setMonths(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${months===m ? 'bg-cu-border text-cu-text' : 'text-cu-muted'}`}>{m}bln</button>
          ))}
        </div>
      </div>

      {/* PIE / DONUT */}
      {chartType === 'pie' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold mb-4">Pengeluaran per Kategori</h3>
          {pieData.length === 0 ? (
            <div className="text-center py-12 text-cu-muted">Belum ada data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0)
                  const pct = Math.round((item.value / total) * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                      <div className="flex-1 text-cu-text text-sm truncate">{item.name}</div>
                      <div className="text-cu-subtext text-xs">{pct}%</div>
                      <div className="text-cu-text text-sm font-mono font-medium">{formatRupiah(item.value, true)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* BAR */}
      {chartType === 'bar' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold mb-4">Perbandingan Bulanan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => formatRupiah(v, true)} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="Pemasukan" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AREA */}
      {chartType === 'area' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold mb-4">Tren Keuangan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => formatRupiah(v, true)} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#gInc)" />
              <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#gExp)" />
              <Area type="monotone" dataKey="Tabungan" stroke="#3b82f6" strokeWidth={2} fill="url(#gSav)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RADAR */}
      {chartType === 'radar' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold mb-4">Pola Pengeluaran (Bulan Ini)</h3>
          {radarData.length === 0 ? (
            <div className="text-center py-12 text-cu-muted">Belum ada data bulan ini</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} />
                <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* CASHFLOW PROJECTION */}
      {chartType === 'cashflow' && cashflow && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[{d:30,v:cashflow.milestones.d30},{d:60,v:cashflow.milestones.d60},{d:90,v:cashflow.milestones.d90}].map(({d,v}) => (
              <div key={d} className="card p-3 text-center">
                <div className="text-cu-muted text-xs mb-1">{d} hari</div>
                <div className={`font-bold font-mono text-sm ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRupiah(v, true)}</div>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <h3 className="text-cu-text font-semibold mb-4">Prediksi Cashflow 90 Hari</h3>
            {cashflow.riskLevel === 'high' && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-rose-400 text-sm">
                ⚠️ Saldo diperkirakan minus pada <strong>{cashflow.lowestDate}</strong>. Pertimbangkan mengurangi pengeluaran.
              </div>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashflow.projection.filter((_,i)=>i%3===0)}>
                <defs>
                  <linearGradient id="cfG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cashflow.riskLevel==='high'?'#f59e0b':'#10b981'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={cashflow.riskLevel==='high'?'#f59e0b':'#10b981'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={v=>formatRupiah(v,true)} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" name="Estimasi Saldo" stroke={cashflow.riskLevel==='high'?'#f59e0b':'#10b981'} strokeWidth={2} fill="url(#cfG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* YOY */}
      {chartType === 'yoy' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold mb-1">Perbandingan Year-over-Year</h3>
          <p className="text-cu-muted text-xs mb-4">Pengeluaran {now.getFullYear()} vs {now.getFullYear()-1}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={yoyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v=>formatRupiah(v,true)} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey={String(now.getFullYear())} fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey={String(now.getFullYear()-1)} fill="#3b82f6" radius={[4,4,0,0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
