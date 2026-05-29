import { NextResponse } from 'next/server'

export async function GET() {
  const sha256CertFingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT

  if (!sha256CertFingerprint) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.oborolab.booking',
          sha256_cert_fingerprints: [sha256CertFingerprint],
        },
      },
    ],
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
