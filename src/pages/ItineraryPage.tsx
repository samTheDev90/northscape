import { useMemo, useState } from "react";
import {
  Plus,
  Clock,
  MapPin,
  Coins,
  AlertTriangle,
  Trash2,
  Pencil,
  Train,
  Car,
  Footprints,
  Bus,
  Bike,
  X,
  Printer,
  List,
  LayoutList,
  Copy,
  Check,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import {
  detectConflicts,
  durationMinutes,
  timeToMinutes,
  totalPlannedCost,
  totalPlannedMinutes,
} from "../lib/schedule";
import { formatBDT } from "../lib/money";
import Modal from "../components/Modal";
import Button from "../components/PrimaryButton";
import AdminOnly from "../components/AdminOnly";
import { Select, TextArea, TextInput } from "../components/FormField";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonStats } from "../components/Skeleton";
import type { ItineraryActivity, TransportMode } from "../lib/types";

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  train: "Train",
  bus: "Bus",
  "auto-rickshaw": "Auto-rickshaw",
  cng: "CNG",
  "reserved-vehicle": "Reserved vehicle",
  walking: "Walking",
  other: "Other",
};

function TransportIcon({ mode }: { mode: TransportMode }) {
  const cls = "w-3.5 h-3.5";
  switch (mode) {
    case "train":
      return <Train className={cls} />;
    case "bus":
      return <Bus className={cls} />;
    case "auto-rickshaw":
      return <Car className={cls} />;
    case "cng":
      return <Car className={cls} />;
    case "reserved-vehicle":
      return <Car className={cls} />;
    case "walking":
      return <Footprints className={cls} />;
    default:
      return <Bike className={cls} />;
  }
}

function formatDuration(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type ViewMode = "timeline" | "compact";

export default function ItineraryPage() {
  const {
    data,
    ready,
    addActivity,
    updateActivity,
    removeActivity,
    reorderActivities,
    restoreActivity,
  } = useStore();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeDay, setActiveDay] = useState(0);
  const [editing, setEditing] = useState<ItineraryActivity | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<ViewMode>("timeline");
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dayIndices = useMemo(() => {
    const set = new Set<number>([0]);
    data.activities.forEach((a) => set.add(a.dayIndex));
    return Array.from(set).sort((a, b) => a - b);
  }, [data.activities]);

  const dayActivities = useMemo(
    () =>
      data.activities
        .filter((a) => a.dayIndex === activeDay)
        .sort((a, b) => a.order - b.order),
    [data.activities, activeDay],
  );

  const conflicts = useMemo(
    () => detectConflicts(dayActivities),
    [dayActivities],
  );
  const conflictIds = useMemo(() => {
    const s = new Set<string>();
    conflicts.forEach((c) => c.activityIds.forEach((id) => s.add(id)));
    return s;
  }, [conflicts]);

  const plannedMins = totalPlannedMinutes(dayActivities);
  const plannedCost = totalPlannedCost(dayActivities);

  const timeline = useMemo(() => {
    const result: {
      activity: ItineraryActivity;
      gapFromPrev: number | null;
    }[] = [];
    let prevEnd: number | null = null;
    for (const a of dayActivities) {
      const s = timeToMinutes(a.startTime);
      const e = timeToMinutes(a.endTime);
      const gap = prevEnd !== null && s >= 0 ? s - prevEnd : null;
      result.push({ activity: a, gapFromPrev: gap });
      if (e >= 0) prevEnd = e;
    }
    return result;
  }, [dayActivities]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = dayActivities.map((a) => a.id);
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;

    const newOrder = arrayMove(ids, fromIndex, toIndex);
    reorderActivities(activeDay, newOrder);
  };

  const handleDelete = async (activity: ItineraryActivity) => {
    const ok = await confirm({
      title: `Delete "${activity.title}"?`,
      message: "This activity will be removed from the itinerary.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    removeActivity(activity.id);
    toast.withUndo({
      message: `"${activity.title}" was deleted.`,
      title: "Activity removed",
      onUndo: () => {
        restoreActivity(activity);
        toast.success("Activity restored", "Undone");
      },
    });
  };

  const handleCreate = (payload: Payload) => {
    let date: string | null = null;
    if (data.trip.startDate) {
      const start = new Date(data.trip.startDate);
      start.setDate(start.getDate() + activeDay);
      date = start.toISOString().slice(0, 10);
    }
    addActivity({ ...payload, dayIndex: activeDay, date });
    setCreating(false);
    toast.success(`Added to Day ${activeDay + 1}`, "Activity created");
  };

  const handleCopyText = async () => {
    const text = buildItineraryText(
      data.trip.name,
      dayIndices.map((idx) => ({
        dayIndex: idx,
        activities: data.activities
          .filter((a) => a.dayIndex === idx)
          .sort((a, b) => a.order - b.order),
      })),
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Itinerary copied to clipboard", "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard", "Copy failed");
    }
  };

  if (!ready) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <Skeleton className="h-8 w-40 mb-3" />
        <Skeleton className="h-3 w-72 mb-6" />
        <Skeleton className="h-10 w-full max-w-sm mb-6 rounded-lg" />
        <SkeletonStats />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pv-fade-up no-print">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
            Itinerary
          </h1>
          <p className="text-textSecondary text-sm">
            {isAdmin
              ? "Drag activities to reorder them. Every minute matters for the return train."
              : "Plan the day carefully — every minute matters for the return train."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-midnight/60 border border-purpleDark/60">
            <button
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors ${
                view === "timeline"
                  ? "bg-peach text-midnight font-medium"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
              aria-label="Timeline view"
            >
              <LayoutList className="w-3.5 h-3.5" /> Timeline
            </button>
            <button
              onClick={() => setView("compact")}
              className={`px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-colors ${
                view === "compact"
                  ? "bg-peach text-midnight font-medium"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
              aria-label="Compact view"
            >
              <List className="w-3.5 h-3.5" /> Compact
            </button>
          </div>

          <Button variant="secondary" onClick={handleCopyText}>
            {copied ? (
              <Check className="w-4 h-4 text-forest" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Copy
          </Button>

          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print
          </Button>

          <AdminOnly>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              Add Activity
            </Button>
          </AdminOnly>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="font-serif text-3xl mb-1">{data.trip.name}</h1>
        <p className="text-sm">
          {data.trip.startDate ?? "Date not set"}
          {data.trip.endDate ? ` → ${data.trip.endDate}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 no-print">
        {dayIndices.map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveDay(idx)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeDay === idx
                ? "bg-peach text-midnight font-medium"
                : "bg-indigoDeep border border-purpleDark/60 text-textSecondary hover:text-textPrimary"
            }`}
          >
            Day {idx + 1}
          </button>
        ))}
        <AdminOnly>
          <button
            onClick={() => setActiveDay(dayIndices[dayIndices.length - 1] + 1)}
            className="px-3 py-2 rounded-lg text-sm border border-dashed border-purpleDark/60 text-textSecondary hover:text-peach hover:border-peach/50 whitespace-nowrap"
          >
            + New day
          </button>
        </AdminOnly>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 no-print">
        <Stat label="Activities" value={String(dayActivities.length)} />
        <Stat label="Planned time" value={formatDuration(plannedMins)} />
        <Stat label="Planned cost" value={formatBDT(plannedCost)} />
        <Stat
          label="Conflicts"
          value={String(conflicts.length)}
          accent={conflicts.length > 0 ? "coral" : undefined}
        />
      </div>

      {conflicts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-coral/40 bg-coral/10 p-4 pv-fade-up no-print">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-textPrimary font-medium mb-1">
                {conflicts.length} scheduling{" "}
                {conflicts.length === 1 ? "issue" : "issues"} on Day{" "}
                {activeDay + 1}
              </p>
              <ul className="text-xs text-textSecondary space-y-0.5">
                {conflicts.map((c, i) => (
                  <li key={i}>• {c.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === "compact" ? (
        <CompactView
          days={dayIndices.map((idx) => ({
            dayIndex: idx,
            activities: data.activities
              .filter((a) => a.dayIndex === idx)
              .sort((a, b) => a.order - b.order),
          }))}
          tripStartDate={data.trip.startDate}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {dayActivities.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No activities yet"
                description={
                  isAdmin
                    ? "Add your first activity for this day. Drag the handle to reorder."
                    : "The organizer hasn't added activities for this day yet."
                }
                action={
                  isAdmin ? (
                    <Button onClick={() => setCreating(true)}>
                      <Plus className="w-4 h-4" /> Add Activity
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="relative">
                <div className="absolute left-[22px] top-3 bottom-3 w-px bg-gradient-to-b from-peach/60 via-purpleDark to-transparent no-print" />

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={dayActivities.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {timeline.map(({ activity, gapFromPrev }, i) => {
                        const dur = durationMinutes(
                          activity.startTime,
                          activity.endTime,
                        );
                        const hasConflict = conflictIds.has(activity.id);
                        return (
                          <SortableActivity
                            key={activity.id}
                            id={activity.id}
                            index={i}
                            gapFromPrev={gapFromPrev}
                          >
                            {({ dragHandleProps, isDragging }) => (
                              <ActivityCard
                                activity={activity}
                                durationMinutes={dur}
                                conflict={hasConflict}
                                canEdit={isAdmin}
                                isDragging={isDragging}
                                dragHandleProps={dragHandleProps}
                                onEdit={() => setEditing(activity)}
                                onRemove={() => handleDelete(activity)}
                              />
                            )}
                          </SortableActivity>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-4 no-print">
            <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
              <h3 className="font-serif text-lg text-textPrimary mb-3">
                Day {activeDay + 1} at a glance
              </h3>
              <div className="space-y-3 text-sm">
                <SideRow
                  label="First start"
                  value={dayActivities[0]?.startTime ?? "—"}
                />
                <SideRow
                  label="Last end"
                  value={
                    dayActivities[dayActivities.length - 1]?.endTime ?? "—"
                  }
                />
                <SideRow
                  label="Total activities"
                  value={String(dayActivities.length)}
                />
                <SideRow
                  label="Active time"
                  value={formatDuration(plannedMins)}
                />
                <SideRow label="Planned cost" value={formatBDT(plannedCost)} />
              </div>
            </div>

            <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-5 pv-card">
              <h3 className="font-serif text-lg text-textPrimary mb-3">
                Suggested structure
              </h3>
              <ul className="text-xs text-textSecondary space-y-2">
                <li>• Arrival in Panchagarh in the morning</li>
                <li>• Breakfast near the station or en route</li>
                <li>• Tea gardens and rural roads mid-morning</li>
                <li>• Lunch and rest</li>
                <li>• Border or viewpoint in the afternoon</li>
                <li>• Buffer and station arrival before return train</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      <AdminOnly>
        <>
          <ActivityModal
            open={creating}
            onClose={() => setCreating(false)}
            dayIndex={activeDay}
            onSave={handleCreate}
          />
          <ActivityModal
            open={editing !== null}
            onClose={() => setEditing(null)}
            dayIndex={editing?.dayIndex ?? activeDay}
            initial={editing ?? undefined}
            onSave={(payload) => {
              if (editing) updateActivity(editing.id, payload);
              setEditing(null);
              toast.success("Activity updated", "Saved");
            }}
          />
        </>
      </AdminOnly>
    </div>
  );
}

function SortableActivity({
  id,
  index,
  gapFromPrev,
  children,
}: {
  id: string;
  index: number;
  gapFromPrev: number | null;
  children: (args: {
    dragHandleProps: Record<string, unknown>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative pl-14 pv-fade-up">
      <div className="absolute left-[14px] top-5 w-4 h-4 rounded-full border-2 bg-peach border-midnight no-print" />

      {gapFromPrev !== null && gapFromPrev > 0 && index > 0 && (
        <div className="absolute left-[46px] -top-2 text-[10px] text-textSecondary no-print">
          +{formatDuration(gapFromPrev)} gap
        </div>
      )}

      {children({
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
      })}
    </div>
  );
}

function CompactView({
  days,
  tripStartDate,
}: {
  days: { dayIndex: number; activities: ItineraryActivity[] }[];
  tripStartDate: string | null;
}) {
  const totalActivities = days.reduce((s, d) => s + d.activities.length, 0);
  if (totalActivities === 0) {
    return (
      <EmptyState
        icon={List}
        title="Nothing to show yet"
        description="Add activities and they will appear here in compact form."
      />
    );
  }

  const dayDate = (dayIndex: number): string => {
    if (!tripStartDate) return "";
    const d = new Date(tripStartDate);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="space-y-6 print-compact">
      {days.map(({ dayIndex, activities }) => {
        if (activities.length === 0) return null;
        const dayMins = totalPlannedMinutes(activities);
        const dayCost = totalPlannedCost(activities);
        return (
          <div
            key={dayIndex}
            className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden print-keep"
          >
            <div className="px-5 py-3 border-b border-purpleDark/60 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-lg text-textPrimary">
                Day {dayIndex + 1}
                {tripStartDate && (
                  <span className="text-textSecondary text-sm font-normal ml-2">
                    {dayDate(dayIndex)}
                  </span>
                )}
              </h3>
              <div className="text-[11px] text-textSecondary inline-flex items-center gap-3">
                <span>{activities.length} activities</span>
                <span className="text-peach">{formatDuration(dayMins)}</span>
                <span className="text-gold">{formatBDT(dayCost)}</span>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 bg-midnight/30 text-[10px] uppercase tracking-wider text-textSecondary">
              <div className="col-span-2">Time</div>
              <div className="col-span-5">Activity</div>
              <div className="col-span-2">Destination</div>
              <div className="col-span-2 text-right">Cost</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            <div className="divide-y divide-purpleDark/30">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 px-5 py-3 items-center text-sm"
                >
                  <div className="md:col-span-2 font-mono text-xs text-peach">
                    {a.startTime} – {a.endTime}
                  </div>
                  <div className="md:col-span-5 text-textPrimary">
                    {a.title}
                  </div>
                  <div className="md:col-span-2 text-xs text-textSecondary truncate">
                    {a.destinationName || "—"}
                  </div>
                  <div className="md:col-span-2 text-xs text-gold md:text-right">
                    {a.estimatedCost > 0 ? formatBDT(a.estimatedCost) : "—"}
                  </div>
                  <div className="md:col-span-1 text-[10px] text-textSecondary md:text-right capitalize">
                    {a.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildItineraryText(
  tripName: string,
  days: { dayIndex: number; activities: ItineraryActivity[] }[],
): string {
  const lines: string[] = [];
  lines.push(tripName);
  lines.push("=".repeat(tripName.length));
  lines.push("");

  for (const { dayIndex, activities } of days) {
    if (activities.length === 0) continue;
    lines.push(`DAY ${dayIndex + 1}`);
    lines.push("-".repeat(8));
    for (const a of activities) {
      const time = `${a.startTime}–${a.endTime}`;
      const dest = a.destinationName ? ` @ ${a.destinationName}` : "";
      lines.push(`  ${time}  ${a.title}${dest}`);
      if (a.notes) lines.push(`           ${a.notes}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "coral";
}) {
  return (
    <div className="rounded-xl border border-purpleDark/60 bg-indigoDeep/70 p-4 pv-card">
      <p className="text-[11px] text-textSecondary mb-1">{label}</p>
      <p
        className={`text-lg font-semibold ${
          accent === "coral" ? "text-coral" : "text-textPrimary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-purpleDark/30 last:border-0">
      <span className="text-textSecondary">{label}</span>
      <span className="text-textPrimary">{value}</span>
    </div>
  );
}

function ActivityCard({
  activity,
  durationMinutes: dur,
  conflict,
  canEdit,
  isDragging,
  dragHandleProps,
  onEdit,
  onRemove,
}: {
  activity: ItineraryActivity;
  durationMinutes: number;
  conflict: boolean;
  canEdit: boolean;
  isDragging: boolean;
  dragHandleProps: Record<string, unknown>;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const priorityColor: Record<string, string> = {
    must: "bg-coral/20 text-coral border-coral/40",
    high: "bg-peach/20 text-peach border-peach/40",
    optional: "bg-purpleDark/60 text-textSecondary border-purpleDark",
    backup: "bg-indigoDeep text-textSecondary border-purpleDark",
  };

  return (
    <div
      className={`rounded-2xl border bg-indigoDeep/70 p-4 md:p-5 transition-colors print-keep ${
        conflict
          ? "border-coral/60"
          : "border-purpleDark/60 hover:border-peach/40"
      } ${isDragging ? "shadow-soft ring-2 ring-peach/40" : "pv-card"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {canEdit && (
            <button
              {...dragHandleProps}
              className="p-1.5 rounded-lg text-textSecondary hover:text-peach hover:bg-purpleDark/60 cursor-grab active:cursor-grabbing touch-none no-print shrink-0"
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-midnight/70 text-peach">
                {activity.startTime} – {activity.endTime}
              </span>
              <span className="text-[11px] text-textSecondary">
                {formatDuration(dur)}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                  priorityColor[activity.priority]
                }`}
              >
                {activity.priority}
              </span>
            </div>
            <h3 className="text-textPrimary font-medium truncate">
              {activity.title}
            </h3>
            {activity.destinationName && (
              <p className="text-xs text-textSecondary flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {activity.destinationName}
              </p>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 no-print">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-purpleDark/60 text-textSecondary"
              aria-label="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 rounded hover:bg-coral/20 text-coral"
              aria-label="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-textSecondary mt-3 pt-3 border-t border-purpleDark/40">
        <span className="inline-flex items-center gap-1.5">
          <TransportIcon mode={activity.transportMode} />
          {TRANSPORT_LABELS[activity.transportMode]}
        </span>
        {activity.estimatedCost > 0 && (
          <span className="inline-flex items-center gap-1.5 text-gold">
            <Coins className="w-3.5 h-3.5" />
            {formatBDT(activity.estimatedCost)}
          </span>
        )}
        <span className="ml-auto text-[11px] capitalize">
          {activity.status}
        </span>
      </div>

      {activity.notes && (
        <p className="text-xs text-textSecondary mt-3 italic">
          {activity.notes}
        </p>
      )}
    </div>
  );
}

interface Payload {
  title: string;
  destinationName: string;
  startTime: string;
  endTime: string;
  transportMode: TransportMode;
  estimatedCost: number;
  priority: "must" | "high" | "optional" | "backup";
  status: "planned" | "in-progress" | "completed" | "skipped";
  notes: string;
  date: string | null;
}

function ActivityModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  dayIndex: number;
  initial?: ItineraryActivity;
  onSave: (payload: Payload) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [destinationName, setDestinationName] = useState(
    initial?.destinationName ?? "",
  );
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [transportMode, setTransportMode] = useState<TransportMode>(
    initial?.transportMode ?? "other",
  );
  const [estimatedCost, setEstimatedCost] = useState(
    initial?.estimatedCost ?? 0,
  );
  const [priority, setPriority] = useState<Payload["priority"]>(
    initial?.priority ?? "optional",
  );
  const [status, setStatus] = useState<Payload["status"]>(
    initial?.status ?? "planned",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [lastId, setLastId] = useState<string | null>(initial?.id ?? null);
  if (open && (initial?.id ?? null) !== lastId) {
    setLastId(initial?.id ?? null);
    setTitle(initial?.title ?? "");
    setDestinationName(initial?.destinationName ?? "");
    setStartTime(initial?.startTime ?? "09:00");
    setEndTime(initial?.endTime ?? "10:00");
    setTransportMode(initial?.transportMode ?? "other");
    setEstimatedCost(initial?.estimatedCost ?? 0);
    setPriority(initial?.priority ?? "optional");
    setStatus(initial?.status ?? "planned");
    setNotes(initial?.notes ?? "");
  }

  const durationMins = timeToMinutes(endTime) - timeToMinutes(startTime);
  const durationLabel =
    durationMins > 0
      ? formatDuration(durationMins)
      : durationMins === 0
        ? "0m"
        : "ends before start";

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      destinationName: destinationName.trim(),
      startTime,
      endTime,
      transportMode,
      estimatedCost: Math.max(0, Math.round(estimatedCost)),
      priority,
      status,
      notes,
      date: initial?.date ?? null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Activity" : "New Activity"}
      width="md"
    >
      <div className="space-y-4">
        <TextInput
          label="Activity title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunrise at Kanchanjanga viewpoint"
          autoFocus
        />

        <TextInput
          label="Destination / location"
          value={destinationName}
          onChange={(e) => setDestinationName(e.target.value)}
          placeholder="e.g. Tetulia"
        />

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Start time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TextInput
            label="End time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-textSecondary -mt-2">
          Duration: <span className="text-peach">{durationLabel}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Transport"
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as TransportMode)}
          >
            {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((m) => (
              <option key={m} value={m}>
                {TRANSPORT_LABELS[m]}
              </option>
            ))}
          </Select>
          <TextInput
            label="Estimated cost (৳)"
            type="number"
            min={0}
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(Number(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Payload["priority"])}
          >
            <option value="must">Must visit</option>
            <option value="high">High</option>
            <option value="optional">Optional</option>
            <option value="backup">Backup</option>
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Payload["status"])}
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </Select>
        </div>

        <TextArea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember — meeting point, contact, alternative plan…"
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-textSecondary hover:text-textPrimary inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <Button onClick={handleSave} disabled={!canSave}>
            {initial ? "Save changes" : "Add activity"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
