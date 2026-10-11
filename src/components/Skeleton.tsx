import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`pv-skeleton ${className}`} style={style} />;
}

export function SkeletonCard({
  height = "h-48",
  className = "",
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 ${className}`}
    >
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className={height} />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden"
        >
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-5">
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-5/6 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-7 flex-1" />
              <Skeleton className="h-7 flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({
  count = 4,
  cols = "grid-cols-2 md:grid-cols-4",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-purpleDark/60 bg-indigoDeep/70 p-4"
        >
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
      <div className="px-5 py-3 border-b border-purpleDark/60">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-purpleDark/40">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-2/3 mb-2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeader({
  titleWidth = "w-48",
}: {
  titleWidth?: string;
}) {
  return (
    <div className="mb-6">
      <Skeleton className={`h-8 ${titleWidth} mb-3`} />
      <Skeleton className="h-3 w-64" />
    </div>
  );
}

export function DataGate({
  ready,
  skeleton,
  children,
}: {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!ready) return <>{skeleton}</>;
  return <>{children}</>;
}
