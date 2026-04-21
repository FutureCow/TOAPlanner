import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const s = Number(params.size) || 192
  const dot = Math.round(s * 0.088)
  const gap = Math.round(s * 0.055)
  const pad = Math.round(s * 0.13)
  const radius = Math.round(s * 0.19)

  return new ImageResponse(
    (
      <div style={{
        width: s, height: s,
        background: '#3b82f6',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, padding: pad }}>
          <div style={{ display: 'flex', gap }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: dot, height: dot, background: '#ffffff', borderRadius: Math.round(dot * 0.25) }} />
            ))}
          </div>
          {([
            ['#93c5fd','#93c5fd','#ffffff','#93c5fd','#93c5fd'],
            ['#ffffff','#93c5fd','#93c5fd','#fde68a','#93c5fd'],
            ['#93c5fd','#ffffff','#93c5fd','#93c5fd','#ffffff'],
            ['#93c5fd','#93c5fd','#fde68a','#93c5fd','#93c5fd'],
          ] as string[][]).map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap }}>
              {row.map((color, ci) => (
                <div key={ci} style={{ width: dot, height: dot, background: color, borderRadius: Math.round(dot * 0.25) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: s, height: s },
  )
}
