import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CRM interno | Oboro Booking',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminCrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
