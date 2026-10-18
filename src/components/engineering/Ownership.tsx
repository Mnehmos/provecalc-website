import { OWNERSHIP_LINES } from "../../data/engineering";

const heading = { fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" };

/** The product promise and the two next steps, shared by every discipline and example page. */
export function Ownership() {
  return (
    <section className="mt-20">
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {OWNERSHIP_LINES.map((line) => (
          <div key={line.title} className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2" style={heading}>
              {line.title}
            </h3>
            <p className="text-sm text-[var(--stone-400)] leading-relaxed">{line.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/app"
          className="bg-[var(--copper)] hover:bg-[var(--copper-dark)] px-6 py-3 rounded-lg font-medium transition-colors text-center"
        >
          Try it in the browser
        </a>
        <a
          href="/pricing"
          className="border border-[var(--stone-700)] hover:border-[var(--copper)] px-6 py-3 rounded-lg font-medium transition-colors text-center"
        >
          $200 once, yours forever
        </a>
      </div>
    </section>
  );
}

export const headingStyle = heading;
