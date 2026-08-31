import { useState } from 'react'
import type { ChangeEventHandler } from 'react'

interface PasswordFieldProps {
  id: string
  label: string
  name: string
  autoComplete: string
  value?: string
  onChange?: ChangeEventHandler<HTMLInputElement>
  required?: boolean
  disabled?: boolean
}

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  onChange,
  required = false,
  disabled = false,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const actionLabel = isVisible ? 'Ocultar senha' : 'Mostrar senha'

  return (
    <div className="space-y-1">
      <label className="block text-label-lg font-semibold" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className="min-h-touch w-full rounded-card border border-foreground/20 bg-surface px-gutter pr-16 text-body-md outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={isVisible}
          title={actionLabel}
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex min-h-touch min-w-touch items-center justify-center rounded-control text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isVisible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="m3 3 18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5.5 0 9.3 5.1 10 8-.3 1.1-1.1 2.5-2.3 3.8" />
              <path d="M6.3 6.3C4.1 7.7 2.6 10.1 2 12c.7 2.9 4.5 8 10 8 1.6 0 3.1-.4 4.3-1.1" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
