export default function TTBotHint({ children, command }: { children: React.ReactNode; command?: string }) {
  return <aside className="tt-bot-hint"><span className="tt-bot-hint-mark">✦</span><div><strong>TT Bot</strong><p>{children}</p>{command && <small>Try: “{command}”</small>}</div></aside>;
}
