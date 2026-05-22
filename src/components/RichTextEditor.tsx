import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Digite aqui...', className, disabled = false }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (editorRef.current && value !== lastExternalValue.current) {
      editorRef.current.innerHTML = value || '';
      lastExternalValue.current = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      lastExternalValue.current = newValue;
      onChange(newValue);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    handleInput();
  }, [handleInput]);

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-card', className)}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('bold')} className="h-8 w-8 p-0" disabled={disabled}>
          <Bold size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand('italic')} className="h-8 w-8 p-0" disabled={disabled}>
          <Italic size={16} />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[120px] focus:outline-none text-sm leading-relaxed [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
        data-placeholder={placeholder}
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
