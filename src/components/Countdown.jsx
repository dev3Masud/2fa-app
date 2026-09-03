export default function Countdown({ remaining = 30, period = 30, size = 36 }) {
  const r = Math.max(0, Math.min(period, Math.ceil(remaining)))
  const pct = period > 0 ? r / period : 0
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  const isDanger = r <= 5
  const isWarn = r <= 10 && !isDanger
  const cls = isDanger ? 'danger' : isWarn ? 'warn' : ''

  return (
    <div
      className={`countdown ${cls}`}
      title={`${r}s remaining`}
      style={{ width: size, height: size, minWidth: size }}
    >
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle
          className="bg"
          cx="18"
          cy="18"
          r={radius}
        />
        <circle
          className="fg"
          cx="18"
          cy="18"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
        <text
          x="18"
          y="18.5"
          className="countdown-number"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {r}
        </text>
      </svg>
    </div>
  )
}
