const Input = ({
  label,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  icon: Icon,
  disabled = false,
  required = false,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Icon size={16} className="text-slate-400" />
          </div>
        )}

        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={[
            'w-full py-2.5 text-sm text-slate-800 bg-white border rounded-xl outline-none transition-all duration-200',
            'placeholder:text-slate-400',
            'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            Icon ? 'pl-9 pr-4' : 'px-4',
            error ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400' : 'border-slate-200',
          ].join(' ')}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>
      )}
    </div>
  )
}

export default Input
