import { useState } from 'react'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../stores/useStore'
import { Zap, Mail, Lock, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const navigate = useNavigate()
  const { setUser, fullSyncFromCloud } = useStore()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      await fullSyncFromCloud()
      toast.success(`Selamat datang, ${result.user.displayName}!`)
      navigate('/')
    } catch (e) {
      toast.error('Login gagal: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async () => {
    if (!email || !password) return toast.error('Lengkapi email dan password')
    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await signInWithEmailAndPassword(auth, email, password)
        setUser(result.user)
        await fullSyncFromCloud()
        toast.success('Berhasil masuk!')
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        setUser(result.user)
        toast.success('Akun berhasil dibuat!')
      }
      navigate('/')
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use' ? 'Email sudah terdaftar'
        : e.code === 'auth/invalid-credential' ? 'Email atau password salah'
        : e.code === 'auth/weak-password' ? 'Password minimal 6 karakter'
        : 'Terjadi kesalahan: ' + e.message
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center px-6 py-10 bg-cu-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-cu-text">Cerdas Uang</h1>
          <p className="text-cu-muted text-sm mt-1">Kelola keuangan jadi lebih cerdas</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1 mb-6">
          {[{v:'login',l:'Masuk'},{v:'register',l:'Daftar'}].map(({v,l}) => (
            <button key={v} onClick={() => setMode(v)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode===v ? 'bg-emerald-500 text-white' : 'text-cu-muted'}`}>{l}</button>
          ))}
        </div>

        {/* Email form */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 bg-cu-surface border border-cu-border rounded-xl px-4 py-3">
            <Mail size={18} className="text-cu-muted" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-transparent text-sm text-cu-text placeholder:text-cu-muted outline-none flex-1" />
          </div>
          <div className="flex items-center gap-3 bg-cu-surface border border-cu-border rounded-xl px-4 py-3">
            <Lock size={18} className="text-cu-muted" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-transparent text-sm text-cu-text placeholder:text-cu-muted outline-none flex-1" />
          </div>
        </div>

        <button onClick={handleEmailAuth} disabled={loading} className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
          {loading ? <Loader size={16} className="animate-spin" /> : (mode === 'login' ? 'Masuk' : 'Daftar Sekarang')}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-cu-border" />
          <span className="text-cu-muted text-xs">atau</span>
          <div className="flex-1 h-px bg-cu-border" />
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2 mb-4">
          <span>🔑</span> Lanjutkan dengan Google
        </button>

        <button onClick={handleSkip} className="w-full text-center text-cu-muted text-sm py-2 hover:text-cu-text transition-colors">
          Lewati, gunakan secara offline →
        </button>
      </div>
    </div>
  )
}
