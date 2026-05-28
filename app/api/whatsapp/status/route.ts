import { NextResponse } from 'next/server'

function configured(name: string) {
  return Boolean(process.env[name])
}

export async function GET() {
  const variables = {
    cronSecret: configured('CRON_SECRET'),
    phoneNumberId: configured('META_WHATSAPP_PHONE_NUMBER_ID'),
    accessToken: configured('META_WHATSAPP_ACCESS_TOKEN'),
    verifyToken: configured('META_WHATSAPP_VERIFY_TOKEN'),
    templateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO'),
    customerPhotoTemplateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO_CLIENTE_FOTO'),
    businessTemplateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO'),
    recoveryTemplateName: configured('META_WHATSAPP_TEMPLATE_RECUPERACION'),
    templateLanguage: configured('META_WHATSAPP_TEMPLATE_LANGUAGE'),
  }

  const listo =
    variables.cronSecret &&
    variables.phoneNumberId &&
    variables.accessToken &&
    variables.verifyToken &&
    variables.templateName &&
    variables.businessTemplateName &&
    variables.recoveryTemplateName &&
    variables.templateLanguage

  return NextResponse.json({
    listo,
    schedule: 'Todos los dias a las 8:00 a. m. Colombia',
    endpoint: '/api/whatsapp/recordatorios-negocio',
    customerReminderEndpoint: '/api/whatsapp/recordatorios',
    webhookEndpoint: '/api/whatsapp/webhook',
    template:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO || 'recordatorio_cita',
    customerPhotoTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_CLIENTE_FOTO ||
      'sin plantilla con foto',
    businessTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO ||
      'recordatorio_negocio',
    recoveryTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECUPERACION || 'codigo_recuperacion',
    language: process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'es_CO',
    variables,
  })
}
