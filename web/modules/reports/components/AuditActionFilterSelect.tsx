'use client'

interface SelectOption {
  value: string
  label: string
}

interface AuditActionFilterSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
}

export function AuditActionFilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: AuditActionFilterSelectProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">
        {label}
      </span>
      <select
        id={id}
        className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-sm font-bold text-text-primary outline-none transition-colors focus:border-primary-main"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

