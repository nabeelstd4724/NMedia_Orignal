export function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'gold' | 'light' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
