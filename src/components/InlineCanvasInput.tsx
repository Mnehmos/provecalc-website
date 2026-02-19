/**
 * InlineCanvasInput - Click-to-type inline node creation
 *
 * Appears at insert cursor position on the canvas.
 * Parses text input in real-time and shows detected node type badge.
 * Enter creates node, Escape cancels.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseLineWithFeedback } from '../utils/textToNodeParser';

const TYPE_COLORS: Record<string, { bg: string; label: string }> = {
  given:      { bg: '#3b82f6',  label: 'Given' },
  equation:   { bg: '#b87333',  label: 'Equation' },
  constraint: { bg: '#f59e0b',  label: 'Constraint' },
  solve_goal: { bg: '#8b5cf6',  label: 'Solve' },
  text:       { bg: '#64748b',  label: 'Text' },
};

interface InlineCanvasInputProps {
  position: { x: number; y: number };
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function InlineCanvasInput({ position, onSubmit, onCancel }: InlineCanvasInputProps) {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<{ type: string; preview: string; valid: boolean }>({
    type: 'empty', preview: '', valid: true,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setFeedback(parseLineWithFeedback(text));
  }, [text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      if (text.trim() && feedback.type !== 'empty') {
        onSubmit(text.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [text, feedback, onSubmit, onCancel]);

  const handleBlur = useCallback(() => {
    if (text.trim() && feedback.type !== 'empty') {
      onSubmit(text.trim());
    } else {
      onCancel();
    }
  }, [text, feedback, onSubmit, onCancel]);

  const typeInfo = TYPE_COLORS[feedback.type];
  const showBadge = text.trim().length > 0 && typeInfo;

  return (
    <div
      className="inline-canvas-input-wrapper"
      style={{ left: position.x, top: position.y }}
    >
      {showBadge && (
        <span
          className="inline-input-type-badge"
          style={{ background: typeInfo.bg }}
        >
          {typeInfo.label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        className="inline-canvas-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Type expression... (e.g. m = 10 kg)"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
