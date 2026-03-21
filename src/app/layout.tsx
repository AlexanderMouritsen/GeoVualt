import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GeoVault',
  description: 'Unlock the world, one game at a time.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
