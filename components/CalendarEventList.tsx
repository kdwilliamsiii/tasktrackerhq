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
  onDelete,
}: {
  events: CalendarListEvent[];
  selectedEventId?: string | null;
  onEdit?: (event: CalendarListEvent) => void;
  onDelete?: (event: CalendarListEvent) => void;
}) {
  return (
    <div className="calendar-event-card-list">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id;
        const providerName = event.provider || "Local";
        const formattedTime = event.time
          ? new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          : "All Day";

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
                <span className="event-date-chip">{event.date}</span>
              </div>

              {(providerName === "Local" || providerName === "Google") && onEdit && onDelete && (
                <div className="event-card-actions">
                  <button className="text-button" type="button" onClick={() => onEdit(event)}>
                    Edit
                  </button>
                  <button className="text-button danger-text" type="button" onClick={() => onDelete(event)}>
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div className="event-list-card-title">
              <strong>{event.title}</strong>
            </div>

            <div className="event-list-card-details">
              <span>? {formattedTime}</span>
              {event.location && <span>?? {event.location}</span>}
              {event.reminderMinutes != null && event.reminderMinutes > 0 && (
                <span>?? Remind {event.reminderMinutes}m before</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
