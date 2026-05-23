import './globals.css'
import ProtectedShell from './components/ProtectedShell'

export const metadata = {
  title: 'Oboro Booking',
  description: 'Sistema de reservas profesional',
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
