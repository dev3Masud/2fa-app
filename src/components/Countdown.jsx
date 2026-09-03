export default function Countdown({ remaining = 30, period = 30 }) {
  const r = Math.max(0, Math.min(period, remaining))
  const pct = r / period
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const cls = pct < 0.2 ? 'danger' : pct < 0.4 ? 'warn' : ''
  const label = Math.ceil(r)
  return (
    <div className={`countdown ${cls}`} title={`${label}s remaining`}>
      <svg width="36" height="36">
        <circle className="bg" cx="18" cy="18" r={radius} />
        <circle
          className="fg"
          cx="18"
          cy="18"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x="18"
          y="18"
          textAnchor="middle"
          dominantBaseline="central"
          className="countdown-text"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
