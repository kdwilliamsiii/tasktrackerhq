export default function DashboardCard({ label, value, detail, accent = false }: { label: string; value: string | number; detail: string; accent?: boolean }) {
  return <div className={`dashboard-stat ${accent ? "dashboard-stat-accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
