import './globals.css'

export const metadata = {
  title: 'Rising Posts — Catch Trending Content Early',
  description: 'Monitor Facebook pages and detect rising posts before they go viral. Find trending content in your niche.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-slate-800 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
