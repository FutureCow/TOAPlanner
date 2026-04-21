import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: '#3b82f6',
        borderRadius: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 22 }}>
          {/* Header row — white */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 16, height: 16, background: '#ffffff', borderRadius: 4 }} />
            ))}
          </div>
          {/* Data rows */}
          {([
            ['#93c5fd','#93c5fd','#ffffff','#93c5fd','#93c5fd'],
            ['#ffffff','#93c5fd','#93c5fd','#fde68a','#93c5fd'],
            ['#93c5fd','#ffffff','#93c5fd','#93c5fd','#ffffff'],
            ['#93c5fd','#93c5fd','#fde68a','#93c5fd','#93c5fd'],
          ] as string[][]).map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 10 }}>
              {row.map((color, ci) => (
                <div key={ci} style={{ width: 16, height: 16, background: color, borderRadius: 4 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
