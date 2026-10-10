import type { Metadata } from "next";
import HomeContent from "./HomeContent";

// The home page is the canonical URL for "/". The content is a client component, which cannot
// export metadata, so this server page carries it.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return <HomeContent />;
}
