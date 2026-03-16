import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Presentation, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface Attendance {
  id: string;
  teacher_name: string;
  signed: boolean;
  signed_at: string | null;
}

interface Meeting {
  id: string;
  topic: string;
  skill_code: string;
  grade: string;
  meeting_date: string;
}

export default function SignAttendance() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const professorParam = searchParams.get('professor') || '';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel(`sign-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'meeting_attendance',
        filter: `meeting_id=eq.${id}`,
      }, () => {
        loadAttendance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const [mRes, aRes] = await Promise.all([
      supabase.from('meetings').select('id, topic, skill_code, grade, meeting_date').eq('id', id!).maybeSingle(),
      supabase.from('meeting_attendance').select('*').eq('meeting_id', id!).order('teacher_name'),
    ]);
    setMeeting(mRes.data as Meeting | null);
    setAttendance((aRes.data as Attendance[]) || []);
    setLoading(false);
  };

  const loadAttendance = async () => {
    const { data } = await supabase
      .from('meeting_attendance')
      .select('*')
      .eq('meeting_id', id!)
      .order('teacher_name');
    setAttendance((data as Attendance[]) || []);
  };

  const sign = async (attendanceId: string) => {
    setSigning(attendanceId);
    try {
      const { error } = await supabase
        .from('meeting_attendance')
        .update({ signed: true, signed_at: new Date().toISOString() })
        .eq('id', attendanceId);
      if (error) throw error;
      toast({ title: '✅ Presença registrada com sucesso!' });
      loadAttendance();
    } catch (e: any) {
      toast({ title: 'Erro ao assinar', description: e.message, variant: 'destructive' });
    } finally {
      setSigning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Toaster />
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold">Reunião não encontrada</h2>
            <p className="text-muted-foreground mt-2">O link pode estar incorreto ou a reunião foi removida.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If professor param is set, highlight that teacher
  const highlightedFirst = professorParam
    ? [...attendance].sort((a, b) => {
        if (a.teacher_name === professorParam) return -1;
        if (b.teacher_name === professorParam) return 1;
        return 0;
      })
    : attendance;

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Presentation className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Registro de Presença</h1>
          </div>
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold text-foreground">{meeting.topic}</h2>
              <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground">
                {meeting.skill_code && (
                  <span className="font-mono text-primary">{meeting.skill_code}</span>
                )}
                {meeting.grade && <span>{meeting.grade}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(meeting.meeting_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance list */}
        <div className="space-y-2">
          {highlightedFirst.map(a => {
            const isHighlighted = a.teacher_name === professorParam && !a.signed;
            return (
              <Card
                key={a.id}
                className={`transition-all ${
                  a.signed ? 'border-primary/30 bg-primary/5' :
                  isHighlighted ? 'border-accent ring-2 ring-accent/50 bg-accent/5' : ''
                }`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isHighlighted ? 'text-accent-foreground font-bold' : ''}`}>
                      {a.teacher_name}
                    </p>
                    {a.signed && a.signed_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.signed_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {a.signed ? (
                    <Badge variant="outline" className="border-primary text-primary shrink-0">
                      <Check className="h-3 w-3 mr-1" /> Assinado
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sign(a.id)}
                      disabled={signing === a.id}
                      className={isHighlighted ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}
                    >
                      {signing === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>✍️ Assinar</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          EduCreator • Registro Digital de Presença
        </p>
      </div>
    </div>
  );
}
