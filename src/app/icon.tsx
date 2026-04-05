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
          background: '#0f172a',
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
                background: '#2563eb',
                borderRadius: 1,
              }} />
            ))}
          </div>
          {/* Data rows with colored cells representing statuses */}
          {([
            ['#334155','#334155','#22c55e','#334155','#334155'],
            ['#22c55e','#334155','#334155','#f59e0b','#334155'],
            ['#334155','#22c55e','#334155','#334155','#22c55e'],
            ['#334155','#334155','#f59e0b','#334155','#334155'],
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
