import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { firestore, TRIP_DOC_COLLECTION, TRIP_DOC_ID } from "./firebase";
import { useAuth } from "./auth";
import { createEmptyAppData, createInitialData } from "./sampleData";
import { clearAllBlobs, deleteBlob, putBlob } from "./db";
import type {
  AppData,
  Attachment,
  Contribution,
  Destination,
  Expense,
  ExpenseCategory,
  ID,
  ItineraryActivity,
  Participant,
  Trip,
} from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface StoreContextValue {
  ready: boolean;
  data: AppData;
  saveState: SaveState;
  lastSavedAt: string | null;

  updateTrip: (patch: Partial<Trip>) => void;

  addParticipant: (p: Partial<Participant>) => Participant;
  updateParticipant: (id: ID, patch: Partial<Participant>) => void;
  removeParticipant: (id: ID) => void;

  upsertContribution: (
    c: Partial<Contribution> & { participantId: ID },
  ) => void;
  removeContribution: (id: ID) => void;

  addExpense: (e: Partial<Expense>) => Expense;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  removeExpense: (id: ID) => void;
  restoreExpense: (expense: Expense) => void;

  addCategory: (name: string) => ExpenseCategory;
  updateCategory: (id: ID, patch: Partial<ExpenseCategory>) => void;
  removeCategory: (id: ID) => void;
  restoreCategory: (category: ExpenseCategory) => void;
  reorderCategory: (id: ID, direction: -1 | 1) => void;

  addDestination: (d: Partial<Destination>) => Destination;
  updateDestination: (id: ID, patch: Partial<Destination>) => void;
  removeDestination: (id: ID) => void;
  restoreDestination: (destination: Destination) => void;

  addActivity: (a: Partial<ItineraryActivity>) => ItineraryActivity;
  updateActivity: (id: ID, patch: Partial<ItineraryActivity>) => void;
  removeActivity: (id: ID) => void;
  restoreActivity: (activity: ItineraryActivity) => void;
  reorderActivity: (id: ID, direction: -1 | 1) => void;
  reorderActivities: (dayIndex: number, orderedIds: ID[]) => void;

  addAttachment: (
    a: Partial<Attachment> & { blob: Blob },
  ) => Promise<Attachment>;
  removeAttachment: (id: ID) => Promise<void>;

  exportBackup: () => AppData;
  importBackup: (data: AppData) => void;
  resetAll: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function uid(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${uuid}`;
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<AppData>(() => createEmptyAppData());
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const saveTimeout = useRef<number | null>(null);
  // Every mutation bumps this. When the server confirms our latest write,
  // we copy the current value into `lastSyncedSeqRef`.
  const mutationSeqRef = useRef(0);
  const lastSyncedSeqRef = useRef(0);
  // Last serialized string we know matches the server's copy of the doc.
  const serverKnownStrRef = useRef("");
  const hasSeeded = useRef(false);
  // Live mirror of `isAdmin` for use inside event handlers without
  // re-subscribing the whole effect on every auth change.
  const isAdminRef = useRef(isAdmin);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // -------------------------------------------------------------------------
  // Real-time subscription — runs once auth state is settled.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;

    const docRef = doc(firestore, TRIP_DOC_COLLECTION, TRIP_DOC_ID);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as AppData;
          if (!remote || remote.schemaVersion !== 1) {
            setReady(true);
            return;
          }

          const remoteStr = stableStringify(remote);

          // If the admin has unsynced local changes, ignore the remote
          // snapshot so we don't wipe what they just did.
          if (mutationSeqRef.current > lastSyncedSeqRef.current) {
            setReady(true);
            return;
          }

          // Adopt the remote snapshot if it differs from what we know.
          if (remoteStr !== serverKnownStrRef.current) {
            serverKnownStrRef.current = remoteStr;
            lastSyncedSeqRef.current = mutationSeqRef.current;
            setData(remote);
          }
        } else {
          // Document doesn't exist yet. Seed it once, if we're admin.
          if (isAdminRef.current && !hasSeeded.current) {
            hasSeeded.current = true;
            const initial = createInitialData();
            const initialStr = stableStringify(initial);
            serverKnownStrRef.current = initialStr;
            lastSyncedSeqRef.current = mutationSeqRef.current;
            setData(initial);
            setDoc(docRef, initial).catch((err) =>
              console.error("Failed to seed tripData:", err),
            );
          }
        }
        setReady(true);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setReady(true);
      },
    );
    return () => unsub();
  }, [authLoading]);

  // -------------------------------------------------------------------------
  // Debounced writes back to Firestore (admin only)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!ready || !isAdmin) return;

    const currentStr = stableStringify(data);

    // Nothing to write — matches what the server knows.
    if (currentStr === serverKnownStrRef.current) {
      lastSyncedSeqRef.current = mutationSeqRef.current;
      return;
    }

    const mySeq = mutationSeqRef.current;
    setSaveState("saving");

    if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      const docRef = doc(firestore, TRIP_DOC_COLLECTION, TRIP_DOC_ID);
      // Capture data at this exact moment so nothing else can change it.
      const payload = data;
      const payloadStr = currentStr;

      setDoc(docRef, payload)
        .then(() => {
          serverKnownStrRef.current = payloadStr;
          lastSyncedSeqRef.current = Math.max(lastSyncedSeqRef.current, mySeq);
          setSaveState("saved");
          setLastSavedAt(new Date().toISOString());
        })
        .catch((err) => {
          console.error("Failed to save to Firestore:", err);
          setSaveState("error");
          // IMPORTANT: do NOT reset serverKnownStrRef or lastSyncedSeqRef.
          // Keeping them intact means a failed write won't get overwritten
          // by a stale snapshot. The next mutation will retry.
        });
    }, 400);

    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    };
  }, [data, ready, isAdmin]);

  const mutate = useCallback((updater: (prev: AppData) => AppData) => {
    mutationSeqRef.current += 1;
    setData((prev) => ({ ...updater(prev) }));
  }, []);

  // ------------------------------------------------------------------
  // Trip
  // ------------------------------------------------------------------
  const updateTrip = useCallback(
    (patch: Partial<Trip>) =>
      mutate((prev) => ({
        ...prev,
        trip: { ...prev.trip, ...patch, updatedAt: new Date().toISOString() },
      })),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Participants
  // ------------------------------------------------------------------
  const addParticipant = useCallback(
    (p: Partial<Participant>) => {
      const now = new Date().toISOString();
      const record: Participant = {
        id: uid("p"),
        name: p.name?.trim() || "New Participant",
        nickname: p.nickname ?? "",
        photoUrl: p.photoUrl ?? "",
        contact: p.contact ?? "",
        status: p.status ?? "confirmed",
        notes: p.notes ?? "",
        createdAt: now,
        updatedAt: now,
      };
      mutate((prev) => ({
        ...prev,
        participants: [...prev.participants, record],
      }));
      return record;
    },
    [mutate],
  );

  const updateParticipant = useCallback(
    (id: ID, patch: Partial<Participant>) =>
      mutate((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id
            ? { ...p, ...patch, updatedAt: new Date().toISOString() }
            : p,
        ),
      })),
    [mutate],
  );

  const removeParticipant = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== id),
        contributions: prev.contributions.filter((c) => c.participantId !== id),
      })),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Contributions
  // ------------------------------------------------------------------
  const upsertContribution = useCallback(
    (c: Partial<Contribution> & { participantId: ID }) => {
      const now = new Date().toISOString();
      mutate((prev) => {
        const existing = prev.contributions.find(
          (x) => x.participantId === c.participantId,
        );
        if (existing) {
          return {
            ...prev,
            contributions: prev.contributions.map((x) =>
              x.id === existing.id ? { ...x, ...c } : x,
            ),
          };
        }
        const record: Contribution = {
          id: uid("c"),
          participantId: c.participantId,
          plannedAmount: c.plannedAmount ?? 0,
          actualAmount: c.actualAmount ?? 0,
          date: c.date ?? now.slice(0, 10),
          notes: c.notes ?? "",
          createdAt: now,
        };
        return { ...prev, contributions: [...prev.contributions, record] };
      });
    },
    [mutate],
  );

  const removeContribution = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        contributions: prev.contributions.filter((c) => c.id !== id),
      })),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Expenses
  // ------------------------------------------------------------------
  const addExpense = useCallback(
    (e: Partial<Expense>) => {
      const now = new Date().toISOString();
      const record: Expense = {
        id: uid("e"),
        description: e.description ?? "New Expense",
        categoryId: e.categoryId ?? "",
        kind: e.kind ?? "planned",
        amount: e.amount ?? 0,
        plannedAmount: e.plannedAmount ?? e.amount ?? 0,
        actualAmount: e.actualAmount ?? 0,
        status: e.status ?? "unpaid",
        date: e.date ?? now.slice(0, 10),
        paidBy: e.paidBy ?? "pool",
        allocationMethod: e.allocationMethod ?? "equal",
        eligibleParticipantIds: e.eligibleParticipantIds ?? [],
        weights: e.weights ?? {},
        receiptAttachmentId: e.receiptAttachmentId ?? null,
        notes: e.notes ?? "",
        createdAt: now,
        updatedAt: now,
      };
      mutate((prev) => ({ ...prev, expenses: [...prev.expenses, record] }));
      return record;
    },
    [mutate],
  );

  const updateExpense = useCallback(
    (id: ID, patch: Partial<Expense>) =>
      mutate((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === id
            ? { ...e, ...patch, updatedAt: new Date().toISOString() }
            : e,
        ),
      })),
    [mutate],
  );

  const removeExpense = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      })),
    [mutate],
  );

  const restoreExpense = useCallback(
    (expense: Expense) =>
      mutate((prev) => ({
        ...prev,
        expenses: [...prev.expenses, expense],
      })),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------------
  const addCategory = useCallback(
    (name: string) => {
      const record: ExpenseCategory = {
        id: uid("cat"),
        name: name.trim() || "New Category",
        order: 999,
        active: true,
        isSystem: false,
      };
      mutate((prev) => {
        const maxOrder = prev.categories.reduce(
          (m, c) => Math.max(m, c.order),
          0,
        );
        return {
          ...prev,
          categories: [...prev.categories, { ...record, order: maxOrder + 1 }],
        };
      });
      return record;
    },
    [mutate],
  );

  const updateCategory = useCallback(
    (id: ID, patch: Partial<ExpenseCategory>) =>
      mutate((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      })),
    [mutate],
  );

  const removeCategory = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      })),
    [mutate],
  );

  const restoreCategory = useCallback(
    (category: ExpenseCategory) =>
      mutate((prev) => ({
        ...prev,
        categories: [...prev.categories, category],
      })),
    [mutate],
  );

  const reorderCategory = useCallback(
    (id: ID, direction: -1 | 1) =>
      mutate((prev) => {
        const sorted = [...prev.categories].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((c) => c.id === id);
        const swap = idx + direction;
        if (idx < 0 || swap < 0 || swap >= sorted.length) return prev;
        const tmp = sorted[idx].order;
        sorted[idx] = { ...sorted[idx], order: sorted[swap].order };
        sorted[swap] = { ...sorted[swap], order: tmp };
        return { ...prev, categories: sorted };
      }),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Destinations
  // ------------------------------------------------------------------
  const addDestination = useCallback(
    (d: Partial<Destination>) => {
      const now = new Date().toISOString();
      const record: Destination = {
        id: uid("d"),
        name: d.name ?? "New Destination",
        description: d.description ?? "",
        coverImageUrl: d.coverImageUrl ?? "",
        location: d.location ?? "",
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        distanceFromPreviousKm: d.distanceFromPreviousKm ?? null,
        estimatedTravelMinutes: d.estimatedTravelMinutes ?? null,
        recommendedVisitMinutes: d.recommendedVisitMinutes ?? null,
        openingHours: d.openingHours ?? "",
        entryFee: d.entryFee ?? null,
        priority: d.priority ?? "optional",
        accessibilityNotes: d.accessibilityNotes ?? "",
        foodAvailable: d.foodAvailable ?? false,
        toiletsAvailable: d.toiletsAvailable ?? false,
        bestTimeToVisit: d.bestTimeToVisit ?? "",
        mapLink: d.mapLink ?? "",
        sourceNote: d.sourceNote ?? "",
        verified: d.verified ?? false,
        createdAt: now,
        updatedAt: now,
        category: d.category ?? "",
        bestTime: d.bestTime ?? "",
        timeNeeded: d.timeNeeded ?? "",
        estCost: d.estCost ?? "",
        status: d.status ?? "planned",
        overview: d.overview ?? "",
        highlights: d.highlights ?? "",
        originStory: d.originStory ?? "",
        history: d.history ?? "",
        visitingTips: d.visitingTips ?? [],
        galleryImageUrls: d.galleryImageUrls ?? [],
        articleAuthor: d.articleAuthor ?? "",
      };
      mutate((prev) => ({
        ...prev,
        destinations: [...prev.destinations, record],
      }));
      return record;
    },
    [mutate],
  );

  const updateDestination = useCallback(
    (id: ID, patch: Partial<Destination>) =>
      mutate((prev) => ({
        ...prev,
        destinations: prev.destinations.map((d) =>
          d.id === id
            ? { ...d, ...patch, updatedAt: new Date().toISOString() }
            : d,
        ),
      })),
    [mutate],
  );

  const removeDestination = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        destinations: prev.destinations.filter((d) => d.id !== id),
      })),
    [mutate],
  );

  const restoreDestination = useCallback(
    (destination: Destination) =>
      mutate((prev) => ({
        ...prev,
        destinations: [...prev.destinations, destination],
      })),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Activities
  // ------------------------------------------------------------------
  const addActivity = useCallback(
    (a: Partial<ItineraryActivity>) => {
      const now = new Date().toISOString();
      const record: ItineraryActivity = {
        id: uid("a"),
        dayIndex: a.dayIndex ?? 0,
        order: a.order ?? 999,
        title: a.title ?? "New Activity",
        destinationId: a.destinationId ?? null,
        destinationName: a.destinationName ?? "",
        date: a.date ?? null,
        startTime: a.startTime ?? "09:00",
        endTime: a.endTime ?? "10:00",
        transportMode: a.transportMode ?? "other",
        estimatedCost: a.estimatedCost ?? 0,
        actualCost: a.actualCost ?? 0,
        priority: a.priority ?? "optional",
        status: a.status ?? "planned",
        notes: a.notes ?? "",
        attachmentId: a.attachmentId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      mutate((prev) => {
        const dayActivities = prev.activities.filter(
          (x) => x.dayIndex === record.dayIndex,
        );
        const maxOrder = dayActivities.reduce(
          (m, x) => Math.max(m, x.order),
          0,
        );
        return {
          ...prev,
          activities: [...prev.activities, { ...record, order: maxOrder + 1 }],
        };
      });
      return record;
    },
    [mutate],
  );

  const updateActivity = useCallback(
    (id: ID, patch: Partial<ItineraryActivity>) =>
      mutate((prev) => ({
        ...prev,
        activities: prev.activities.map((a) =>
          a.id === id
            ? { ...a, ...patch, updatedAt: new Date().toISOString() }
            : a,
        ),
      })),
    [mutate],
  );

  const removeActivity = useCallback(
    (id: ID) =>
      mutate((prev) => ({
        ...prev,
        activities: prev.activities.filter((a) => a.id !== id),
      })),
    [mutate],
  );

  const restoreActivity = useCallback(
    (activity: ItineraryActivity) =>
      mutate((prev) => ({
        ...prev,
        activities: [...prev.activities, activity],
      })),
    [mutate],
  );

  const reorderActivity = useCallback(
    (id: ID, direction: -1 | 1) =>
      mutate((prev) => {
        const a = prev.activities.find((x) => x.id === id);
        if (!a) return prev;
        const dayList = [...prev.activities]
          .filter((x) => x.dayIndex === a.dayIndex)
          .sort((x, y) => x.order - y.order);
        const idx = dayList.findIndex((x) => x.id === id);
        const swap = idx + direction;
        if (swap < 0 || swap >= dayList.length) return prev;
        const tmp = dayList[idx].order;
        dayList[idx] = { ...dayList[idx], order: dayList[swap].order };
        dayList[swap] = { ...dayList[swap], order: tmp };
        const map = new Map(dayList.map((x) => [x.id, x]));
        return {
          ...prev,
          activities: prev.activities.map((x) => map.get(x.id) ?? x),
        };
      }),
    [mutate],
  );

  const reorderActivities = useCallback(
    (dayIndex: number, orderedIds: ID[]) =>
      mutate((prev) => {
        const orderMap = new Map<ID, number>();
        orderedIds.forEach((id, idx) => orderMap.set(id, idx + 1));
        return {
          ...prev,
          activities: prev.activities.map((a) =>
            a.dayIndex === dayIndex && orderMap.has(a.id)
              ? { ...a, order: orderMap.get(a.id)! }
              : a,
          ),
        };
      }),
    [mutate],
  );

  // ------------------------------------------------------------------
  // Attachments
  // ------------------------------------------------------------------
  const addAttachment = useCallback(
    async (a: Partial<Attachment> & { blob: Blob }) => {
      const id = uid("att");
      const blobId = uid("blob");
      await putBlob(blobId, a.blob);
      const now = new Date().toISOString();
      const record: Attachment = {
        id,
        title: a.title ?? a.fileName ?? "Attachment",
        category: a.category ?? "misc",
        fileName: a.fileName ?? "file",
        mimeType: (a.mimeType ?? a.blob.type) || "application/octet-stream",
        sizeBytes: a.sizeBytes ?? a.blob.size,
        blobId,
        date: a.date ?? now.slice(0, 10),
        notes: a.notes ?? "",
        createdAt: now,
      };
      mutate((prev) => ({
        ...prev,
        attachments: [...prev.attachments, record],
      }));
      return record;
    },
    [mutate],
  );

  const removeAttachment = useCallback(
    async (id: ID) => {
      const existing = data.attachments.find((a) => a.id === id);
      if (existing) await deleteBlob(existing.blobId);
      mutate((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== id),
      }));
    },
    [data.attachments, mutate],
  );

  // ------------------------------------------------------------------
  // Backup / restore
  // ------------------------------------------------------------------
  const exportBackup = useCallback(() => data, [data]);

  const importBackup = useCallback((incoming: AppData) => {
    if (!incoming || incoming.schemaVersion !== 1) {
      throw new Error("Unsupported backup format or schema version.");
    }
    mutationSeqRef.current += 1;
    serverKnownStrRef.current = "";
    lastSyncedSeqRef.current = mutationSeqRef.current - 1;
    setData(incoming);
  }, []);

  const resetAll = useCallback(async () => {
    await clearAllBlobs();
    const fresh = createInitialData();
    mutationSeqRef.current += 1;
    serverKnownStrRef.current = "";
    lastSyncedSeqRef.current = mutationSeqRef.current - 1;
    setData(fresh);
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      data,
      saveState,
      lastSavedAt,
      updateTrip,
      addParticipant,
      updateParticipant,
      removeParticipant,
      upsertContribution,
      removeContribution,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      addCategory,
      updateCategory,
      removeCategory,
      restoreCategory,
      reorderCategory,
      addDestination,
      updateDestination,
      removeDestination,
      restoreDestination,
      addActivity,
      updateActivity,
      removeActivity,
      restoreActivity,
      reorderActivity,
      reorderActivities,
      addAttachment,
      removeAttachment,
      exportBackup,
      importBackup,
      resetAll,
    }),
    [
      ready,
      data,
      saveState,
      lastSavedAt,
      updateTrip,
      addParticipant,
      updateParticipant,
      removeParticipant,
      upsertContribution,
      removeContribution,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      addCategory,
      updateCategory,
      removeCategory,
      restoreCategory,
      reorderCategory,
      addDestination,
      updateDestination,
      removeDestination,
      restoreDestination,
      addActivity,
      updateActivity,
      removeActivity,
      restoreActivity,
      reorderActivity,
      reorderActivities,
      addAttachment,
      removeAttachment,
      exportBackup,
      importBackup,
      resetAll,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
