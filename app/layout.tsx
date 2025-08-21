import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${poppins.variable} antialiased`}>
      <body>
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  )
}
