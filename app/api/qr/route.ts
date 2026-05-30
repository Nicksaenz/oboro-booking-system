import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get('data')

  if (!data) {
    return NextResponse.json({ error: 'Falta el enlace del QR.' }, { status: 400 })
  }

  const bytes = await QRCode.toBuffer(data, {
    color: {
      dark: '#050505',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 12,
    type: 'png',
  })
  const filename = `oboro-qr-agendamiento-${Date.now()}.png`

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
