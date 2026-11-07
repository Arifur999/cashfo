"use server";

import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type { EventGift, EventPerson, NewEventInput, NewGiftInput, SocialEvent } from "./eventsTypes";

// Calendar & Events' changes. Each answers what it wrote (or { deleted });
// the page then reads the whole overview again (router.refresh).

const enc = encodeURIComponent;
const base = (businessId: string) => `/api/businesses/${enc(businessId)}/events`;

export async function createEventAction(businessId: string, input: NewEventInput): Promise<CodeResult<SocialEvent>> {
  return callCodeApi(async () => (await customerApi.post<SocialEvent>(base(businessId), input)).data, "Couldn't save the event.");
}

// The reminder switched, or what the event says changed.
export async function updateEventAction(
  businessId: string,
  eventId: string,
  input: Partial<Pick<SocialEvent, "type" | "title" | "date" | "time" | "place" | "remind">>,
): Promise<CodeResult<SocialEvent>> {
  return callCodeApi(async () => (await customerApi.patch<SocialEvent>(`${base(businessId)}/${enc(eventId)}`, input)).data, "Couldn't save the event.");
}

// The event and its gifts; a gift that went into Transactions is voided there too.
export async function deleteEventAction(businessId: string, eventId: string): Promise<CodeResult<{ deleted: boolean }>> {
  return callCodeApi(async () => (await customerApi.delete<{ deleted: boolean }>(`${base(businessId)}/${enc(eventId)}`)).data, "Couldn't delete the event.");
}

export async function addGiftAction(businessId: string, eventId: string, input: NewGiftInput): Promise<CodeResult<EventGift>> {
  return callCodeApi(async () => (await customerApi.post<EventGift>(`${base(businessId)}/${enc(eventId)}/gifts`, input)).data, "Couldn't save the gift.");
}

export async function deleteGiftAction(businessId: string, giftId: string): Promise<CodeResult<{ deleted: boolean }>> {
  return callCodeApi(async () => (await customerApi.delete<{ deleted: boolean }>(`${base(businessId)}/gifts/${enc(giftId)}`)).data, "Couldn't delete the gift.");
}

export async function updatePersonAction(businessId: string, personId: string, input: { name?: string; relation?: string | null }): Promise<CodeResult<EventPerson>> {
  return callCodeApi(async () => (await customerApi.patch<EventPerson>(`${base(businessId)}/people/${enc(personId)}`, input)).data, "Couldn't save this person.");
}
