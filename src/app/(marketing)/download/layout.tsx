import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download for Windows, macOS, and Linux",
  description:
    "Download the ProveCalc desktop app: a Mathcad-style engineering worksheet that checks units, assumptions, and results, and runs offline.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Download ProveCalc",
    description: "The desktop engineering worksheet for Windows, macOS, and Linux.",
    url: "/download",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ProveCalc worksheet with verified inputs and results" }],
  },
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
