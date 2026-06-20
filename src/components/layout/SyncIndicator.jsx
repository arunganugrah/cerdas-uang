import { Cloud, CloudOff, Loader, CheckCircle } from 'lucide-react'

export default function SyncIndicator({ status, pending }) {
  if (status === 'syncing') return (
    <div className="flex items-center gap-1 text-blue-400 text-xs">
      <Loader size={12} className="animate-spin" />
    </div>
  )
  if (status === 'error') return (
    <div className="flex items-center gap-1 text-rose-400 text-xs" title="Sync gagal">
      <CloudOff size={14} />
      {pending > 0 && <span className="text-[10px] bg-rose-500/20 px-1 rounded">{pending}</span>}
    </div>
  )
  if (status === 'synced') return (
    <div className="flex items-center gap-1 text-emerald-500 text-xs">
      <Cloud size={14} />
    </div>
  )
  return pending > 0 ? (
    <div className="flex items-center gap-1 text-cu-muted text-xs">
      <Cloud size={14} />
      <span className="text-[10px] bg-cu-surface px-1 rounded">{pending}</span>
    </div>
  ) : null
}
