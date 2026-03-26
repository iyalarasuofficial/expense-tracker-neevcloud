export default function MemberChip({ name, variant = 'default', onRemove, className = '' }) {
  return (
    <div className={`chip chip--${variant} ${className}`}>
      <span>{name}</span>
      {onRemove && (
        <button type="button" className="chip-remove" onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  )
}
