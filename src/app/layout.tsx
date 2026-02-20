import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ProveCalc - Engineering Calculations You Can Trust",
    template: "%s | ProveCalc",
  },
  description:
    "Professional engineering calculation software with full audit trails. SymPy-powered verification. Unit analysis. AI-assisted. $200 one-time.",
  metadataBase: new URL("https://provecalc.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://provecalc.com",
    siteName: "ProveCalc",
    title: "ProveCalc - Engineering Calculations You Can Trust",
    description:
      "Professional engineering calculation software with full audit trails. Show your work, prove your results.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ProveCalc - Engineering Calculations You Can Trust",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProveCalc - Engineering Calculations You Can Trust",
    description:
      "Professional engineering calculation software. $200 one-time. Not $2,700/year.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
            rel="stylesheet"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "ProveCalc",
                applicationCategory: "EngineeringApplication",
                operatingSystem: "Windows, macOS, Linux",
                offers: {
                  "@type": "Offer",
                  price: "200.00",
                  priceCurrency: "USD",
                },
                description:
                  "Professional engineering calculation software with full audit trails, symbolic mathematics, and unit analysis.",
              }),
            }}
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
