/**
 * App layout — loads KaTeX CSS and the worksheet app styles.
 * These are NOT loaded on the landing/marketing pages.
 */
import "katex/dist/katex.min.css";
import "../../styles/index.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
