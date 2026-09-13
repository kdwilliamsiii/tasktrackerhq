export type CalendarListEvent = { id: string; date: string; title: string; provider?: string; time?: string; location?: string; reminderMinutes?: number };

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
    <div className="calendar-event-list">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id;
        return (
          <div
            className={"activity-item calendar-event-item" + (isSelected ? " selected-event-item" : "")}
            key={event.provider + "-" + event.id}
            id={"event-item-" + event.id}
          >
            <div className="calendar-event-copy">
              <strong>{event.date}</strong>
              <span>{event.title}</span>
              <small>
                {event.provider || "Local"}
                {event.time ? " · " + new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""}
                {event.location ? " · " + event.location : ""}
                {event.reminderMinutes != null ? " · Remind " + event.reminderMinutes + " min before" : ""}
              </small>
            </div>
            {event.provider === "Local" && onEdit && onDelete && (
              <div className="calendar-event-actions">
                <button className="text-button" type="button" onClick={() => onEdit(event)}>
                  Edit
                </button>
                <button className="text-button danger-text" type="button" onClick={() => onDelete(event)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
