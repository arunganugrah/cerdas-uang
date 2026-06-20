import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatRupiah } from '../../utils/nlp'

export default function CashflowMiniChart({ cashflow, onClick }) {
  if (!cashflow) return null
  const data = cashflow.projection.filter((_, i) => i % 3 === 0).slice(0, 10)
  const hasNegative = cashflow.lowestPoint < 0

  return (
    <div onClick={onClick} className={`card p-4 cursor-pointer transition-all hover:border-cu-muted/50 ${hasNegative ? 'border-amber-500/30' : ''}`}>
      <div className="text-cu-subtext text-xs mb-1">Prediksi 90 Hari</div>
      <div className={`text-sm font-semibold font-mono mb-2 ${cashflow.netDaily >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {cashflow.netDaily >= 0 ? '+' : ''}{formatRupiah(cashflow.netDaily, true)}/hr
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={hasNegative ? '#f59e0b' : '#10b981'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={hasNegative ? '#f59e0b' : '#10b981'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="balance" stroke={hasNegative ? '#f59e0b' : '#10b981'} strokeWidth={2} fill="url(#cfGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hasNegative && (
        <div className="text-amber-400 text-[10px] mt-1 flex items-center gap-1">⚠️ Saldo bisa minus di {cashflow.lowestDate}</div>
      )}
    </div>
  )
}
