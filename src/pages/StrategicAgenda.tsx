import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays, Plus, Trash2, Edit2, FileText, Send, ChevronLeft, ChevronRight,
  Clock, MapPin, Filter, Users
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth,
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday,
  setHours, setMinutes, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_date: string;
  duration_minutes: number;
  category: string;
  event_type: string;
  location: string;
  whatsapp_webhook_url: string;
  reminder_sent: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'pedagogica', label: 'Pedagógica', color: 'bg-blue-500' },
  { value: 'administrativa', label: 'Administrativa', color: 'bg-amber-500' },
  { value: 'pais', label: 'Pais e Responsáveis', color: 'bg-indigo-500' },
];

const EVENT_TYPES = [
  { value: 'atpc', label: 'ATPC' },
  { value: 'conselho', label: 'Conselho de Classe' },
  { value: 'gestao', label: 'Reunião de Gestão' },
  { value: 'pais', label: 'Reunião de Pais' },
  { value: 'formacao', label: 'Formação Continuada' },
  { value: 'outro', label: 'Outro' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function StrategicAgenda() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderEvent, setReminderEvent] = useState<CalendarEvent | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_time: '14:00',
    duration_minutes: 60,
    category: 'pedagogica',
    event_type: 'atpc',
    location: '',
  });

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (!error && data) setEvents(data as CalendarEvent[]);
    setLoading(false);
  };

  const filteredEvents = useMemo(() => {
    if (filterCategory === 'all') return events;
    return events.filter(e => e.category === filterCategory);
  }, [events, filterCategory]);

  // Calendar days for monthly view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: ptBR });
    const end = endOfWeek(endOfMonth(currentDate), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Calendar days for weekly view
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    const end = endOfWeek(currentDate, { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter(e => isSameDay(parseISO(e.event_date), day));

  const getCategoryColor = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.color || 'bg-muted';

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  const getTypeLabel = (type: string) =>
    EVENT_TYPES.find(t => t.value === type)?.label || type;

  const openNewEvent = (date?: Date) => {
    setEditingEvent(null);
    setForm({
      title: '',
      description: '',
      event_date: format(date || new Date(), 'yyyy-MM-dd'),
      event_time: '14:00',
      duration_minutes: 60,
      category: 'pedagogica',
      event_type: 'atpc',
      location: '',
    });
    setDialogOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    const d = parseISO(ev.event_date);
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description,
      event_date: format(d, 'yyyy-MM-dd'),
      event_time: format(d, 'HH:mm'),
      duration_minutes: ev.duration_minutes,
      category: ev.category,
      event_type: ev.event_type,
      location: ev.location,
    });
    setDialogOpen(true);
    setDetailOpen(false);
  };

  const saveEvent = async () => {
    if (!user || !form.title.trim()) {
      toast({ title: 'Preencha o título do evento', variant: 'destructive' });
      return;
    }
    const [h, m] = form.event_time.split(':').map(Number);
    const dt = setMinutes(setHours(new Date(form.event_date), h), m);

    const payload = {
      title: form.title,
      description: form.description,
      event_date: dt.toISOString(),
      duration_minutes: form.duration_minutes,
      category: form.category,
      event_type: form.event_type,
      location: form.location,
      user_id: user.id,
    };

    if (editingEvent) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      if (error) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); return; }
      toast({ title: 'Evento atualizado!' });
    } else {
      const { error } = await supabase.from('calendar_events').insert(payload);
      if (error) { toast({ title: 'Erro ao criar evento', variant: 'destructive' }); return; }
      toast({ title: 'Evento criado!' });
    }
    setDialogOpen(false);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    toast({ title: 'Evento removido' });
    setDetailOpen(false);
    fetchEvents();
  };

  // Navigate to EduSlides/Meetings with pre-filled data (Gerar Ata)
  const generateMinutes = (ev: CalendarEvent) => {
    const params = new URLSearchParams({
      topic: ev.title,
      date: ev.event_date,
      objective: ev.description,
    });
    window.location.href = `/eduslides?${params.toString()}`;
  };

  // WhatsApp reminder via Zapier webhook
  const openReminderDialog = (ev: CalendarEvent) => {
    setReminderEvent(ev);
    setWebhookUrl(ev.whatsapp_webhook_url || '');
    setReminderDialogOpen(true);
  };

  const sendReminder = async () => {
    if (!reminderEvent || !webhookUrl) {
      toast({ title: 'Insira o webhook do Zapier', variant: 'destructive' });
      return;
    }
    setSendingReminder(true);
    try {
      // Save webhook URL to event
      await supabase.from('calendar_events')
        .update({ whatsapp_webhook_url: webhookUrl, reminder_sent: true })
        .eq('id', reminderEvent.id);

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          titulo: reminderEvent.title,
          data: format(parseISO(reminderEvent.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          pauta: reminderEvent.description,
          local: reminderEvent.location,
          tipo: getTypeLabel(reminderEvent.event_type),
          mensagem: `📋 *Lembrete de Reunião*\n\n📌 ${reminderEvent.title}\n📅 ${format(parseISO(reminderEvent.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n📍 ${reminderEvent.location || 'A definir'}\n\n📝 *Pauta:*\n${reminderEvent.description}`,
        }),
      });

      toast({ title: 'Lembrete enviado!', description: 'Verifique o histórico do Zap para confirmar.' });
      setReminderDialogOpen(false);
      fetchEvents();
    } catch {
      toast({ title: 'Erro ao enviar lembrete', variant: 'destructive' });
    } finally {
      setSendingReminder(false);
    }
  };

  const navigateDate = (dir: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  // Category stats
  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      count: events.filter(e => e.category === cat.value).length,
    }));
  }, [events]);

  const displayDays = viewMode === 'month' ? monthDays : weekDays;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda Estratégica 2026
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calendário de reuniões, atas e lembretes para a coordenação
          </p>
        </div>
        <Button onClick={() => openNewEvent()} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer border-2" style={{ borderColor: filterCategory === 'all' ? 'hsl(var(--primary))' : 'transparent' }} onClick={() => setFilterCategory('all')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{events.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        {categoryStats.map(cat => (
          <Card key={cat.value} className="cursor-pointer border-2" style={{ borderColor: filterCategory === cat.value ? 'hsl(var(--primary))' : 'transparent' }} onClick={() => setFilterCategory(cat.value)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{cat.count}</p>
              <p className="text-xs text-muted-foreground">{cat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
              : `Semana de ${format(startOfWeek(currentDate, { locale: ptBR }), "dd/MM", { locale: ptBR })}`}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
        <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'month' | 'week')}>
          <TabsList>
            <TabsTrigger value="month">Mensal</TabsTrigger>
            <TabsTrigger value="week">Semanal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className={`grid grid-cols-7 ${viewMode === 'week' ? 'min-h-[200px]' : ''}`}>
            {displayDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={i}
                  className={`border border-border/50 p-1 min-h-[80px] sm:min-h-[100px] cursor-pointer transition-colors hover:bg-accent/30 ${
                    !inMonth && viewMode === 'month' ? 'opacity-40' : ''
                  } ${isToday(day) ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
                  onClick={() => openNewEvent(day)}
                >
                  <span className={`text-xs font-medium ${isToday(day) ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer ${getCategoryColor(ev.category)}`}
                        onClick={e => { e.stopPropagation(); setDetailEvent(ev); setDetailOpen(true); }}
                      >
                        {format(parseISO(ev.event_date), 'HH:mm')} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getCategoryColor(detailEvent?.category || '')}`} />
              {detailEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {detailEvent && format(parseISO(detailEvent.event_date), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{getTypeLabel(detailEvent.event_type)}</Badge>
                <Badge variant="outline">{getCategoryLabel(detailEvent.category)}</Badge>
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{detailEvent.duration_minutes}min</Badge>
              </div>
              {detailEvent.location && (
                <p className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" /> {detailEvent.location}</p>
              )}
              {detailEvent.description && (
                <div className="bg-muted/50 p-3 rounded text-sm">{detailEvent.description}</div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => generateMinutes(detailEvent)}>
                  <FileText className="h-3.5 w-3.5" /> Gerar Ata
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openReminderDialog(detailEvent)}>
                  <Send className="h-3.5 w-3.5" /> Lembrar Professores
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditEvent(detailEvent)}>
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => deleteEvent(detailEvent.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>Preencha os dados da reunião ou evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: ATPC - Matemática" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Reunião</Label>
                <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Sala dos professores" />
              </div>
            </div>
            <div>
              <Label>Pauta / Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Descreva a pauta da reunião..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEvent}>{editingEvent ? 'Salvar' : 'Criar Evento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-500" /> Lembrar Professores via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Conecte um Zap com trigger de Webhook para enviar a pauta da reunião pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
              <p><strong>Reunião:</strong> {reminderEvent?.title}</p>
              <p><strong>Data:</strong> {reminderEvent && format(parseISO(reminderEvent.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p><strong>Pauta:</strong> {reminderEvent?.description || 'Sem pauta definida'}</p>
            </div>
            <div>
              <Label>URL do Webhook (Zapier)</Label>
              <Input
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Crie um Zap com trigger &quot;Webhooks by Zapier&quot; e uma ação de envio via WhatsApp.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Cancelar</Button>
            <Button onClick={sendReminder} disabled={sendingReminder} className="gap-2">
              {sendingReminder ? 'Enviando...' : 'Enviar Lembrete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
