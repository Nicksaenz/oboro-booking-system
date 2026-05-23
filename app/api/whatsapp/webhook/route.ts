import { NextResponse } from 'next/server'

type MetaWebhookEntry = {
  id?: string
  changes?: Array<{
    field?: string
    value?: {
      statuses?: Array<{
        id?: string
        status?: string
        timestamp?: string
        recipient_id?: string
        errors?: Array<{
          code?: number
          title?: string
          message?: string
          error_data?: {
            details?: string
          }
        }>
      }>
      messages?: Array<{
        id?: string
        from?: string
        timestamp?: string
        type?: string
        text?: {
          body?: string
        }
      }>
    }
  }>
}

type MetaWebhookPayload = {
  object?: string
  entry?: MetaWebhookEntry[]
}

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
  const payload = (await request.json()) as MetaWebhookPayload

  const eventos = payload.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => {
      const statuses = change.value?.statuses?.map((status) => ({
        tipo: 'status',
        id: status.id,
        estado: status.status,
        destinatario: status.recipient_id,
        error: status.errors?.[0]?.title,
        detalle: status.errors?.[0]?.error_data?.details,
      })) ?? []

      const messages = change.value?.messages?.map((message) => ({
        tipo: 'mensaje',
        id: message.id,
        de: message.from,
        clase: message.type,
        texto: message.text?.body,
      })) ?? []

      return [...statuses, ...messages]
    }) ?? []
  ) ?? []

  console.log('WhatsApp webhook recibido', {
    total: eventos.length,
    eventos,
  })

  return NextResponse.json({ received: true })
}
