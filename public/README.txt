====================================================================
PANCHAGARH VOYAGE — KANCHANJANGA DAWN
A Local-Only Trip Planner for the Panchagarh Winter Voyage
====================================================================

QUICK START
-----------

Option A — Just open it (simplest):

  1. Open the "index.html" file in this folder with Google Chrome,
     Microsoft Edge, or Firefox.
  2. The application launches immediately. No install, no terminal,
     no internet required after the first load.

Option B — Use the local launcher (recommended for best results):

  Windows:
    Double-click "START.bat"

  macOS / Linux:
    Open a terminal in this folder, then run:
      bash START.sh

  The launcher starts a tiny local web server and opens the app
  in your browser. This ensures IndexedDB storage works in every
  browser, including Safari.

FIRST-TIME USE
--------------

The app opens with 4 sample participants and 11 default expense
categories. Everything is editable. Add your trip dates from
the Admin page, then start adding real participants, expenses,
itinerary activities, destinations, transport, and food plans.

WHERE YOUR DATA LIVES
---------------------

All trip data is stored in your browser's IndexedDB on THIS device
only. Nothing is ever uploaded to the internet. If you clear your
browser's site data or use a different browser, the data will not
follow you.

IMPORTANT: BACK UP REGULARLY
----------------------------

Go to the Documents page and click "Download backup" often. This
creates a .json file you can restore later — or move to another
device.

Attachments (photos, tickets, receipts) live separately in
IndexedDB and are NOT included in the JSON backup. Download them
individually from their cards if you need to move them.

USAGE TIPS
----------

- Dates are unset by default. Set them in Admin → Trip settings
  so the countdown and trip-day tabs work correctly.
- Expenses have two states: "Planned" (estimate) and "Actual"
  (confirmed). Planned expenses never count as spent money.
- Participant contributions have two values: "Planned" (pledged)
  and "Actual" (handed over). Only actual contributions affect
  the cash balance.
- The Settlement tab on the Budget page shows who owes or is
  owed money based on actual expenses only.
- Emergency reserve is a target, not an automatic expense.
- Itinerary activities are checked for time conflicts. Overlaps
  and impossible schedules are flagged — never silently fixed.

WHAT'S INCLUDED
---------------

- Landing page with hero and featured spots
- Day-by-day itinerary with conflict detection
- Budget dashboard with donut charts and settlement ledger
- Participant manager with contribution tracking
- Destination explorer with priorities and search
- Transport planner with overnight train handling
- Food planner with per-person cost tracking
- Document library with uploads, backups, and CSV export
- Profile & stats page with trip analytics
- Admin panel with trip settings and category management

KNOWN LIMITATIONS
-----------------

- Train schedules and ticket prices are user-entered. The app
  never fetches live data from Bangladesh Railway.
- Weather is not fetched; there is no live weather integration.
- Unsplash images on the landing page require internet on first
  load. Offline, the page uses gradient fallbacks.
- Attachments are stored in IndexedDB and are not in the JSON
  backup (they can be downloaded individually).
- The admin panel has no password. It is intended for local
  single-device use only.
- If the app is opened in Safari via file://, IndexedDB may be
  restricted. Use the START.sh launcher in that case.

TROUBLESHOOTING
---------------

Nothing saves?
  Check that your browser allows IndexedDB for local files.
  Try the launcher instead of opening index.html directly.

Blank page?
  Open the browser's developer console (F12) and check for
  errors. If you see "Failed to load module", you opened the
  source folder, not the built dist folder.

Lost data?
  If you have a backup, go to Documents → Restore from backup.

====================================================================
Built for the Panchagarh December voyage.
====================================================================