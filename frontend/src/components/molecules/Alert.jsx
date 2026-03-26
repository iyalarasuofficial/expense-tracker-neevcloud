export default function Alert({ message, variant = 'error', className = '' }) {
  if (!message) return null
  return (
    <div className={`alert alert--${variant} ${className}`}>
      <p>{message}</p>
    </div>
  )
}
