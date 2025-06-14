import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './style.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Anonymous Pickup System',
  description: 'Anonymous package pickup system using EIP-7702 + ZK proofs + Smart Contracts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}