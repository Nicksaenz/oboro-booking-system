import './globals.css'
import Navbar from './components/Navbar'

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
        <Navbar />
        {children}
      </body>
    </html>
  )
}