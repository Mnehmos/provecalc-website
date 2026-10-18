import type { Metadata } from "next";
import { disciplines, examplesFor } from "../../../data/engineering";
import { Ownership, headingStyle } from "../../../components/engineering/Ownership";

export const metadata: Metadata = {
  title: "Worked Engineering Examples: Beams, Columns, Shafts, Lift, Fluids, Heat",
  description:
    "Step-by-step engineering problems from statics, mechanics of materials, fluids, heat transfer and flight, each worked in ProveCalc with units checked by its engine.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesIndex() {
  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={headingStyle}>
            Worked engineering examples
          </h1>
          <p className="text-xl text-[var(--stone-400)]">
            Coursework-style problems, solved step by step in ProveCalc. Every number on these pages
            comes from its compute engine, with units checked on every line.
          </p>
        </div>
        {disciplines.map((discipline) => (
          <section key={discipline.slug} className="mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-2xl font-bold" style={headingStyle}>
                {discipline.name}
              </h2>
              <a href={`/engineering/${discipline.slug}`} className="text-sm text-[var(--copper-light)] hover:underline">
                ProveCalc for {discipline.name.toLowerCase()} →
              </a>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {examplesFor(discipline.slug).map((example) => (
                <a
                  key={example.slug}
                  href={`/examples/${example.slug}`}
                  className="glass-card rounded-xl p-6 hover:border-[var(--copper)] transition-colors block"
                >
                  <div className="text-xs uppercase tracking-wider text-[var(--copper-light)] mb-2">{example.course}</div>
                  <h3 className="text-lg font-semibold mb-2" style={headingStyle}>
                    {example.title}
                  </h3>
                  <p className="text-sm text-[var(--stone-400)] leading-relaxed">{example.description}</p>
                </a>
              ))}
            </div>
          </section>
        ))}
        <Ownership />
      </div>
    </main>
  );
}
