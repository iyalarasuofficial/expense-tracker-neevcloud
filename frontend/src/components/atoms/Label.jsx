export default function Label({ htmlFor, children, required = false, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`label ${className}`}>
      {children}
      {required && <span className="label-required">*</span>}
    </label>
  )
}
