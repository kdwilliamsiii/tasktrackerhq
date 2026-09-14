"use client";

type ProgressTask = { completed: boolean; completedAt?: string };

export default function TaskProgressWidget({ tasks }: { tasks: ProgressTask[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = tasks.filter((task) => task.completed && task.completedAt?.slice(0, 10) === today).length;
  const remaining = tasks.filter((task) => !task.completed).length;
  const totalToday = completedToday + remaining;
  const percentage = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <section className="task-progress-widget" aria-labelledby="task-progress-title">
      <div className="task-progress-heading"><div><span className="dashboard-kicker">TODAY&apos;S PROGRESS</span><h2 id="task-progress-title">Keep the momentum going</h2></div><strong suppressHydrationWarning>{percentage}%</strong></div>
      <div className="task-progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>
      <div className="task-progress-details"><span><b suppressHydrationWarning>{completedToday}</b> completed today</span><span><b suppressHydrationWarning>{remaining}</b> remaining</span></div>
    </section>
  );
}
