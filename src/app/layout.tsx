import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from this site, so a page view makes no
// request to Google and no stylesheet blocks rendering.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: {
    default: "ProveCalc - Engineering Calculations You Can Trust",
    template: "%s | ProveCalc",
  },
  description:
    "Engineering calculations in a Mathcad-style worksheet: every assumption, unit and result is checked. Desktop app runs offline after activation. $200 once.",
  metadataBase: new URL("https://provecalc.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://provecalc.com",
    siteName: "ProveCalc",
    title: "ProveCalc - Engineering Calculations You Can Trust",
    description:
      "A Mathcad-style engineering worksheet where every assumption, unit, and result is checked, not just calculated. Buy once, own it, works offline.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ProveCalc worksheet: a simply supported beam with verified inputs and results",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProveCalc - Engineering Calculations You Can Trust",
    description:
      "A Mathcad-style engineering worksheet where every assumption, unit, and result is checked. $200 once, no subscription, no activation server.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
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
      <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <head>
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
                url: "https://provecalc.com",
                image: "https://provecalc.com/og-image.png",
                description:
                  "A Mathcad-style engineering worksheet where every assumption, unit, and result is checked, not just calculated.",
                publisher: { "@id": "https://provecalc.com/#publisher" },
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": "https://provecalc.com/#publisher",
                name: "The Mnemosyne Research Institute",
                url: "https://themnemosyneresearchinstitute.com",
                email: "contact@themnemosyneresearchinstitute.com",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Safford",
                  addressRegion: "AZ",
                  addressCountry: "US",
                },
                owns: { "@type": "Product", name: "ProveCalc", url: "https://provecalc.com" },
              }),
            }}
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
