import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { QueryProvider } from "@/lib/providers/query-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "gift0 - Share Wishlists with Friends",
  description: "Create and share gift lists easily with friends and family",
  generator: "v0.app",
  openGraph: {
    title: "gift0 - Share Wishlists with Friends",
    description: "Create and share gift lists easily with friends and family",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "gift0 - Share Wishlists with Friends",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "gift0 - Share Wishlists with Friends",
    description: "Create and share gift lists easily with friends and family",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      {
        url: "/gift0_logo.png",
      },
    ],
    apple: "/gift0_logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
