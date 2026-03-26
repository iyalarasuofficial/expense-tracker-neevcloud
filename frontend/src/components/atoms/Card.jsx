export default function Card({ children, className = '', onClick, variant = 'default' }) {
  return (
    <div className={`card card--${variant} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
