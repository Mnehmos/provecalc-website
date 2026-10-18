import katex from "katex";

/** LaTeX rendered at build time, so the page ships plain HTML that search engines can read. */
export function Tex({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, { displayMode: display, throwOnError: false, output: "html" });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
