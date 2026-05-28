import './globals.css'
import ProtectedShell from './components/ProtectedShell'

export const metadata = {
  title: 'Oboro Booking',
  description: 'Sistema de reservas profesional para negocios de servicios',
  applicationName: 'Oboro Booking',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Oboro Booking',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport = {
  themeColor: '#ea580c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-black">
        <ProtectedShell>{children}</ProtectedShell>
      </body>
    </html>
  )
}
