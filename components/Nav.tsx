import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <Link href="/">Dashboard</Link>
      <Link href="/tasks">Tasks</Link>
      <Link href="/calendar">Calendar</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/admin/feedback">Feedback Review</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </nav>
  );
}
