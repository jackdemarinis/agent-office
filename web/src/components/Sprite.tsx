const KINDS: Record<string, { c1: string; c2: string; ears: 'fox' | 'cat' | 'robot' | 'blob' }> = {
  nova: { c1: '#4ab3e8', c2: '#1f5c8a', ears: 'fox' },
  iris: { c1: '#ff9ec7', c2: '#7a3d5c', ears: 'cat' },
  kai: { c1: '#c9d1e0', c2: '#5b6b8a', ears: 'robot' },
}
const FALLBACK = ['#7fd1c7', '#f5c542', '#b48cff', '#ff9a6b', '#8fe3b4']

export function Sprite({ name, size = 48 }: { name: string; size?: number }) {
  const key = name.toLowerCase()
  let k = KINDS[key]
  if (!k) {
    const h = [...key].reduce((a, c) => a + c.charCodeAt(0), 0)
    k = { c1: FALLBACK[h % FALLBACK.length], c2: '#3a3f55', ears: (['fox', 'cat', 'robot', 'blob'] as const)[h % 4] }
  }
  const { c1, c2, ears } = k
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {ears === 'fox' && (<><rect x="3" y="1" width="2" height="3" fill={c1} /><rect x="11" y="1" width="2" height="3" fill={c1} /></>)}
      {ears === 'cat' && (<><rect x="3" y="2" width="3" height="2" fill={c2} /><rect x="10" y="2" width="3" height="2" fill={c2} /></>)}
      {ears === 'robot' && (<><rect x="7" y="0" width="2" height="3" fill={c2} /><rect x="6" y="0" width="4" height="1" fill="#ff6b6b" /></>)}
      {ears === 'blob' && <rect x="5" y="2" width="6" height="2" fill={c1} />}
      <rect x="3" y="4" width="10" height="7" fill={c1} />
      <rect x="4" y="6" width="3" height="2" fill="#fff" /><rect x="9" y="6" width="3" height="2" fill="#fff" />
      <rect x="5" y="7" width="1" height="1" fill="#111" /><rect x="10" y="7" width="1" height="1" fill="#111" />
      <rect x="7" y="9" width="2" height="1" fill={c2} />
      <rect x="4" y="11" width="8" height="4" fill={c2} />
    </svg>
  )
}
