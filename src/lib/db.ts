import Dexie, { type Table } from "dexie";

// ============================================================================
// Blob storage — local-only, browser-scoped IndexedDB.
// Used for attachment file contents. Not synced across devices.
// ============================================================================

interface BlobRecord {
  id: string;
  blob: Blob;
}

class PanchagarhBlobDB extends Dexie {
  blobs!: Table<BlobRecord, string>;

  constructor() {
    super("panchagarh_voyage_blobs");
    this.version(1).stores({
      blobs: "id",
    });
  }
}

export const blobDb = new PanchagarhBlobDB();

export async function putBlob(id: string, blob: Blob): Promise<void> {
  await blobDb.blobs.put({ id, blob });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const row = await blobDb.blobs.get(id);
  return row?.blob ?? null;
}

export async function deleteBlob(id: string): Promise<void> {
  await blobDb.blobs.delete(id);
}

export async function clearAllBlobs(): Promise<void> {
  await blobDb.blobs.clear();
}
