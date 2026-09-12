export function getMicrosoftCalendarUrl(): string {
  return "https://outlook.office.com/calendar/";
}

export async function syncMicrosoftCalendar(accessToken?: string, monthsBack: number = 3) {
  if (!accessToken) return { provider: "microsoft", synced: false, reason: "Connect Microsoft Calendar first" };
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - monthsBack);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 12);
  const filter = `start/dateTime ge '${timeMin.toISOString()}' and start/dateTime le '${timeMax.toISOString()}'`;

  type MicrosoftEvent = { id: string; subject?: string; location?: { displayName?: string }; start?: { dateTime?: string } };
  const rawEvents: MicrosoftEvent[] = [];
  let nextUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/calendar/events?${new URLSearchParams({ $top: "250", $orderby: "start/dateTime", $filter: filter })}`;
  const maxPages = 10;
  for (let page = 0; page < maxPages && nextUrl; page++) {
    const response: Response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) {
      if (rawEvents.length) break;
      return { provider: "microsoft", synced: false, reason: `Microsoft Calendar returned ${response.status}` };
    }
    const data = await response.json();
    rawEvents.push(...(data.value || []));
    nextUrl = data["@odata.nextLink"];
  }

  return {
    provider: "microsoft",
    synced: true,
    events: rawEvents.map((event) => ({ id: event.id, title: event.subject || "Untitled event", date: event.start?.dateTime, time: event.start?.dateTime, location: event.location?.displayName })),
  };
}
