export default function Select({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Select...',
  className = '',
}) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className={`select ${className}`}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
