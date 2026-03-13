import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'The Missing Booth 📸 — Virtual Photobooth Strips',
  description: 'The photobooth that was always missing. Upload photos, get a retro strip, add stickers.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="grain">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1008',
              color: '#fdf8f0',
              border: '1px solid #3a2a10',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
            },
            success: { iconTheme: { primary: '#e8973a', secondary: '#1a1008' } },
            error:   { iconTheme: { primary: '#c8372d', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
