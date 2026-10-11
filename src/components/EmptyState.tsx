import { type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/60 p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purpleDark/60 flex items-center justify-center">
        <Icon className="w-6 h-6 text-peach" />
      </div>
      <h3 className="font-serif text-xl text-textPrimary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-textSecondary max-w-md mx-auto mb-5">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
