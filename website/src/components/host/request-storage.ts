export const hostRequestStorageKey = "cake-cloud:host-request:v1";
export const hostRequestChangedEvent = "cake-cloud-host-request-change";

export type HostRequestItem = {
  id: string;
  name: string;
  image: string | null;
  guests: number;
  unitPrice: number;
  priceUnit: string;
  currency: string;
  minimumGuests?: number;
  maximumGuests?: number | null;
};

function isHostRequestItem(value: unknown): value is HostRequestItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HostRequestItem>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    (typeof item.image === "string" || item.image === null) &&
    Number.isInteger(item.guests) &&
    (item.guests ?? 0) > 0 &&
    typeof item.unitPrice === "number" &&
    typeof item.priceUnit === "string" &&
    typeof item.currency === "string" &&
    (item.minimumGuests === undefined ||
      (Number.isInteger(item.minimumGuests) && item.minimumGuests > 0)) &&
    (item.maximumGuests === undefined ||
      item.maximumGuests === null ||
      (Number.isInteger(item.maximumGuests) && item.maximumGuests > 0))
  );
}

export function readHostRequest(): HostRequestItem[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(hostRequestStorageKey) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isHostRequestItem) : [];
  } catch {
    return [];
  }
}

export function saveHostRequestItem(requestItem: HostRequestItem) {
  const items = readHostRequest();
  const itemIndex = items.findIndex((item) => item.id === requestItem.id);
  if (itemIndex >= 0) items[itemIndex] = requestItem;
  else items.push(requestItem);
  window.localStorage.setItem(hostRequestStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event(hostRequestChangedEvent));
}

export function saveHostRequest(items: HostRequestItem[]) {
  window.localStorage.setItem(hostRequestStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event(hostRequestChangedEvent));
}

export function clearHostRequest() {
  window.localStorage.removeItem(hostRequestStorageKey);
  window.dispatchEvent(new Event(hostRequestChangedEvent));
}
