export type CalendarListEvent = { id: string; date: string; title: string; provider?: string; time?: string; location?: string };

export default function CalendarEventList({ events }: { events: CalendarListEvent[] }) {
  return <div className="calendar-event-list">{events.map((event) => <div className="activity-item" key={`${event.provider}-${event.id}`}><strong>{event.date}</strong><span>{event.title}</span><small>{event.provider || "Local"}{event.time ? ` · ${new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}{event.location ? ` · ${event.location}` : ""}</small></div>)}</div>;
}
