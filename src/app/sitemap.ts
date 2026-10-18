import type { MetadataRoute } from "next";
import { disciplines, examples } from "../data/engineering";

export default function sitemap(): MetadataRoute.Sitemap {
  const learning: MetadataRoute.Sitemap = [
    { url: "https://provecalc.com/examples", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...disciplines.map((d) => ({ url: `https://provecalc.com/engineering/${d.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...examples.map((e) => ({ url: `https://provecalc.com/examples/${e.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
  return [
    ...learning,
    {
      url: "https://provecalc.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://provecalc.com/pricing",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://provecalc.com/download",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://provecalc.com/app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://provecalc.com/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://provecalc.com/contact",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: "https://provecalc.com/terms",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
