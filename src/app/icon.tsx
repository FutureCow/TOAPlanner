import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#3b82f6',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Calendar grid */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: 4,
        }}>
          {/* Header row — all accent blue */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 3,
                height: 3,
                background: '#ffffff',
                borderRadius: 1,
              }} />
            ))}
          </div>
          {/* Data rows with colored cells representing statuses */}
          {([
            ['#93c5fd','#93c5fd','#22c55e','#93c5fd','#93c5fd'],
            ['#22c55e','#93c5fd','#93c5fd','#f59e0b','#93c5fd'],
            ['#93c5fd','#22c55e','#93c5fd','#93c5fd','#22c55e'],
            ['#93c5fd','#93c5fd','#f59e0b','#93c5fd','#93c5fd'],
          ] as string[][]).map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 2 }}>
              {row.map((color, ci) => (
                <div key={ci} style={{
                  width: 3,
                  height: 3,
                  background: color,
                  borderRadius: 1,
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
