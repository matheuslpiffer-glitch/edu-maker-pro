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
  if (!isAssistant) return <div className="whitespace-pre-wrap">{content}</div>;

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
      <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]}
          components={{
            table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
            thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
            th: ({node, ...props}) => <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700" {...props} />,
            td: ({node, ...props}) => <td className="border border-slate-200 px-3 py-2 text-slate-600" {...props} />,
          }}
        >
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
          {videoStatus.loading && (
            <p className="text-[10px] text-slate-500 mt-1">
              Gerando cenas e áudio... ({videoStatus.segments.length}/...)
            </p>
          )}
        </div>
      )}
    </div>
  );
};
