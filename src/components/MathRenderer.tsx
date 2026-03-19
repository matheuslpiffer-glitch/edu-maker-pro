import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Detects if content contains LaTeX math delimiters ($...$, $$...$$, \(...\), \[...\])
 * If yes, renders via react-markdown with KaTeX. Otherwise uses dangerouslySetInnerHTML for HTML.
 */
const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const hasLatex = useMemo(() => {
    if (!content) return false;
    return /\$[^$]+\$|\\\(.*?\\\)|\\\[.*?\\\]/s.test(content);
  }, [content]);

  const cleanedContent = useMemo(() => {
    if (!content) return '';
    return content
      .replace(/```html\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
  }, [content]);

  if (hasLatex) {
    return (
      <div className={`prose prose-sm max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {cleanedContent}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanedContent }}
    />
  );
};

export default MathRenderer;
