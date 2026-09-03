export function Toast({ message, onDone }) {
  if (!message) return null
  return (
    <div className="toast" onClick={onDone}>
      {message}
    </div>
  )
}
