import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE, disciplines, examples } from "../../../../data/engineering";
import { Tex } from "../../../../components/engineering/Tex";
import { Ownership, headingStyle } from "../../../../components/engineering/Ownership";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return examples.map((example) => ({ slug: example.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slugSlug = (await params).slug;
  const example = examples.find((item) => item.slug === slugSlug);
  if (!example) return {};
  return {
    title: example.seoTitle,
    description: example.description,
    keywords: example.keywords,
    alternates: { canonical: `/examples/${example.slug}` },
    openGraph: { title: example.seoTitle, description: example.description, url: `${SITE}/examples/${example.slug}`, type: "article" },
  };
}

export default async function ExamplePage({ params }: Params) {
  const slugSlug = (await params).slug;
  const example = examples.find((item) => item.slug === slugSlug);
  if (!example) notFound();
  const related = examples.filter(
    (item) => item.slug !== example.slug && item.disciplines.some((d) => example.disciplines.includes(d)),
  ).slice(0, 4);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: example.title,
      description: example.description,
      about: example.keywords,
      educationalLevel: "Undergraduate engineering",
      url: `${SITE}/examples/${example.slug}`,
      publisher: { "@type": "Organization", name: "ProveCalc", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Examples", item: `${SITE}/examples` },
        { "@type": "ListItem", position: 2, name: example.title, item: `${SITE}/examples/${example.slug}` },
      ],
    },
  ];

  return (
    <main className="pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-6">
        <nav className="text-sm text-[var(--stone-500)] mb-6">
          <a href="/examples" className="hover:text-[var(--copper-light)]">Worked examples</a>
          <span className="mx-2">/</span>
          <span>{example.course}</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-bold mb-6" style={headingStyle}>
          {example.title}
        </h1>
        <p className="text-lg text-[var(--stone-300)] leading-relaxed mb-10">{example.problem}</p>

        <h2 className="text-2xl font-bold mb-4" style={headingStyle}>Given</h2>
        <div className="glass-card rounded-xl divide-y divide-[var(--stone-800)] mb-10">
          {example.givens.map((given) => (
            <div key={given.label} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className="text-[var(--stone-400)] text-sm">{given.label}</span>
              <span className="text-[var(--stone-100)]">
                <Tex>{`${given.symbol} = ${given.value}`}</Tex>
              </span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-4" style={headingStyle}>Solution</h2>
        <ol className="space-y-5 mb-10">
          {example.steps.map((step, index) => (
            <li key={step.label} className="glass-card rounded-xl p-5">
              <div className="text-sm text-[var(--stone-400)] mb-3">
                <span className="text-[var(--copper-light)] font-semibold mr-2">{index + 1}.</span>
                {step.label}
              </div>
              <div className="overflow-x-auto text-[var(--stone-100)]">
                <Tex display>{step.equation}</Tex>
              </div>
              <div className="mt-2 text-[var(--copper-light)] overflow-x-auto">
                <Tex display>{step.result}</Tex>
              </div>
            </li>
          ))}
        </ol>

        <div className="border border-[var(--copper)]/40 bg-[var(--copper)]/10 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-2" style={headingStyle}>Answer</h2>
          <p className="text-[var(--stone-200)]">{example.answer}</p>
        </div>

        <h2 className="text-2xl font-bold mb-3" style={headingStyle}>Worked in ProveCalc</h2>
        <p className="text-[var(--stone-300)] leading-relaxed mb-3">{example.inProveCalc}</p>
        <p className="text-sm text-[var(--stone-500)] mb-10">
          The results above were evaluated by ProveCalc&apos;s compute engine (SymPy and Pint), the same engine the
          desktop app runs on your machine.
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          {example.disciplines.map((slug) => {
            const discipline = disciplines.find((d) => d.slug === slug)!;
            return (
              <a key={slug} href={`/engineering/${slug}`} className="text-sm border border-[var(--stone-700)] hover:border-[var(--copper)] rounded-full px-3 py-1">
                {discipline.name}
              </a>
            );
          })}
        </div>

        {related.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4" style={headingStyle}>Related examples</h2>
            <ul className="space-y-2 mb-6">
              {related.map((item) => (
                <li key={item.slug}>
                  <a href={`/examples/${item.slug}`} className="text-[var(--copper-light)] hover:underline">{item.title}</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
      <div className="max-w-6xl mx-auto px-6">
        <Ownership />
      </div>
    </main>
  );
}
