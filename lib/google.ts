export function getGoogleCalendarUrl(): string {
  return "https://calendar.google.com/calendar/u/0/r";
}

export async function syncGoogleCalendar(accessToken?: string, monthsBack: number = 3) {
  if (!accessToken) return { provider: "google", synced: false, reason: "Connect Google Calendar first" };
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - monthsBack);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 12);

  type GoogleEvent = { id: string; summary?: string; location?: string; start?: { dateTime?: string; date?: string } };
  const rawEvents: GoogleEvent[] = [];
  let pageToken: string | undefined;
  const maxPages = 10;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) {
      if (rawEvents.length) break;
      return { provider: "google", synced: false, reason: `Google Calendar returned ${response.status}` };
    }
    const data = await response.json();
    rawEvents.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return {
    provider: "google",
    synced: true,
    events: rawEvents.map((event) => ({ id: event.id, title: event.summary || "Untitled event", date: event.start?.dateTime || event.start?.date, time: event.start?.dateTime, location: event.location })),
  };
}
