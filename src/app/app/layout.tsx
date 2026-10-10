/**
 * App layout — loads KaTeX CSS and the worksheet app styles.
 * These are NOT loaded on the landing/marketing pages.
 */
import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "../../styles/index.css";

export const metadata: Metadata = {
  title: "Free Browser Demo",
  description:
    "Try ProveCalc in your browser: load an engineering template, solve it, and watch every unit and result get checked. No sign-up.",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "Try ProveCalc Free in Your Browser",
    description: "Solve a beam, column, or circuit template and see every unit checked. No sign-up.",
    url: "/app",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ProveCalc worksheet with verified inputs and results" }],
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
