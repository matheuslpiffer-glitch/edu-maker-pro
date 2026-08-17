import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { sanitizeChatText } from '@/lib/chat-sanitize';
import GeradorInfograficoProcesso from '@/components/mindmap/GeradorInfograficoProcesso';
import VideoLabPlayer from '@/components/VideoLabPlayer';

interface ChatMessageRendererProps {
  content: string;
  isAssistant: boolean;
  videoStatus?: { loading: boolean; url?: string; segments?: string[]; duration?: number };
}

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ content, isAssistant, videoStatus }) => {
  if (!isAssistant) return <p className="whitespace-pre-wrap">{content}</p>;

  const sanitized = sanitizeChatText(content);
  
  // Detect custom tags
  const infographicMatch = sanitized.match(/<infografico\s+subject="([^"]+)"\s*\/>/);

  // Remove tags for markdown rendering
  const textOnly = sanitized
    .replace(/<video\s+src="[^"]+"\s*\/>/g, '')
    .replace(/<infografico\s+subject="[^"]+"\s*\/>/g, '')
    .trim();

  return (
    <div className="space-y-4">
      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {textOnly}
        </ReactMarkdown>
      </div>

      {infographicMatch && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <GeradorInfograficoProcesso defaultSubject={infographicMatch[1]} autoGenerate />
        </div>
      )}

      {videoStatus?.segments && videoStatus.segments.length > 0 && (
        <div className="mt-4">
          <VideoLabPlayer 
            segments={videoStatus.segments} 
            durationSeconds={videoStatus.duration || 10} 
          />
        </div>
      )}
    </div>
  );
};
