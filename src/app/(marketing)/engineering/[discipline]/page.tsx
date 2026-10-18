import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE, disciplines, examplesFor } from "../../../../data/engineering";
import { Ownership, headingStyle } from "../../../../components/engineering/Ownership";

type Params = { params: Promise<{ discipline: string }> };

export function generateStaticParams() {
  return disciplines.map((discipline) => ({ discipline: discipline.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const disciplineSlug = (await params).discipline;
  const discipline = disciplines.find((item) => item.slug === disciplineSlug);
  if (!discipline) return {};
  return {
    title: discipline.seoTitle,
    description: discipline.description,
    alternates: { canonical: `/engineering/${discipline.slug}` },
    openGraph: { title: discipline.seoTitle, description: discipline.description, url: `${SITE}/engineering/${discipline.slug}` },
  };
}

export default async function DisciplinePage({ params }: Params) {
  const disciplineSlug = (await params).discipline;
  const discipline = disciplines.find((item) => item.slug === disciplineSlug);
  if (!discipline) notFound();
  const worked = examplesFor(discipline.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ProveCalc", item: SITE },
      { "@type": "ListItem", position: 2, name: discipline.name, item: `${SITE}/engineering/${discipline.slug}` },
    ],
  };

  return (
    <main className="pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="text-sm uppercase tracking-widest text-[var(--copper-light)] mb-3">{discipline.name}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5" style={headingStyle}>
            {discipline.headline}
          </h1>
          <p className="text-xl text-[var(--stone-400)] leading-relaxed">{discipline.intro}</p>
        </div>

        <section className="grid md:grid-cols-3 gap-6 mb-16">
          {discipline.reasons.map((reason) => (
            <div key={reason.title} className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-2" style={headingStyle}>{reason.title}</h2>
              <p className="text-sm text-[var(--stone-400)] leading-relaxed">{reason.body}</p>
            </div>
          ))}
        </section>

        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-5" style={headingStyle}>What you can calculate</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {discipline.calculations.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[var(--stone-300)]">
                <span className="text-[var(--copper)] mt-0.5 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {worked.length > 0 && (
          <section className="mb-6">
            <h2 className="text-2xl font-bold mb-5 text-center" style={headingStyle}>Worked examples</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {worked.map((example) => (
                <a key={example.slug} href={`/examples/${example.slug}`} className="glass-card rounded-xl p-6 hover:border-[var(--copper)] transition-colors block">
                  <div className="text-xs uppercase tracking-wider text-[var(--copper-light)] mb-2">{example.course}</div>
                  <h3 className="text-lg font-semibold mb-2" style={headingStyle}>{example.title}</h3>
                  <p className="text-sm text-[var(--stone-400)] leading-relaxed">{example.answer}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        <Ownership />
      </div>
    </main>
  );
}
