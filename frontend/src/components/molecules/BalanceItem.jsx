export default function BalanceItem({ name, amount, isNegative = false, className = '' }) {
  const amountClass = isNegative ? 'balance-item-negative' : 'balance-item-positive'
  return (
    <div className={`balance-item ${className}`}>
      <span className="balance-item-name">{name}</span>
      <span className={`balance-item-amount ${amountClass}`}>
        INR {Math.abs(amount).toFixed(2)}
      </span>
    </div>
  )
}
