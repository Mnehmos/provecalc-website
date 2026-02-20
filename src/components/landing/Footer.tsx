export function Footer() {
  return (
    <footer className="py-16 border-t border-[var(--stone-800)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-3">
              <img src="/logo.svg" alt="" className="w-6 h-6" />
              <span
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                className="font-semibold"
              >
                ProveCalc
              </span>
            </a>
            <p className="text-[var(--stone-500)] text-sm leading-relaxed">
              Engineering calculations you can prove.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--stone-300)] mb-3">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/download"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Download
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="/app"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Web Demo
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--stone-300)] mb-3">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/Mnehmos/worksheet-dist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@provecalc.com"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--stone-300)] mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/privacy"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-sm text-[var(--stone-500)] hover:text-[var(--copper)] transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--stone-800)] text-center">
          <p className="text-[var(--stone-500)] text-sm">
            &copy; {new Date().getFullYear()} ProveCalc. Built in Arizona.
          </p>
        </div>
      </div>
    </footer>
  );
}
