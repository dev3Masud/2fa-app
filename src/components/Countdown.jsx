export default function Countdown({ remaining = 30, period = 30 }) {
  const r = Math.max(0, Math.min(period, remaining))
  const pct = r / period
  const radius = 13
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const cls = pct < 0.25 ? 'danger' : pct < 0.5 ? 'warn' : ''
  return (
    <div className={`countdown ${cls}`} title={`${r}s remaining`}>
      <svg width="32" height="32">
        <circle className="bg" cx="16" cy="16" r={radius} />
        <circle
          className="fg"
          cx="16"
          cy="16"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  )
}
