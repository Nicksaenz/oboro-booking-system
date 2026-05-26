import { NextResponse } from 'next/server'

function configurado(nombre: string) {
  return Boolean(process.env[nombre]?.trim())
}

export async function GET() {
  const publicKey = process.env.WOMPI_PUBLIC_KEY ?? ''
  const ambiente = publicKey.startsWith('pub_prod_')
    ? 'produccion'
    : publicKey.startsWith('pub_test_')
      ? 'sandbox'
      : 'sin_configurar'

  return NextResponse.json({
    listo: ambiente === 'produccion' &&
      configurado('WOMPI_INTEGRITY_SECRET') &&
      configurado('WOMPI_EVENT_SECRET'),
    ambiente,
    variables: {
      publicKey: configurado('WOMPI_PUBLIC_KEY'),
      integritySecret: configurado('WOMPI_INTEGRITY_SECRET'),
      eventSecret: configurado('WOMPI_EVENT_SECRET'),
    },
  })
}
