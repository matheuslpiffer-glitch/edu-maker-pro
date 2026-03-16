import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Users, Check, Clock, Link2, MessageCircle } from 'lucide-react';

const DEFAULT_TEACHERS = [
  'Matheus Lima Piffer', 'Glauco', 'Ana Paula', 'Carlos Eduardo',
  'Fernanda Silva', 'José Ricardo', 'Maria Clara', 'Pedro Henrique',
  'Luciana Costa', 'Roberto Santos', 'Patrícia Oliveira', 'Marcos Vinícius',
  'Juliana Almeida', 'André Luiz', 'Camila Ferreira', 'Thiago Souza',
];

interface Attendance {
  id: string;
  teacher_name: string;
  signed: boolean;
  signed_at: string | null;
}

interface Props {
  meetingId: string;
  topic: string;
  onBack: () => void;
}

export default function AttendancePanel({ meetingId, topic, onBack }: Props) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;
  const signingUrl = `${baseUrl}/assinar/${meetingId}`;

  useEffect(() => {
    loadOrCreate();
    // Realtime subscription
    const channel = supabase
      .channel(`attendance-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_attendance',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        loadAttendance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId]);

  const loadAttendance = async () => {
    const { data } = await supabase
      .from('meeting_attendance')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('teacher_name');
    setAttendance((data as Attendance[]) || []);
  };

  const loadOrCreate = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meeting_attendance')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('teacher_name');

    if (data && data.length > 0) {
      setAttendance(data as Attendance[]);
    } else {
      // Create attendance entries for all teachers
      const entries = DEFAULT_TEACHERS.map(name => ({
        meeting_id: meetingId,
        teacher_name: name,
      }));
      const { data: created } = await supabase
        .from('meeting_attendance')
        .insert(entries)
        .select('*');
      setAttendance((created as Attendance[]) || []);
    }
    setLoading(false);
  };

  const copyLink = (teacherName: string) => {
    const url = `${signingUrl}?professor=${encodeURIComponent(teacherName)}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: `Link de assinatura para ${teacherName}` });
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(signingUrl);
    toast({ title: 'Link da reunião copiado!' });
  };

  const openWhatsApp = (teacherName: string) => {
    const url = `${signingUrl}?professor=${encodeURIComponent(teacherName)}`;
    const message = `Olá ${teacherName.split(' ')[0]}! 📋\n\nVocê está convidado(a) para assinar a presença na reunião:\n\n📌 *${topic}*\n\n🔗 Acesse o link abaixo para confirmar sua presença:\n${url}\n\nAtenciosamente,\nCoordenação Pedagógica`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const signedCount = attendance.filter(a => a.signed).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Gestão de Presença
          </h1>
          <p className="text-sm text-muted-foreground">{topic} • {signedCount}/{attendance.length} assinaram</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyMeetingLink}>
            <Link2 className="h-4 w-4 mr-1" /> Copiar Link da Reunião
          </Button>
          <span className="text-xs text-muted-foreground truncate flex-1">{signingUrl}</span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {attendance.map(a => (
            <Card key={a.id} className={a.signed ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.teacher_name}</p>
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
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => copyLink(a.teacher_name)}>
                      <Copy className="h-3 w-3 mr-1" /> Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openWhatsApp(a.teacher_name)}>
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
