/**
 * MathDisplay - Renders LaTeX math using KaTeX
 */

import { useEffect, useRef } from 'react';
import katex from 'katex';
import { logger } from '../utils/logger';

interface MathDisplayProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathDisplay({ latex, displayMode = true, className = '' }: MathDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          trust: true,
          strict: false,
        });
      } catch (e) {
        logger.error('ui', 'KaTeX render error', { error: String(e), latex });
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={`math-display ${className}`} />;
}

/**
 * Inline math display
 */
export function InlineMath({ latex, className = '' }: { latex: string; className?: string }) {
  return <MathDisplay latex={latex} displayMode={false} className={`inline-math ${className}`} />;
}
