import Provider from '@/app/provider'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import AuthWrapper from '@/components/wrapper/auth-wrapper'
import { Analytics } from "@vercel/analytics/react"
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL("https://starter.rasmic.xyz"),
  title: {
    default: 'MCQ Lab',
    template: `%s | MCQ Lab`
  },
  description: 'Enhance your learning with our AI-powered MCQ application! Submit educational articles or YouTube lectures, and our platform generates 20 MCQ questions to test your understanding. Whether it is text or video content, we extract key information to create engaging quizzes. Track your progress with a history of your submissions and scores. Perfect for students looking to reinforce their knowledge effectively.',
  openGraph: {
    description: 'Enhance your learning with our AI-powered MCQ application! Submit educational articles or YouTube lectures, and our platform generates 20 MCQ questions to test your understanding. Whether it is text or video content, we extract key information to create engaging quizzes. Track your progress with a history of your submissions and scores. Perfect for students looking to reinforce their knowledge effectively.',
    images: ['https://utfs.io/f/8a428f85-ae83-4ca7-9237-6f8b65411293-eun6ii.png'],
    url: 'https://starter.rasmic.xyz/'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCQLab',
    description: 'Enhance your learning with our AI-powered MCQ application! Submit educational articles or YouTube lectures, and our platform generates 20 MCQ questions to test your understanding. Whether it is text or video content, we extract key information to create engaging quizzes. Track your progress with a history of your submissions and scores. Perfect for students looking to reinforce their knowledge effectively.',
    siteId: "",
    creator: "@nexlution",
    creatorId: "",
    images: [],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper>
      <html lang="en" suppressHydrationWarning>
        <head>
          
        </head>
        <body className={GeistSans.className}>
          <Provider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </Provider>
          <Analytics />
        </body>
      </html>
    </AuthWrapper>
  )
}