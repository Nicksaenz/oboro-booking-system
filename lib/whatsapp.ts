type TemplateParameter = {
  type: 'text'
  text: string
}

type SendTemplateInput = {
  to: string
  templateName: string
  languageCode: string
  parameters: TemplateParameter[]
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Falta configurar ${name}`)
  }

  return value
}

export function normalizeWhatsAppNumber(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '')

  if (!digits) return ''
  if (digits.startsWith('57')) return digits
  if (digits.length === 10) return `57${digits}`

  return digits
}

export function getReminderTemplateName() {
  return process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO || 'recordatorio_cita'
}

export function getReminderTemplateLanguage() {
  return process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'es_CO'
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  parameters,
}: SendTemplateInput) {
  const phoneNumberId = getRequiredEnv('META_WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = getRequiredEnv('META_WHATSAPP_ACCESS_TOKEN')
  const apiVersion = process.env.META_WHATSAPP_API_VERSION || 'v24.0'

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      }),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      `WhatsApp API error ${response.status}: ${JSON.stringify(data)}`
    )
  }

  return data
}
