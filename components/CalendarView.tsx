const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView({ month, events = [] }: { month: string; events?: { date: string; title: string }[] }) {
  return (
    <section aria-label={`${month} calendar`} className="calendar-view">
      <h2>{month}</h2>
      <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-events">{events.map((event) => <article key={`${event.date}-${event.title}`}><strong>{event.date}</strong><span>{event.title}</span></article>)}</div>
    </section>
  );
}
