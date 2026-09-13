import { Clock, MapPin, Bell, Calendar, CalendarX } from "lucide-react";

export type CalendarListEvent = {
  id: string;
  date: string;
  title: string;
  provider?: string;
  time?: string;
  location?: string;
  reminderMinutes?: number;
};

export default function CalendarEventList({
  events,
  selectedEventId,
  onEdit,
  onReschedule,
  onDelete,
}: {
  events: CalendarListEvent[];
  selectedEventId?: string | null;
  onEdit?: (event: CalendarListEvent) => void;
  onReschedule?: (event: CalendarListEvent, newDate: string) => void;
  onDelete?: (event: CalendarListEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="calendar-empty-card">
        <CalendarX size={32} className="calendar-empty-icon" />
        <strong>No scheduled events found</strong>
        <p>There are no events matching this filter. Add an event above or sync your Google/Microsoft calendar.</p>
      </div>
    );
  }

  return (
    <div className="calendar-event-card-list">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id;
        const providerName = event.provider || "Local";
        const formattedTime = event.time
          ? new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          : "All Day";

        const rawDate = (event.date || "").slice(0, 10);
        let formattedDate = rawDate;
        if (rawDate) {
          const [y, m, d] = rawDate.split("-").map(Number);
          if (y && m && d) {
            const dt = new Date(y, m - 1, d);
            if (!Number.isNaN(dt.getTime())) {
              formattedDate = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            }
          }
        }

        const isEditable = providerName === "Local" || providerName === "Google";

        return (
          <article
            className={"event-list-card" + (isSelected ? " selected-event-card" : "")}
            key={providerName + "-" + event.id}
            id={"event-item-" + event.id}
          >
            <div className="event-list-card-header">
              <div className="event-tag-group">
                <span className={"event-provider-badge tag-" + providerName.toLowerCase()}>
                  {providerName}
                </span>
                <span className="event-date-chip">{formattedDate}</span>
              </div>

              {isEditable && (
                <div className="event-card-actions">
                  {onReschedule && (
                    <label className="text-button quick-reschedule-label" title="1-Tap Reschedule">
                      <Calendar size={12} /> Move
                      <input
                        className="hidden-date-input"
                        type="date"
                        value={rawDate}
                        onChange={(e) => {
                          if (e.target.value) onReschedule(event, e.target.value);
                        }}
                      />
                    </label>
                  )}
                  {onEdit && (
                    <button className="text-button" type="button" onClick={() => onEdit(event)}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button className="text-button danger-text" type="button" onClick={() => onDelete(event)}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="event-list-card-title">
              <strong>{event.title}</strong>
            </div>

            <div className="event-list-card-details">
              <span className="detail-item"><Clock size={12} /> {formattedTime}</span>
              {event.location && <span className="detail-item"><MapPin size={12} /> {event.location}</span>}
              {event.reminderMinutes != null && event.reminderMinutes > 0 && (
                <span className="detail-item"><Bell size={12} /> Remind {event.reminderMinutes}m before</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
