export function getMicrosoftCalendarUrl(): string {
  return "https://outlook.office.com/calendar/";
}

export async function syncMicrosoftCalendar(accessToken?: string) {
  if (!accessToken) return { provider: "microsoft", synced: false, reason: "Connect Microsoft Calendar first" };
  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/events?$top=50&$orderby=start/dateTime", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return { provider: "microsoft", synced: false, reason: `Microsoft Calendar returned ${response.status}` };
  const data = await response.json();
  return { provider: "microsoft", synced: true, events: (data.value || []).map((event: { id: string; subject?: string; location?: { displayName?: string }; start?: { dateTime?: string } }) => ({ id: event.id, title: event.subject || "Untitled event", date: event.start?.dateTime, time: event.start?.dateTime, location: event.location?.displayName })) };
}
