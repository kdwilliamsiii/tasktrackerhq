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
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + params, {
      headers: { Authorization: "Bearer " + accessToken },
      cache: "no-store",
    });
    if (!response.ok) {
      if (rawEvents.length) break;
      return { provider: "google", synced: false, reason: "Google Calendar returned " + response.status };
    }
    const data = await response.json();
    rawEvents.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return {
    provider: "google",
    synced: true,
    events: rawEvents.map((event) => ({
      id: event.id,
      title: event.summary || "Untitled event",
      date: event.start?.dateTime || event.start?.date,
      time: event.start?.dateTime,
      location: event.location,
      provider: "Google",
    })),
  };
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: { title?: string; date?: string; time?: string }
) {
  if (!accessToken || !eventId) return false;

  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId);
  
  // First fetch current event
  const getRes = await fetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
  });
  if (!getRes.ok) return false;
  const current = await getRes.json();

  if (updates.title) current.summary = updates.title;
  if (updates.date) {
    if (updates.time) {
      current.start = { dateTime: updates.time };
      const endDate = new Date(new Date(updates.time).getTime() + 3600000);
      current.end = { dateTime: endDate.toISOString() };
    } else {
      current.start = { date: updates.date.slice(0, 10) };
      current.end = { date: updates.date.slice(0, 10) };
    }
  }

  const patchRes = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(current),
  });

  return patchRes.ok;
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  if (!accessToken || !eventId) return false;
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + encodeURIComponent(eventId);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + accessToken },
  });
  return res.ok || res.status === 404;
}
