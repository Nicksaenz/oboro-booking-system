import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN

  if (!verifyToken) {
    return NextResponse.json(
      { error: 'Falta configurar META_WHATSAPP_VERIFY_TOKEN' },
      { status: 503 }
    )
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verificacion invalida' }, { status: 403 })
}

export async function POST(request: Request) {
  await request.json()

  return NextResponse.json({ received: true })
}
