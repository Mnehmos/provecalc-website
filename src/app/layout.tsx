import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ProveCalc - Engineering Calculations You Can Trust",
    template: "%s | ProveCalc",
  },
  description:
    "ProveCalc is a read-only product preview while signed desktop delivery and paid checkout complete release review.",
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
      "Engineering calculation software with local symbolic math, unit-aware workflows, and an auditable desktop release in preparation.",
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
                description:
                  "Read-only preview for engineering calculation software with symbolic mathematics and unit analysis; signed desktop delivery is pending release review.",
              }),
            }}
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
