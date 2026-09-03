export default function Logo({ meta, size = 36 }) {
  const { name, color, initial } = meta
  return (
    <div
      className="logo-circle"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.42),
      }}
      title={name}
    >
      {initial || name.charAt(0).toUpperCase()}
    </div>
  )
}
