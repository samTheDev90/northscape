// ============================================================================
// Panchagarh Voyage — Core Data Model
// ============================================================================

export type ID = string;

export type TripStatus =
  | "planning"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type ParticipantStatus = "confirmed" | "tentative" | "cancelled";

export type ExpenseKind = "planned" | "actual";

export type ExpenseStatus = "unpaid" | "partial" | "paid";

export type AllocationMethod = "equal" | "weighted" | "selected";

export type DestinationPriority = "must" | "high" | "optional" | "backup";

export type DestinationStatus = "planned" | "visited" | "wishlist";

export type ActivityStatus =
  | "planned"
  | "in-progress"
  | "completed"
  | "skipped";

export type TransportMode =
  | "train"
  | "bus"
  | "auto-rickshaw"
  | "cng"
  | "reserved-vehicle"
  | "walking"
  | "other";

export type AttachmentCategory =
  | "train-ticket"
  | "budget"
  | "accommodation"
  | "transport"
  | "itinerary"
  | "destination"
  | "receipt"
  | "photo"
  | "misc";

export type UserRole = "admin" | "participant";

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface Invite {
  code: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
  createdBy: string;
  used: boolean;
  usedBy: string | null;
  usedAt: string | null;
}

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

export interface Trip {
  id: ID;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: TripStatus;
  emergencyReserveMode: "fixed" | "percent";
  emergencyReserveValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: ID;
  name: string;
  nickname: string;
  photoUrl: string;
  contact: string;
  status: ParticipantStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: ID;
  participantId: ID;
  plannedAmount: number;
  actualAmount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: ID;
  description: string;
  categoryId: ID;
  kind: ExpenseKind;
  amount: number;
  plannedAmount: number;
  actualAmount: number;
  status: ExpenseStatus;
  date: string;
  paidBy: ID | "pool";
  allocationMethod: AllocationMethod;
  eligibleParticipantIds: ID[];
  weights: Record<ID, number>;
  receiptAttachmentId: ID | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: ID;
  name: string;
  order: number;
  active: boolean;
  isSystem: boolean;
}

// ---------------------------------------------------------------------------
// Destination — full article-capable record
// ---------------------------------------------------------------------------

export interface Destination {
  id: ID;
  name: string;
  description: string;
  coverImageUrl: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distanceFromPreviousKm: number | null;
  estimatedTravelMinutes: number | null;
  recommendedVisitMinutes: number | null;
  openingHours: string;
  entryFee: number | null;
  priority: DestinationPriority;
  accessibilityNotes: string;
  foodAvailable: boolean;
  toiletsAvailable: boolean;
  bestTimeToVisit: string;
  mapLink: string;
  sourceNote: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;

  // --- Article fields (all optional, gracefully absent) ---
  category: string; // e.g. "Nature", "Landmark"
  bestTime: string; // e.g. "Sunrise"
  timeNeeded: string; // e.g. "1–2 hrs"
  estCost: string; // e.g. "Free" or "৳50"
  status: DestinationStatus;
  overview: string; // long-form "About this place"
  highlights: string; // "Specialty & highlights"
  originStory: string; // quoted or italic origin
  history: string; // "History" section
  visitingTips: string[]; // sidebar bullet list
  galleryImageUrls: string[]; // gallery grid
  articleAuthor: string; // e.g. "Trip Organizer"
}

export interface ItineraryActivity {
  id: ID;
  dayIndex: number;
  order: number;
  title: string;
  destinationId: ID | null;
  destinationName: string;
  date: string | null;
  startTime: string;
  endTime: string;
  transportMode: TransportMode;
  estimatedCost: number;
  actualCost: number;
  priority: DestinationPriority;
  status: ActivityStatus;
  notes: string;
  attachmentId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: ID;
  title: string;
  category: AttachmentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobId: ID;
  date: string | null;
  notes: string;
  createdAt: string;
}

export interface AppData {
  schemaVersion: number;
  trip: Trip;
  participants: Participant[];
  contributions: Contribution[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  destinations: Destination[];
  activities: ItineraryActivity[];
  attachments: Attachment[];
}
