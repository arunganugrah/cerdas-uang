import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

export default function HealthScoreCard({ score, onClick }) {
  if (!score) return null
  const data = [{ value: score.score, fill: score.color }]

  return (
    <div onClick={onClick} className="card p-4 cursor-pointer hover:border-cu-muted/50 transition-all">
      <div className="text-cu-subtext text-xs mb-1">Kesehatan Finansial</div>
      <div className="relative h-24 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: score.color }}>{score.score}</span>
          <span className="text-cu-muted text-[10px]">{score.grade}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="text-xs font-medium" style={{ color: score.color }}>{score.label}</span>
      </div>
    </div>
  )
}
