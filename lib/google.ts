export function getGoogleCalendarUrl(): string {
  return "https://calendar.google.com/calendar/u/0/r";
}

export async function syncGoogleCalendar(accessToken?: string) {
  if (!accessToken) return { provider: "google", synced: false, reason: "Connect Google Calendar first" };
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return { provider: "google", synced: false, reason: `Google Calendar returned ${response.status}` };
  const data = await response.json();
  return { provider: "google", synced: true, events: (data.items || []).map((event: { id: string; summary?: string; location?: string; start?: { dateTime?: string; date?: string } }) => ({ id: event.id, title: event.summary || "Untitled event", date: event.start?.dateTime || event.start?.date, time: event.start?.dateTime, location: event.location })) };
}
