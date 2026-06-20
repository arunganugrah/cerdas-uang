import { formatRupiah } from './nlp'
import { startOfMonth, endOfMonth, subMonths, differenceInDays, addDays, format } from 'date-fns'
import { id } from 'date-fns/locale'

// ============================================================
// FINANCIAL HEALTH SCORE (0-100)
// ============================================================
export function calculateHealthScore(transactions, budgets, goals) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const last3Months = subMonths(now, 3)

  const recent = transactions.filter(t => new Date(t.date) >= last3Months)
  const thisMonth = transactions.filter(t => new Date(t.date) >= monthStart)

  const totalIncome = recent.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = recent.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthlyIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthlyExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  let score = 0
  const breakdown = []

  // 1. Savings rate (30 poin)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const savingsScore = Math.min(30, Math.max(0, savingsRate * 1.5))
  score += savingsScore
  breakdown.push({
    label: 'Tingkat Tabungan',
    score: Math.round(savingsScore),
    max: 30,
    value: `${savingsRate.toFixed(1)}%`,
    status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'ok' : 'bad',
    tip: savingsRate < 10 ? 'Usahakan menabung minimal 10% dari pemasukan' : savingsRate < 20 ? 'Bagus! Coba tingkatkan ke 20%' : 'Luar biasa! Pertahankan!'
  })

  // 2. Budget adherence (25 poin)
  const activeBudgets = budgets.filter(b => b.period === 'monthly')
  let budgetScore = 25
  if (activeBudgets.length > 0) {
    const overBudget = activeBudgets.filter(b => (b.spent || 0) > b.amount).length
    budgetScore = Math.max(0, 25 - (overBudget / activeBudgets.length) * 25)
  }
  score += budgetScore
  breakdown.push({
    label: 'Kepatuhan Budget',
    score: Math.round(budgetScore),
    max: 25,
    value: activeBudgets.length > 0 ? `${activeBudgets.length} budget aktif` : 'Belum ada budget',
    status: budgetScore >= 20 ? 'good' : budgetScore >= 10 ? 'ok' : 'bad',
    tip: activeBudgets.length === 0 ? 'Buat budget untuk kategori utama' : budgetScore < 15 ? 'Beberapa kategori melebihi budget' : 'Budget terkontrol!'
  })

  // 3. Income consistency (20 poin)
  const monthlyIncomes = [0, 1, 2].map(i => {
    const m = subMonths(now, i)
    return transactions.filter(t => t.type === 'income' && new Date(t.date) >= startOfMonth(m) && new Date(t.date) <= endOfMonth(m)).reduce((s, t) => s + t.amount, 0)
  })
  const avgIncome = monthlyIncomes.reduce((s, v) => s + v, 0) / 3
  const variance = avgIncome > 0 ? Math.abs(monthlyIncomes[0] - avgIncome) / avgIncome : 1
  const consistencyScore = Math.max(0, 20 * (1 - variance))
  score += consistencyScore
  breakdown.push({
    label: 'Konsistensi Pemasukan',
    score: Math.round(consistencyScore),
    max: 20,
    value: `Rata-rata ${formatRupiah(avgIncome, true)}/bln`,
    status: consistencyScore >= 15 ? 'good' : consistencyScore >= 8 ? 'ok' : 'bad',
    tip: consistencyScore < 8 ? 'Pemasukan tidak stabil, pertimbangkan sumber pendapatan tambahan' : 'Pemasukan stabil'
  })

  // 4. Goals progress (15 poin)
  const activeGoals = goals.filter(g => !g.isCompleted)
  let goalsScore = 0
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((s, g) => s + Math.min(1, (g.saved || 0) / g.target), 0) / activeGoals.length
    goalsScore = avgProgress * 15
  } else {
    goalsScore = 5 // neutral jika tidak ada goals
  }
  score += goalsScore
  breakdown.push({
    label: 'Progress Goals',
    score: Math.round(goalsScore),
    max: 15,
    value: activeGoals.length > 0 ? `${activeGoals.length} goal aktif` : 'Belum ada goal',
    status: goalsScore >= 10 ? 'good' : goalsScore >= 5 ? 'ok' : 'bad',
    tip: activeGoals.length === 0 ? 'Buat tujuan tabungan untuk motivasi lebih' : 'Terus kejar goals kamu!'
  })

  // 5. Record keeping (10 poin)
  const daysInMonth = differenceInDays(now, monthStart) + 1
  const recordScore = Math.min(10, (thisMonth.length / daysInMonth) * 5)
  score += recordScore
  breakdown.push({
    label: 'Kedisiplinan Pencatatan',
    score: Math.round(recordScore),
    max: 10,
    value: `${thisMonth.length} transaksi bulan ini`,
    status: recordScore >= 7 ? 'good' : recordScore >= 4 ? 'ok' : 'bad',
    tip: recordScore < 4 ? 'Catat transaksi setiap hari untuk tracking lebih akurat' : 'Rajin mencatat!'
  })

  const finalScore = Math.min(100, Math.round(score))
  return {
    score: finalScore,
    grade: finalScore >= 80 ? 'A' : finalScore >= 65 ? 'B' : finalScore >= 50 ? 'C' : finalScore >= 35 ? 'D' : 'E',
    label: finalScore >= 80 ? 'Sangat Sehat' : finalScore >= 65 ? 'Sehat' : finalScore >= 50 ? 'Cukup' : finalScore >= 35 ? 'Perlu Perhatian' : 'Kritis',
    color: finalScore >= 80 ? '#10b981' : finalScore >= 65 ? '#34d399' : finalScore >= 50 ? '#f59e0b' : finalScore >= 35 ? '#f97316' : '#ef4444',
    breakdown,
    savingsRate: savingsRate.toFixed(1)
  }
}

// ============================================================
// CASHFLOW PREDICTION (30/60/90 hari)
// ============================================================
export function predictCashflow(transactions, accounts, scheduledTransactions = [], days = 90) {
  const now = new Date()
  const totalBalance = accounts.filter(a => !a.isArchived).reduce((s, a) => s + (a.balance || 0), 0)

  // Hitung rata-rata harian dari 3 bulan terakhir
  const last90 = transactions.filter(t => new Date(t.date) >= subMonths(now, 3))
  const dailyIncome = last90.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) / 90
  const dailyExpense = last90.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / 90
  const netDaily = dailyIncome - dailyExpense

  // Generate proyeksi per hari
  const projection = []
  let runningBalance = totalBalance

  for (let i = 1; i <= days; i++) {
    const date = addDays(now, i)
    let dayIncome = dailyIncome
    let dayExpense = dailyExpense

    // Tambahkan scheduled transactions
    const scheduled = scheduledTransactions.filter(st => {
      const stDate = new Date(st.nextDate)
      return format(stDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
    scheduled.forEach(st => {
      if (st.type === 'income') dayIncome += st.amount
      else dayExpense += st.amount
    })

    runningBalance += (dayIncome - dayExpense)
    projection.push({
      date: date.toISOString(),
      label: format(date, 'd MMM', { locale: id }),
      balance: Math.round(runningBalance),
      income: Math.round(dayIncome),
      expense: Math.round(dayExpense)
    })
  }

  // Milestones
  const d30 = projection[29]?.balance || 0
  const d60 = projection[59]?.balance || 0
  const d90 = projection[89]?.balance || 0

  const lowestPoint = Math.min(...projection.map(p => p.balance))
  const lowestDate = projection.find(p => p.balance === lowestPoint)

  return {
    currentBalance: totalBalance,
    dailyIncome: Math.round(dailyIncome),
    dailyExpense: Math.round(dailyExpense),
    netDaily: Math.round(netDaily),
    projection,
    milestones: { d30, d60, d90 },
    lowestPoint,
    lowestDate: lowestDate?.label,
    riskLevel: lowestPoint < 0 ? 'high' : lowestPoint < totalBalance * 0.2 ? 'medium' : 'low'
  }
}

// ============================================================
// MONTHLY REVIEW TEXT GENERATOR
// ============================================================
export function generateMonthlyReview(transactions, budgets, goals, previousMonthTransactions) {
  const now = new Date()
  const monthName = format(now, 'MMMM yyyy', { locale: id })
  const monthStart = startOfMonth(now)

  const thisMonth = transactions.filter(t => new Date(t.date) >= monthStart)
  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : 0

  // Previous month comparison
  const prevExpense = previousMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const prevIncome = previousMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseDiff = prevExpense > 0 ? (((expense - prevExpense) / prevExpense) * 100).toFixed(0) : null

  // Top spending category
  const byCategory = {}
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount
  })
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

  // Budget exceeded
  const overBudgets = budgets.filter(b => b.period === 'monthly' && (b.spent || 0) > b.amount)

  // Goals achieved this month
  const goalsAchieved = goals.filter(g => g.isCompleted && new Date(g.completedAt) >= monthStart)

  let lines = [`📊 **Review Keuangan ${monthName}**\n`]

  // Summary
  if (income > 0) lines.push(`💰 Pemasukan: **${formatRupiah(income, true)}** ${income > prevIncome ? `(+${(((income - prevIncome) / prevIncome) * 100).toFixed(0)}% vs bulan lalu)` : ''}`)
  lines.push(`💸 Pengeluaran: **${formatRupiah(expense, true)}** ${expenseDiff ? `(${expenseDiff > 0 ? '+' : ''}${expenseDiff}% vs bulan lalu)` : ''}`)
  lines.push(`${net >= 0 ? '✅' : '⚠️'} Saldo bersih: **${formatRupiah(net, true)}**`)
  lines.push(`🎯 Tingkat tabungan: **${savingsRate}%**\n`)

  // Highlight
  if (expenseDiff && expenseDiff < -5) {
    lines.push(`🎉 Kamu berhasil **menghemat ${Math.abs(expenseDiff)}%** pengeluaran dibanding bulan lalu!`)
  } else if (expenseDiff && expenseDiff > 10) {
    lines.push(`⚠️ Pengeluaran naik **${expenseDiff}%** dari bulan lalu. Perlu dievaluasi.`)
  }

  if (topCat) {
    lines.push(`📌 Pengeluaran terbesar di kategori **${topCat[0]}** sebesar **${formatRupiah(topCat[1], true)}**`)
  }

  if (overBudgets.length > 0) {
    lines.push(`🔴 **${overBudgets.length} kategori** melebihi budget bulan ini.`)
  } else if (budgets.length > 0) {
    lines.push(`✅ Semua budget berhasil dijaga!`)
  }

  if (goalsAchieved.length > 0) {
    lines.push(`🏆 **${goalsAchieved.length} goal tabungan** tercapai bulan ini! Luar biasa!`)
  }

  // Saran
  lines.push('\n💡 **Saran untuk bulan depan:**')
  if (parseInt(savingsRate) < 10) lines.push('• Targetkan menabung minimal 10% dari pemasukan')
  else if (parseInt(savingsRate) < 20) lines.push('• Tingkatkan target tabungan ke 20%')
  else lines.push('• Pertahankan pola keuangan yang sudah bagus!')

  if (overBudgets.length > 0) lines.push(`• Review dan sesuaikan budget untuk ${overBudgets.length} kategori yang over`)
  if (goals.filter(g => !g.isCompleted).length === 0) lines.push('• Buat tujuan tabungan baru sebagai motivasi')

  return lines.join('\n')
}
