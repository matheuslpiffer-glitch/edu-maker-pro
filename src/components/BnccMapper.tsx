import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MappedSkill {
  code: string;
  description: string;
  knowledge_object?: string;
}

interface Props {
  /** The activity content text to analyze */
  contentText: string;
  /** Grade/series for filtering (e.g. '6_ano') */
  grade?: string;
  /** Subject area for filtering */
  subjectArea?: string;
  className?: string;
}

/**
 * Analyzes activity content and maps it to BNCC skill codes.
 * Uses curriculum_skills table + AI matching.
 */
export default function BnccMapper({ contentText, grade, subjectArea, className }: Props) {
  const [skills, setSkills] = useState<MappedSkill[]>([]);
  const [loading, setLoading] = useState(false);

  const handleMap = async () => {
    if (!contentText.trim()) return;
    setLoading(true);
    try {
      // Fetch curriculum skills from DB
      let query = supabase.from('curriculum_skills').select('code, description, knowledge_object, subject_area, grade');
      if (grade) query = query.eq('grade', grade);
      if (subjectArea) query = query.eq('subject_area', subjectArea);
      const { data: dbSkills } = await query.limit(200);

      if (dbSkills && dbSkills.length > 0) {
        // Simple keyword matching: find skills whose description or knowledge_object
        // appears in the content text
        const contentLower = contentText.toLowerCase();
        const matched = dbSkills.filter(s => {
          const descWords = s.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const objWords = (s.knowledge_object || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const allWords = [...descWords, ...objWords];
          // At least 2 significant words must appear in content
          const hits = allWords.filter(w => contentLower.includes(w));
          return hits.length >= 2;
        });

        setSkills(matched.slice(0, 10).map(s => ({
          code: s.code,
          description: s.description,
          knowledge_object: s.knowledge_object,
        })));
      }

      if (!dbSkills || dbSkills.length === 0) {
        setSkills([]);
      }
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleMap}
        disabled={loading || !contentText.trim()}
        className="gap-2 mb-3 no-print"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        💎 Mapear BNCC
      </Button>

      {skills.length > 0 && (
        <>
          {/* Screen version */}
          <Card className={cn('no-print border-primary/20', !skills.length && 'hidden')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                Habilidades BNCC Identificadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {skills.map(s => (
                <div key={s.code} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {s.code}
                  </Badge>
                  <span className="text-muted-foreground">{s.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Print version — padrão pedagógico */}
          <div className="hidden print:block edu-body" style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.15',
            textTransform: 'uppercase',
            pageBreakBefore: 'always',
            marginTop: '20px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '13pt' }}>FICHA PEDAGÓGICA — HABILIDADES BNCC</strong>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left', width: '120px' }}>
                    <strong>CÓDIGO</strong>
                  </th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}>
                    <strong>DESCRIÇÃO DA HABILIDADE</strong>
                  </th>
                </tr>
              </thead>
              <tbody>
                {skills.map(s => (
                  <tr key={s.code}>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 700 }}>
                      {s.code}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                      {s.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
