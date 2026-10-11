import { useState } from "react";
import {
  Settings,
  Calendar,
  Wallet,
  Tag,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Power,
  Info,
  Save,
  AlertTriangle,
  RotateCcw,
  UserCog,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useStore } from "../lib/store";
import { sampleDestinations } from "../lib/sampleData";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmProvider";
import { formatBDT } from "../lib/money";
import Button from "../components/PrimaryButton";
import { Select, TextArea, TextInput } from "../components/FormField";
import AdminAccounts from "../components/AdminAccounts";
import Reveal from "../components/Reveal";
import type { TripStatus } from "../lib/types";

type Tab = "trip" | "accounts" | "categories" | "info";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("trip");

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="mb-6 pv-fade-up">
        <h1 className="font-serif text-3xl md:text-4xl text-textPrimary mb-1">
          Admin
        </h1>
        <p className="text-textSecondary text-sm">
          Trip settings, accounts, expense categories, and app information.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {(
          [
            { key: "trip", label: "Trip settings", Icon: Settings },
            { key: "accounts", label: "Accounts", Icon: UserCog },
            { key: "categories", label: "Categories", Icon: Tag },
            { key: "info", label: "Info", Icon: Info },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors inline-flex items-center gap-2 ${
              tab === key
                ? "bg-peach text-midnight font-medium"
                : "bg-indigoDeep border border-purpleDark/60 text-textSecondary hover:text-textPrimary"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "trip" && <TripSettingsTab />}
      {tab === "accounts" && <AdminAccounts />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "info" && <InfoTab />}
    </div>
  );
}

function TripSettingsTab() {
  const { data, updateTrip } = useStore();
  const { trip } = data;
  const toast = useToast();
  const confirm = useConfirm();

  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description);
  const [startDate, setStartDate] = useState(trip.startDate ?? "");
  const [endDate, setEndDate] = useState(trip.endDate ?? "");
  const [status, setStatus] = useState<TripStatus>(trip.status);
  const [reserveMode, setReserveMode] = useState(trip.emergencyReserveMode);
  const [reserveValue, setReserveValue] = useState(trip.emergencyReserveValue);

  const handleSave = async () => {
    if (startDate && endDate && endDate < startDate) {
      const ok = await confirm({
        title: "End date is before start date",
        message: "This may cause display issues. Save anyway?",
        confirmText: "Save anyway",
      });
      if (!ok) return;
    }
    updateTrip({
      name: name.trim() || "Untitled Trip",
      description: description.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      status,
      emergencyReserveMode: reserveMode,
      emergencyReserveValue: Math.max(0, Number(reserveValue) || 0),
    });
    toast.success("Trip settings saved", "Saved");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Reveal>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-peach" />
            Basic information
          </h2>

          <div className="space-y-4">
            <TextInput
              label="Trip name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextInput
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <TextInput
                label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Select
              label="Trip status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
            >
              <option value="planning">Planning</option>
              <option value="confirmed">Confirmed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-peach" />
            Emergency reserve
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Calculation basis"
              value={reserveMode}
              onChange={(e) =>
                setReserveMode(e.target.value as "fixed" | "percent")
              }
            >
              <option value="percent">Percentage of planned budget</option>
              <option value="fixed">Fixed amount</option>
            </Select>
            <TextInput
              label={reserveMode === "percent" ? "Percent (%)" : "Amount (৳)"}
              type="number"
              min={0}
              value={reserveValue}
              onChange={(e) => setReserveValue(Number(e.target.value) || 0)}
            />
          </div>
        </section>
      </Reveal>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4" /> Save trip settings
        </Button>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { data, addCategory, updateCategory, removeCategory, reorderCategory } =
    useStore();
  const toast = useToast();
  const confirm = useConfirm();

  const [newName, setNewName] = useState("");

  const sorted = [...data.categories].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory(newName.trim());
    toast.success(`"${newName.trim()}" added`, "Category created");
    setNewName("");
  };

  const handleRemove = async (id: string, name: string) => {
    const inUse = data.expenses.filter((e) => e.categoryId === id).length;
    const ok = await confirm({
      title: `Delete category "${name}"?`,
      message:
        inUse > 0
          ? `${inUse} expense${inUse === 1 ? "" : "s"} currently use this category. They will be left without a category.`
          : "This category is not in use and can be safely deleted.",
      confirmText: "Delete",
      danger: true,
    });
    if (ok) {
      removeCategory(id);
      toast.success("Category deleted", "Removed");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Reveal>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-peach" />
            Add category
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Souvenirs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-midnight/60 border border-purpleDark/70 text-textPrimary text-sm focus:outline-none focus:border-peach/60"
            />
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 overflow-hidden">
          <div className="px-6 py-4 border-b border-purpleDark/60">
            <h2 className="font-serif text-lg text-textPrimary">
              Categories ({sorted.length})
            </h2>
          </div>
          <div className="divide-y divide-purpleDark/40">
            {sorted.map((c, i) => {
              const count = data.expenses.filter(
                (e) => e.categoryId === c.id,
              ).length;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-6 py-3 transition-opacity ${
                    c.active ? "" : "opacity-50"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => reorderCategory(c.id, -1)}
                      disabled={i === 0}
                      className="p-0.5 rounded hover:bg-purpleDark/60 text-textSecondary disabled:opacity-20"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => reorderCategory(c.id, 1)}
                      disabled={i === sorted.length - 1}
                      className="p-0.5 rounded hover:bg-purpleDark/60 text-textSecondary disabled:opacity-20"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        updateCategory(c.id, { name: e.target.value })
                      }
                      className="w-full bg-transparent text-sm text-textPrimary border-b border-transparent hover:border-purpleDark/60 focus:border-peach/60 focus:outline-none py-1"
                    />
                    <p className="text-[10px] text-textSecondary mt-0.5">
                      {count} expense{count === 1 ? "" : "s"}
                      {c.isSystem && " · built-in"}
                      {!c.active && " · inactive"}
                    </p>
                  </div>
                  <button
                    onClick={() => updateCategory(c.id, { active: !c.active })}
                    className={`p-2 rounded-lg transition-colors ${
                      c.active
                        ? "text-forest hover:bg-forest/20"
                        : "text-textSecondary hover:bg-purpleDark/60"
                    }`}
                    aria-label={c.active ? "Deactivate" : "Activate"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(c.id, c.name)}
                    className="p-2 rounded-lg hover:bg-coral/20 text-coral"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function InfoTab() {
  const { data, addDestination, resetAll } = useStore();
  const toast = useToast();
  const confirm = useConfirm();

  const stats = {
    participants: data.participants.length,
    contributions: data.contributions.length,
    expenses: data.expenses.length,
    destinations: data.destinations.length,
    activities: data.activities.length,
    attachments: data.attachments.length,
    categories: data.categories.length,
  };

  const planned = data.expenses
    .filter((e) => e.kind === "planned")
    .reduce((s, e) => s + e.plannedAmount, 0);
  const actual = data.expenses
    .filter((e) => e.kind === "actual")
    .reduce((s, e) => s + e.actualAmount, 0);

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset all trip data?",
      message:
        "This erases all participants, expenses, itinerary, destinations, and settings. User accounts are not affected. Cannot be undone.",
      confirmText: "Reset everything",
      danger: true,
    });
    if (ok) {
      await resetAll();
      toast.info("Trip data reset to sample state", "Reset complete");
    }
  };

  const handleSeedDestinations = async () => {
    const ok = await confirm({
      title: "Add sample destinations?",
      message:
        "This adds three fully-written destination articles (Banglabandha, Tetulia, Kanchanjanga). It will not remove your existing destinations.",
      confirmText: "Add samples",
    });
    if (!ok) return;
    const samples = sampleDestinations();
    for (const d of samples) {
      addDestination(d);
    }
    toast.success(
      `${samples.length} sample destinations added`,
      "Ready to explore",
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Reveal>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5 flex items-center gap-2">
            <Info className="w-4 h-4 text-peach" />
            Application
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="App" value="Northscape" />
            <Row label="Theme" value="Kanchanjanga Dawn" />
            <Row label="Schema version" value="1" />
            <Row label="Storage" value="Firebase (Firestore, cloud-synced)" />
            <Row label="Images" value="Cloudinary" />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/70 p-6">
          <h2 className="font-serif text-lg text-textPrimary mb-5">
            Data summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Stat label="Participants" value={String(stats.participants)} />
            <Stat label="Contributions" value={String(stats.contributions)} />
            <Stat label="Expenses" value={String(stats.expenses)} />
            <Stat label="Categories" value={String(stats.categories)} />
            <Stat label="Destinations" value={String(stats.destinations)} />
            <Stat label="Activities" value={String(stats.activities)} />
            <Stat label="Attachments" value={String(stats.attachments)} />
          </div>
          <div className="mt-5 pt-5 border-t border-purpleDark/40 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Planned totals" value={formatBDT(planned)} />
            <Stat label="Actual totals" value={formatBDT(actual)} />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.16}>
        <section className="rounded-2xl border border-peach/30 bg-peach/5 p-6">
          <h2 className="font-serif text-lg text-peach mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Sample content
          </h2>
          <p className="text-xs text-textSecondary mb-4 leading-relaxed">
            Pre-written sample destinations for Panchagarh — Banglabandha Zero
            Point, Tetulia Tea Gardens, and Kanchanjanga Viewpoint. Each is a
            fully laid-out article. Add them now, then edit the text and cover
            images to match your own trip.
          </p>
          <Button variant="secondary" onClick={handleSeedDestinations}>
            <MapPin className="w-4 h-4" /> Add sample destinations
          </Button>
        </section>
      </Reveal>

      <Reveal delay={0.24}>
        <section className="rounded-2xl border border-coral/30 bg-coral/5 p-6">
          <h2 className="font-serif text-lg text-coral mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Reset
          </h2>
          <p className="text-xs text-textSecondary mb-4 leading-relaxed">
            This erases all trip data and restores the sample state. It does not
            delete user accounts. Back up first if you want to keep anything.
          </p>
          <Button variant="danger" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" /> Reset all data
          </Button>
        </section>
      </Reveal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-purpleDark/30 last:border-0">
      <span className="text-textSecondary">{label}</span>
      <span className="text-textPrimary">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-purpleDark/60 bg-midnight/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-textSecondary mb-1">
        {label}
      </p>
      <p className="text-sm text-textPrimary font-medium truncate">{value}</p>
    </div>
  );
}
