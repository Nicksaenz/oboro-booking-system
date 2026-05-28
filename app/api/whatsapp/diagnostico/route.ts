import { NextResponse } from 'next/server'

function autorizado(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiVersion = process.env.META_WHATSAPP_API_VERSION || 'v25.0'
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Falta META_WHATSAPP_PHONE_NUMBER_ID o META_WHATSAPP_ACCESS_TOKEN',
      },
      { status: 503 }
    )
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: response.status,
        error: data?.error?.message ?? 'No se pudo validar el numero en Meta',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    phoneNumberId,
    displayPhoneNumber: data.display_phone_number,
    verifiedName: data.verified_name,
    qualityRating: data.quality_rating,
  })
}
