import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { Moon, Sun, Bell, Download, Upload, Trash2, ChevronRight, Shield, User, Globe, PieChart, BarChart3, FileText, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import localDB from '../db'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { user, setUser, theme, toggleTheme, syncData, fullSyncFromCloud, loadAllData } = useStore()
  const [notifEnabled, setNotifEnabled] = useState(Notification.permission === 'granted')
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      await fullSyncFromCloud()
      toast.success(`Halo, ${result.user.displayName}! Data tersinkronisasi.`)
    } catch (e) {
      toast.error('Login gagal: ' + e.message)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Yakin ingin keluar?')) return
    await signOut(auth)
    setUser(null)
    toast.success('Berhasil keluar')
  }

  const handleEnableNotif = async () => {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      toast.success('Notifikasi diaktifkan!')
    } else {
      toast.error('Notifikasi ditolak. Aktifkan di pengaturan browser.')
    }
  }

  const handleExportBackup = async () => {
    const [transactions, accounts, categories, budgets, goals, goalDeposits] = await Promise.all([
      localDB.transactions.toArray(),
      localDB.accounts.toArray(),
      localDB.categories.toArray(),
      localDB.budgets.toArray(),
      localDB.goals.toArray(),
      localDB.goalDeposits.toArray(),
    ])
    const backup = { version: '1.0', exportedAt: new Date().toISOString(), transactions, accounts, categories, budgets, goals, goalDeposits }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cerdas-uang-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Backup berhasil diunduh!')
  }

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.version) throw new Error('Format tidak valid')
        if (data.transactions?.length) await localDB.transactions.bulkPut(data.transactions)
        if (data.accounts?.length) await localDB.accounts.bulkPut(data.accounts)
        if (data.goals?.length) await localDB.goals.bulkPut(data.goals)
        if (data.goalDeposits?.length) await localDB.goalDeposits.bulkPut(data.goalDeposits)
        await loadAllData()
        toast.success(`Import berhasil! ${data.transactions?.length || 0} transaksi dipulihkan.`)
      } catch {
        toast.error('File backup tidak valid')
      }
    }
    reader.readAsText(file)
  }

  const handleClearData = async () => {
    if (!confirm('⚠️ Hapus SEMUA data lokal? Tindakan ini tidak bisa dibatalkan!')) return
    if (!confirm('Apakah kamu benar-benar yakin? Semua transaksi akan hilang.')) return
    await localDB.transactions.clear()
    await localDB.accounts.clear()
    await localDB.budgets.clear()
    await localDB.goals.clear()
    await localDB.goalDeposits.clear()
    await localDB.drafts.clear()
    await loadAllData()
    toast.success('Semua data telah dihapus')
  }

  const Section = ({ title, children }) => (
    <div className="space-y-2">
      <div className="text-cu-muted text-xs font-medium uppercase tracking-wider px-1">{title}</div>
      <div className="card overflow-hidden divide-y divide-cu-border/50">{children}</div>
    </div>
  )

  const MenuItem = ({ icon: Icon, label, value, onClick, danger = false, toggle = false, toggleValue = false }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-cu-bg transition-all ${danger ? 'text-rose-400' : 'text-cu-text'}`}>
      <Icon size={18} className={danger ? 'text-rose-400' : 'text-cu-subtext'} />
      <span className={`flex-1 text-sm text-left ${danger ? 'text-rose-400' : ''}`}>{label}</span>
      {value && <span className="text-cu-muted text-xs">{value}</span>}
      {toggle && (
        <div className={`w-11 h-6 rounded-full transition-all relative ${toggleValue ? 'bg-emerald-500' : 'bg-cu-border'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${toggleValue ? 'left-6' : 'left-1'}`} />
        </div>
      )}
      {!toggle && !value && <ChevronRight size={16} className="text-cu-muted" />}
    </button>
  )

  return (
    <div className="px-4 py-4 pb-8 space-y-6">
      {/* User card */}
      <div className="card p-5">
        {user ? (
          <div className="flex items-center gap-4">
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" className="w-14 h-14 rounded-2xl object-cover" />
              : <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl">👤</div>
            }
            <div className="flex-1">
              <div className="text-cu-text font-bold">{user.displayName || 'Pengguna'}</div>
              <div className="text-cu-muted text-sm">{user.email}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs">Tersinkronisasi</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-xs text-rose-400 hover:text-rose-300 px-3 py-2">Keluar</button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">👤</div>
            <div className="text-cu-text font-semibold mb-1">Mode Offline</div>
            <div className="text-cu-muted text-sm mb-4">Login untuk sinkronisasi antar perangkat</div>
            <button onClick={handleGoogleLogin} className="btn-primary w-full flex items-center justify-center gap-2">
              <span>🔑</span> Masuk dengan Google
            </button>
          </div>
        )}
      </div>

      {/* App info */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <div className="text-cu-text font-bold">Cerdas Uang</div>
          <div className="text-cu-muted text-xs">v1.0.0 · PWA · Offline-first</div>
        </div>
      </div>

      <Section title="Tampilan">
        <MenuItem icon={theme === 'dark' ? Moon : Sun} label="Tema" value={theme === 'dark' ? 'Gelap' : 'Terang'} toggle toggleValue={theme === 'dark'} onClick={toggleTheme} />
      </Section>

      <Section title="Navigasi Cepat">
        <MenuItem icon={BarChart3} label="Grafik & Chart" onClick={() => navigate('/charts')} />
        <MenuItem icon={PieChart} label="Insights Explorer" onClick={() => navigate('/insights')} />
        <MenuItem icon={FileText} label="Laporan Keuangan" onClick={() => navigate('/reports')} />
      </Section>

      <Section title="Notifikasi">
        <MenuItem icon={Bell} label="Push Notification" toggle toggleValue={notifEnabled} onClick={handleEnableNotif} />
        <div className="px-4 py-2 text-cu-muted text-xs">
          Notifikasi untuk peringatan budget, tagihan jatuh tempo, dan review bulanan.
        </div>
      </Section>

      <Section title="Data & Backup">
        <MenuItem icon={Download} label="Export Backup (JSON)" onClick={handleExportBackup} />
        <label className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-cu-bg transition-all cursor-pointer">
          <Upload size={18} className="text-cu-subtext" />
          <span className="flex-1 text-sm text-left text-cu-text">Import Backup</span>
          <ChevronRight size={16} className="text-cu-muted" />
          <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
        </label>
        {user && <MenuItem icon={Shield} label="Sinkronisasi ke Cloud" onClick={async () => { await syncData(); toast.success('Sinkronisasi selesai!') }} />}
      </Section>

      <Section title="Bahaya">
        <MenuItem icon={Trash2} label="Hapus Semua Data Lokal" danger onClick={handleClearData} />
      </Section>

      {/* About */}
      <div className="text-center text-cu-muted text-xs space-y-1 pt-2 pb-4">
        <div>Cerdas Uang © 2025</div>
        <div>Dibuat dengan ❤️ · Firebase + React + PWA</div>
        <div>Data Anda tersimpan aman di perangkat dan cloud</div>
      </div>
    </div>
  )
}
