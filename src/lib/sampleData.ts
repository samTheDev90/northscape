// Initial sample data so the UI has something to show on first run.

import { newId } from "./id";
import type {
  AppData,
  Destination,
  ExpenseCategory,
  Participant,
  Trip,
} from "./types";

export function createEmptyTrip(): Trip {
  const now = new Date().toISOString();
  return {
    id: newId("trip"),
    name: "Panchagarh Winter Trip",
    description:
      "A winter voyage to Panchagarh — tea gardens, sunrise, and rural Bengal.",
    startDate: null,
    endDate: null,
    status: "planning",
    emergencyReserveMode: "percent",
    emergencyReserveValue: 10,
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultCategories(): ExpenseCategory[] {
  const names = [
    "Train tickets — outbound",
    "Train tickets — return",
    "Local transport",
    "Food & drinking water",
    "Tea gardens & attractions",
    "Tickets & entry fees",
    "Accommodation (optional)",
    "Village experiences",
    "Guide / local assistance",
    "Emergency reserve",
    "Miscellaneous",
  ];
  return names.map((name, i) => ({
    id: newId("cat"),
    name,
    order: i,
    active: true,
    isSystem: true,
  }));
}

export function sampleParticipants(): Participant[] {
  const now = new Date().toISOString();
  const names = ["Shahriar", "Rafi", "Tanvir", "Nadia"];
  return names.map((name) => ({
    id: newId("p"),
    name,
    nickname: "",
    photoUrl: "",
    contact: "",
    status: "confirmed",
    notes: "",
    createdAt: now,
    updatedAt: now,
  }));
}

// ---------------------------------------------------------------------------
// Sample destinations with fully written articles and coordinates
// ---------------------------------------------------------------------------

export function sampleDestinations(): Destination[] {
  const now = new Date().toISOString();

  const base: Omit<Destination, "id" | "name" | "description" | "location"> = {
    createdAt: now,
    updatedAt: now,
    verified: false,
    foodAvailable: false,
    toiletsAvailable: false,
    coverImageUrl: "",
    latitude: null,
    longitude: null,
    distanceFromPreviousKm: null,
    estimatedTravelMinutes: null,
    recommendedVisitMinutes: null,
    openingHours: "",
    entryFee: null,
    accessibilityNotes: "",
    bestTimeToVisit: "",
    mapLink: "",
    sourceNote: "Sample content — edit with details you trust before travel.",
    articleAuthor: "Trip Organizer",
    galleryImageUrls: [],
    status: "planned",
    priority: "optional",
    category: "",
    bestTime: "",
    timeNeeded: "",
    estCost: "",
    overview: "",
    highlights: "",
    originStory: "",
    history: "",
    visitingTips: [],
  };

  const banglabandha: Destination = {
    ...base,
    id: newId("d"),
    name: "Banglabandha Zero Point",
    description:
      "The northernmost tip of Bangladesh, where the country meets India — a quiet, open landscape under a vast sky.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80",
    location: "Tetulia, Panchagarh",
    latitude: 26.6333,
    longitude: 88.3833,
    priority: "must",
    bestTimeToVisit: "Morning (clear winter days)",
    category: "Landmark",
    bestTime: "Morning",
    timeNeeded: "30–45 min",
    estCost: "Free",
    overview:
      "Banglabandha is the northernmost point of Bangladesh — a spot where the map of the country ends and India begins. Standing here, you feel the edge of the country as a physical thing: flat grassland, a low fence line, and a horizon that opens westward toward the plains of Siliguri.\n\nThe area is quiet and wide open. On a clear winter morning, the light is gentle and the air is crisp. It is not a manicured tourist site — it is a border crossing with a small checkpost, a road, and the unfussy feel of the last town before the map turns into another country.",
    highlights:
      "The main appeal of Banglabandha is its geography. There is something quietly moving about standing at the top of a country, looking across a fence at land that belongs to someone else's map. On winter mornings, the fog lifts slowly and reveals flat green fields that run all the way to the horizon.\n\nPhotographers like the light here — soft and long at sunrise, warm in the late afternoon. It is also a good place to watch daily life at a border: cargo trucks waiting, local traders moving quietly, a rickshaw or two parked by the roadside.",
    originStory:
      'Banglabandha has been a crossing point between Bengal and the Himalayan foothills for generations. Its name, meaning "the banyan tree of Bengal", is said to refer to an old banyan that once stood at the junction — a resting point for travellers moving between the plains and the mountains. The tree is gone, but the name and the location still matter.',
    history:
      "For most of the twentieth century, this was a low-key frontier. After 1971, Banglabandha became an official land port, handling trade with Nepal and Bhutan through India. Today it is one of the few places in Bangladesh where you can feel the full width of the country's northern border in a single glance.",
    visitingTips: [
      "Carry your national ID — this is a border area and documents are checked at the checkpost.",
      "Photography restrictions apply near the actual crossing. Ask before taking pictures of officials or infrastructure.",
      "Winter mornings are foggy. Plan to arrive after 9 AM if you want clear views.",
      "There is little food nearby. Carry water and snacks.",
      "Cell phone coverage is patchy right at the border itself.",
    ],
    verified: false,
  };

  const tetulia: Destination = {
    ...base,
    id: newId("d"),
    name: "Tetulia Tea Gardens",
    description:
      "Bangladesh's northernmost tea estates — rolling green rows, cool mornings, and the quiet hum of tea country.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80",
    location: "Tetulia, Panchagarh",
    latitude: 26.4167,
    longitude: 88.4,
    priority: "must",
    bestTimeToVisit: "Morning and late afternoon",
    category: "Nature",
    bestTime: "Morning",
    timeNeeded: "1–2 hrs",
    estCost: "Free",
    overview:
      "Tetulia is where Bangladesh's tea story begins. The estates here climb gentle slopes, shaped by the cool air coming off the Himalayan foothills. Unlike the tea gardens of Sylhet — which are hot and humid — Tetulia's feel is northern: misty mornings, sharper light, and rows of tea bushes that seem almost silver in the early sun.\n\nWalking through the gardens is easy and unhurried. The trails are wide, the air smells of wet earth and crushed leaves, and the only sounds are birds and the occasional worker moving between rows.",
    highlights:
      "The best moments in Tetulia are early. Fog settles in the valley before dawn and lifts slowly, revealing the slope of the gardens underneath. Workers move through the rows with baskets on their backs, picking the top two leaves — the only ones that matter for good tea.\n\nThe gardens are photogenic at almost any hour, but the light between 7 and 9 AM is best. Bring a light jacket — even on clear days, the mornings are cold by Bangladeshi standards.",
    originStory:
      "Tetulia's tea estates were established in the mid-twentieth century as part of an effort to expand tea cultivation beyond Sylhet. The northern climate — cooler, drier, with a real winter — turned out to suit a slower, subtler style of tea. The gardens have since become one of the region's quiet points of pride.",
    history:
      "Commercial tea planting in Tetulia began seriously in the 1990s, though small-scale cultivation existed earlier. Over three decades, the gardens expanded into what is now one of the most distinctive tea landscapes in the country — visually similar to Darjeeling, with terrain that catches morning fog in a way that feels almost alpine.",
    visitingTips: [
      "Ask permission before entering an active garden — they are working estates.",
      "Mornings are cold in December. Layer up.",
      "Bring a thermos if you plan to linger — hot tea from a local stall is a highlight.",
      "Do not litter. Plastics especially harm the soil.",
      "Photography of workers is fine with a nod and a smile, but ask first.",
    ],
    verified: false,
  };

  const kanchanjanga: Destination = {
    ...base,
    id: newId("d"),
    name: "Kanchanjanga Viewpoint",
    description:
      "On clear winter mornings, the third-highest mountain in the world rises above the horizon from northern Panchagarh.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80",
    location: "Tetulia area, Panchagarh",
    latitude: 26.45,
    longitude: 88.35,
    priority: "must",
    bestTimeToVisit: "Sunrise to 9 AM on cloudless days",
    category: "Mountain view",
    bestTime: "Sunrise",
    timeNeeded: "45 min – 1 hr",
    estCost: "Free",
    overview:
      "Kanchanjanga is the third-highest mountain on Earth and the highest peak entirely within the borders of a single country that does not include the Himalaya's true giants. From the northern edge of Panchagarh, on the right kind of winter morning, its silhouette appears above the horizon — distant, pale, and unmistakable.\n\nThis is not a viewpoint in the traditional sense. There is no observation deck or telescope. The view is simply the horizon itself, and whether or not it opens is entirely up to the atmosphere.",
    highlights:
      "When it appears, Kanchanjanga arrives as a long, pale ridge above the treeline. It is not the towering, snow-capped drama of posters — from this distance, it is a subtle presence, easy to miss if you are not watching. That subtlety is part of what makes it memorable.\n\nThe best conditions are a clear night followed by a windless dawn. Cloud, haze, or humidity will hide the mountain entirely. Because the view is unreliable, treat any sighting as a gift rather than a scheduled event.",
    originStory:
      "Local accounts describe the mountain as a familiar presence on the clearest mornings of winter — visible from rooftops and fields long before it became something visitors specifically came to see. The name, meaning 'five treasures of the snow', comes from Tibetan and refers to the five peaks of the massif.",
    history:
      "For generations, the view of Kanchanjanga has been part of local knowledge in the far north of Bangladesh. It was only with improved roads and interest in northern tourism that the viewpoint became a destination in its own right, mostly in the last two decades. Because it depends so much on weather, the number of mornings per year when it is clearly visible is small — which is exactly why people chase it.",
    visitingTips: [
      "Start before sunrise. The view almost always fades by mid-morning.",
      "Check the weather outlook before making the trip — clear forecast nights are your best bet.",
      "Bring binoculars if you have them. Naked-eye views are subtle.",
      "A cold, still morning is best. Wind blows the haze in.",
      "Manage expectations — this is a 'maybe' view, not a 'will definitely see it' view.",
    ],
    verified: false,
  };

  return [banglabandha, tetulia, kanchanjanga];
}

/**
 * Empty state — used as the initial local state before Firestore loads.
 * CRITICAL: This must be empty, otherwise ghost data appears and gets
 * wiped on the first server snapshot.
 */
export function createEmptyAppData(): AppData {
  return {
    schemaVersion: 1,
    trip: createEmptyTrip(),
    participants: [],
    contributions: [],
    expenses: [],
    categories: defaultCategories(),
    destinations: [],
    activities: [],
    attachments: [],
  };
}

/**
 * Seed state — written to Firestore the very first time the app runs.
 * Includes sample participants and sample destinations.
 */
export function createInitialData(): AppData {
  return {
    ...createEmptyAppData(),
    participants: sampleParticipants(),
    destinations: sampleDestinations(),
  };
}
