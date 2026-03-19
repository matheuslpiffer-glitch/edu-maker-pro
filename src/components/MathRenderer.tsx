import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Universal renderer: supports LaTeX ($...$), HTML tags (<sup>, <sub>, etc.),
 * and Markdown simultaneously via react-markdown + rehype-raw + rehype-katex.
 */
const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const cleanedContent = useMemo(() => {
    if (!content) return '';
    return content
      .replace(/```html\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
  }, [content]);

  if (!cleanedContent) return null;

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MathRenderer;
