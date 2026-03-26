export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  min,
  max,
  step,
  className = '',
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      className={`input ${className}`}
    />
  )
}
