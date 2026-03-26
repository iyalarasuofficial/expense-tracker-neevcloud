export default function Button({ 
  type = 'button', 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick, 
  children,
  className = '' 
}) {
  const baseClass = `button button--${variant} button--${size}`
  return (
    <button 
      type={type} 
      disabled={disabled} 
      onClick={onClick}
      className={`${baseClass} ${className}`}
    >
      {children}
    </button>
  )
}
