const Card = ({ children, className = '', padding = 'md' }) => {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    none: '',
  }

  return (
    <div
      className={[
        'bg-white rounded-2xl border border-slate-100 shadow-sm',
        paddings[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export default Card
