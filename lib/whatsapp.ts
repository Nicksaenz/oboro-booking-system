type TemplateParameter = {
  type: 'text'
  text: string
}

type TemplateHeaderImage = {
  link?: string
  dataUrl?: string
}

type SendTemplateInput = {
  to: string
  templateName: string
  languageCode: string
  parameters: TemplateParameter[]
  headerImage?: TemplateHeaderImage
  credentials?: WhatsAppCredentials
}

export type CitaRecordatorio = {
  ID: string
  ID_Usuario?: string
  Fecha: string
  Hora: string
  Estado: string
  Clientes?: {
    Nombre?: string
    Numero?: string
  } | null
  SERVICIOS?: {
    'Nombre del servicio'?: string
  } | null
  Empleados?: {
    Nombre?: string
    foto_url?: string | null
  } | null
}

export type WhatsAppCredentials = {
  phoneNumberId: string
  accessToken: string
  apiVersion?: string
  templateName?: string
  languageCode?: string
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

export function getBusinessReminderTemplateName() {
  return (
    process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO ||
    'recordatorio_negocio'
  )
}

export function getCustomerPhotoReminderTemplateName() {
  return process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_CLIENTE_FOTO || ''
}

export function getReviewRequestTemplateName() {
  return process.env.META_WHATSAPP_TEMPLATE_RESENA || 'solicitud_resena'
}

function getImageMimeFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,/i)
  return match?.[1] ?? ''
}

function getBase64FromDataUrl(dataUrl: string) {
  const parts = dataUrl.split(',')
  return parts.length > 1 ? parts[1] : ''
}

function isPublicImageUrl(value: string) {
  return /^https:\/\//i.test(value)
}

async function uploadWhatsAppImage({
  dataUrl,
  phoneNumberId,
  accessToken,
  apiVersion,
}: {
  dataUrl: string
  phoneNumberId: string
  accessToken: string
  apiVersion: string
}) {
  const mimeType = getImageMimeFromDataUrl(dataUrl)
  const base64 = getBase64FromDataUrl(dataUrl)

  if (!mimeType || !base64) {
    throw new Error('La foto del empleado no tiene un formato valido.')
  }

  const formData = new FormData()
  const extension = mimeType.includes('png') ? 'png' : 'jpg'
  const blob = new Blob([Buffer.from(base64, 'base64')], { type: mimeType })

  formData.append('messaging_product', 'whatsapp')
  formData.append('file', blob, `oboro-empleado.${extension}`)

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  )
  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.id) {
    throw new Error(
      `WhatsApp media error ${response.status}: ${JSON.stringify(data)}`
    )
  }

  return String(data.id)
}

async function buildHeaderImageComponent({
  headerImage,
  phoneNumberId,
  accessToken,
  apiVersion,
}: {
  headerImage?: TemplateHeaderImage
  phoneNumberId: string
  accessToken: string
  apiVersion: string
}) {
  const imageValue = headerImage?.link || headerImage?.dataUrl || ''

  if (!imageValue) return null

  if (isPublicImageUrl(imageValue)) {
    return {
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: {
            link: imageValue,
          },
        },
      ],
    }
  }

  if (imageValue.startsWith('data:image/')) {
    const mediaId = await uploadWhatsAppImage({
      dataUrl: imageValue,
      phoneNumberId,
      accessToken,
      apiVersion,
    })

    return {
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: {
            id: mediaId,
          },
        },
      ],
    }
  }

  return null
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  parameters,
  headerImage,
  credentials,
}: SendTemplateInput) {
  const phoneNumberId =
    credentials?.phoneNumberId ?? getRequiredEnv('META_WHATSAPP_PHONE_NUMBER_ID')
  const accessToken =
    credentials?.accessToken ?? getRequiredEnv('META_WHATSAPP_ACCESS_TOKEN')
  const apiVersion =
    credentials?.apiVersion ?? process.env.META_WHATSAPP_API_VERSION ?? 'v24.0'
  const headerComponent = await buildHeaderImageComponent({
    headerImage,
    phoneNumberId,
    accessToken,
    apiVersion,
  })
  const components = [
    ...(headerComponent ? [headerComponent] : []),
    {
      type: 'body',
      parameters,
    },
  ]

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
          components,
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

export async function sendAppointmentReminder(
  cita: CitaRecordatorio,
  credentials?: WhatsAppCredentials
) {
  const telefono = normalizeWhatsAppNumber(cita.Clientes?.Numero)
  const photoTemplateName = getCustomerPhotoReminderTemplateName()
  const empleadoFoto = cita.Empleados?.foto_url?.trim()

  if (!telefono) {
    throw new Error('El cliente no tiene un numero de WhatsApp valido')
  }

  return sendWhatsAppTemplate({
    to: telefono,
    templateName:
      empleadoFoto && photoTemplateName
        ? photoTemplateName
        : credentials?.templateName ?? getReminderTemplateName(),
    languageCode: credentials?.languageCode ?? getReminderTemplateLanguage(),
    headerImage:
      empleadoFoto && photoTemplateName
        ? empleadoFoto.startsWith('data:image/')
          ? { dataUrl: empleadoFoto }
          : { link: empleadoFoto }
        : undefined,
    credentials,
    parameters: [
      { type: 'text', text: cita.Clientes?.Nombre || 'cliente' },
      { type: 'text', text: cita.Fecha },
      { type: 'text', text: cita.Hora },
      {
        type: 'text',
        text: cita.SERVICIOS?.['Nombre del servicio'] || 'servicio',
      },
      { type: 'text', text: cita.Empleados?.Nombre || 'equipo' },
    ],
  })
}

export async function sendBusinessAppointmentReminder({
  to,
  negocio,
  cliente,
  fecha,
  hora,
  servicio,
  empleado,
}: {
  to: string
  negocio: string
  cliente: string
  fecha: string
  hora: string
  servicio: string
  empleado: string
}) {
  const telefono = normalizeWhatsAppNumber(to)

  if (!telefono) {
    throw new Error('El negocio no tiene un numero de WhatsApp valido')
  }

  return sendWhatsAppTemplate({
    to: telefono,
    templateName: getBusinessReminderTemplateName(),
    languageCode: getReminderTemplateLanguage(),
    parameters: [
      { type: 'text', text: negocio || 'tu negocio' },
      { type: 'text', text: cliente || 'cliente' },
      { type: 'text', text: fecha },
      { type: 'text', text: hora },
      { type: 'text', text: servicio || 'servicio' },
      { type: 'text', text: empleado || 'equipo' },
    ],
  })
}

export async function sendReviewRequest({
  to,
  cliente,
  servicio,
  empleado,
  reviewUrl,
}: {
  to: string
  cliente: string
  servicio: string
  empleado: string
  reviewUrl: string
}) {
  const telefono = normalizeWhatsAppNumber(to)

  if (!telefono) {
    throw new Error('El cliente no tiene un numero de WhatsApp valido')
  }

  return sendWhatsAppTemplate({
    to: telefono,
    templateName: getReviewRequestTemplateName(),
    languageCode: getReminderTemplateLanguage(),
    parameters: [
      { type: 'text', text: cliente || 'cliente' },
      { type: 'text', text: servicio || 'servicio' },
      { type: 'text', text: empleado || 'equipo' },
      { type: 'text', text: reviewUrl },
    ],
  })
}
