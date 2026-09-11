export type TaskItem = { id: string; title: string; completed?: boolean; priority?: string };

export default function TaskList({ tasks, onToggle }: { tasks: TaskItem[]; onToggle?: (id: string) => void }) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id}>
          <button type="button" onClick={() => onToggle?.(task.id)} aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}>
            {task.completed ? "✓" : "○"}
          </button>
          <span className={task.completed ? "completed" : ""}>{task.title}</span>
          {task.priority && <small>{task.priority}</small>}
        </li>
      ))}
    </ul>
  );
}
