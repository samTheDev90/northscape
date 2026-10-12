import emailjs from "@emailjs/browser";
import type { Participant } from "./types";
import type { DirectoryUser } from "./userDirectory";

// ============================================================================
// Email sending via EmailJS.
// Configured with the credentials from the EmailJS dashboard.
// ============================================================================

const SERVICE_ID = "service_mqtiibx";
const TEMPLATE_ID = "template_590kgiy";
const PUBLIC_KEY = "DCaFCz3lMNYMOHnM-";

export interface EmailRecipient {
  participantId: string;
  name: string;
  email: string | null;
  hasLinkedAccount: boolean;
}

export interface SendParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  trip_name: string;
}

export async function sendOne(params: SendParams): Promise<void> {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { ...params },
    { publicKey: PUBLIC_KEY },
  );
}

/**
 * Given a participant and the directory of users, resolve the email
 * address we should send to:
 *   1. The linked user account's email (if linked)
 *   2. Fallback: the participant's `contact` field if it looks like an email
 *   3. null if nothing usable
 */
export function resolveParticipantEmail(
  participant: Participant,
  users: DirectoryUser[],
): { email: string | null; hasLinkedAccount: boolean } {
  const linked = users.find((u) => u.participantId === participant.id);
  if (linked?.email) {
    return { email: linked.email, hasLinkedAccount: true };
  }
  const contact = participant.contact.trim();
  if (
    contact.includes("@") &&
    contact.includes(".") &&
    !contact.includes(" ")
  ) {
    return { email: contact, hasLinkedAccount: false };
  }
  return { email: null, hasLinkedAccount: false };
}

export function buildRecipients(
  participants: Participant[],
  users: DirectoryUser[],
): EmailRecipient[] {
  return participants.map((p) => {
    const { email, hasLinkedAccount } = resolveParticipantEmail(p, users);
    return {
      participantId: p.id,
      name: p.name,
      email,
      hasLinkedAccount,
    };
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
