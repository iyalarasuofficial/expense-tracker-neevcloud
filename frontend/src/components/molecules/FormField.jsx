
import Label from '../atoms/Label'

export default function FormField({
  label,
  htmlFor,
  required = false,
  children,
  error,
  className = '',
}) {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="form-field-error">{error}</p>}
    </div>
  )
}
