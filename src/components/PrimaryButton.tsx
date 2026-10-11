type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: Props) {
  const styles: Record<Variant, string> = {
    primary: "bg-peach text-midnight hover:bg-coral",
    secondary:
      "bg-indigoDeep border border-purpleDark/70 text-textPrimary hover:bg-purpleDark/60",
    danger: "bg-coral text-midnight hover:bg-peach",
    ghost: "text-textSecondary hover:text-textPrimary hover:bg-purpleDark/50",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
