interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function TextInput({
  label,
  hint,
  className = "",
  ...rest
}: InputProps) {
  return (
    <label className="block">
      <span className="block text-xs text-textSecondary mb-1.5">{label}</span>
      <input
        {...rest}
        className={`w-full px-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60 focus:ring-1 focus:ring-peach/30 ${className}`}
      />
      {hint && (
        <span className="block text-[11px] text-textSecondary mt-1">
          {hint}
        </span>
      )}
    </label>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextArea({
  label,
  hint,
  className = "",
  ...rest
}: TextAreaProps) {
  return (
    <label className="block">
      <span className="block text-xs text-textSecondary mb-1.5">{label}</span>
      <textarea
        {...rest}
        className={`w-full px-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60 focus:ring-1 focus:ring-peach/30 resize-y min-h-[80px] ${className}`}
      />
      {hint && (
        <span className="block text-[11px] text-textSecondary mt-1">
          {hint}
        </span>
      )}
    </label>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function Select({
  label,
  hint,
  children,
  className = "",
  ...rest
}: SelectProps) {
  return (
    <label className="block">
      <span className="block text-xs text-textSecondary mb-1.5">{label}</span>
      <select
        {...rest}
        className={`w-full px-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60 focus:ring-1 focus:ring-peach/30 ${className}`}
      >
        {children}
      </select>
      {hint && (
        <span className="block text-[11px] text-textSecondary mt-1">
          {hint}
        </span>
      )}
    </label>
  );
}
