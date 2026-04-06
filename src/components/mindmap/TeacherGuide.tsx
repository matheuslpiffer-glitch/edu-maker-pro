import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildPublicAppUrl } from '@/lib/public-links';

interface Props {
  theme: string;
  subject?: string;
  grade?: string;
  mode: string;
  institutionName?: string;
  hasQuestions: boolean;
  hasSchedule: boolean;
  accessCode?: string;
}

export default function TeacherGuide({
  theme, subject, grade, mode, institutionName, hasQuestions, hasSchedule, accessCode,
}: Props) {
  const { toast } = useToast();
  const guideRef = useRef<HTMLDivElement>(null);
  const school = institutionName || 'INSTITUIÇÃO DE ENSINO';

  const modeLabel = mode === 'infantil' ? 'EXPLORADOR MIRIM (ANOS INICIAIS)'
    : mode === 'fundamental' ? 'CONEXÃO ANALÍTICA (FUNDAMENTAL II)'
    : 'SÍNTESE ACADÊMICA (ENSINO MÉDIO)';

  const handleWhatsApp = () => {
    const link = accessCode
      ? buildPublicAppUrl(`/atividade/${accessCode}`)
      : buildPublicAppUrl('/mapa-mental');
    const msg = encodeURIComponent(
      `Olá, segue o material pedagógico diagramado pela Coordenação para a sua aula. Paz e Bem!\n\n` +
      `📌 Tema: ${theme.toUpperCase()}\n` +
      `🏫 ${school}\n` +
      `🔗 ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleCopyLink = () => {
    const link = accessCode
      ? buildPublicAppUrl(`/atividade/${accessCode}`)
      : buildPublicAppUrl('/mapa-mental');
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado! 📋' });
  };

  const handlePrint = async () => {
    if (!guideRef.current) return;
    try {
      const { generatePdfFromElement } = await import('@/lib/pdf-utils');
      await generatePdfFromElement(guideRef.current, `manual-professor-${theme.replace(/\s+/g, '-')}`, { orientation: 'portrait' });
      toast({ title: 'Manual exportado em PDF! 📄' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Action buttons (no-print) */}
      <div className="flex flex-wrap gap-2 no-print">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          📄 Exportar Manual PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-600 border-green-300 hover:bg-green-50">
          <Share2 className="h-4 w-4 mr-1" /> WhatsApp
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-1" /> Copiar Link
        </Button>
      </div>

      {/* Printable guide */}
      <div
        ref={guideRef}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto rounded-lg"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.15',
          pageBreakBefore: 'always',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <p className="text-xs font-bold uppercase">{school}</p>
          <p className="text-base font-bold uppercase mt-2">📄 GUIA DE USO DO PROFESSOR</p>
          <p className="text-xs uppercase mt-1">MATERIAL PEDAGÓGICO — INFOGRÁFICO MAKER</p>
        </div>

        {/* Activity info */}
        <div className="mb-5 space-y-1" style={{ fontSize: '10pt' }}>
          <p className="uppercase"><strong>TEMA:</strong> {theme.toUpperCase()}</p>
          {subject && <p className="uppercase"><strong>DISCIPLINA:</strong> {subject.toUpperCase()}</p>}
          {grade && <p className="uppercase"><strong>SÉRIE/ANO:</strong> {grade.toUpperCase().replace('_', ' ')}</p>}
          <p className="uppercase"><strong>MODELO VISUAL:</strong> {modeLabel}</p>
        </div>

        {/* Instructions */}
        <div className="space-y-4" style={{ fontSize: '10pt' }}>
          <div>
            <p className="font-bold uppercase mb-1">1. COMO UTILIZAR O INFOGRÁFICO:</p>
            <ul className="list-disc pl-5 space-y-1 uppercase">
              <li>IMPRIMA O INFOGRÁFICO EM FOLHA A4 (PREFERENCIALMENTE COLORIDO).</li>
              <li>COLE NO MURAL DA SALA OU DISTRIBUA COMO MATERIAL INDIVIDUAL.</li>
              <li>PEÇA AOS ALUNOS PARA IDENTIFICAR O TEMA CENTRAL E AS RAMIFICAÇÕES.</li>
              <li>UTILIZE AS DICAS DE MEMORIZAÇÃO (MEMORY TRICKS) COMO GATILHOS MENTAIS.</li>
              <li>EXPLORE AS CONEXÕES ENTRE OS CONCEITOS COM PERGUNTAS DIRECIONADAS.</li>
            </ul>
          </div>

          {hasQuestions && (
            <div>
              <p className="font-bold uppercase mb-1">2. QUESTÕES DE ANÁLISE E INTERPRETAÇÃO:</p>
              <ul className="list-disc pl-5 space-y-1 uppercase">
                <li>AS QUESTÕES FORAM GERADAS PELA IA DOUTORA COM BASE NO INFOGRÁFICO.</li>
                <li>APLIQUE COMO ATIVIDADE DIAGNÓSTICA OU AVALIAÇÃO FORMATIVA.</li>
                <li>O GABARITO ESTÁ INCLUSO NA ÚLTIMA SEÇÃO DO MATERIAL.</li>
                <li>ADAPTE AS QUESTÕES CONFORME A REALIDADE DA TURMA.</li>
              </ul>
            </div>
          )}

          {hasSchedule && (
            <div>
              <p className="font-bold uppercase mb-1">{hasQuestions ? '3' : '2'}. CRONOGRAMA DE ESTUDO SEMANAL:</p>
              <ul className="list-disc pl-5 space-y-1 uppercase">
                <li>O CRONOGRAMA SUGERE MISSÕES DIÁRIAS (SEGUNDA A SEXTA).</li>
                <li>ORIENTE OS ALUNOS A MARCAR AS MISSÕES CONCLUÍDAS COM ✓.</li>
                <li>INCENTIVE A REVISÃO DO INFOGRÁFICO ANTES DA AVALIAÇÃO.</li>
                <li>O TEMPO SUGERIDO É FLEXÍVEL — ADAPTE CONFORME A TURMA.</li>
              </ul>
            </div>
          )}

          <div>
            <p className="font-bold uppercase mb-1">ORIENTAÇÕES GERAIS:</p>
            <ul className="list-disc pl-5 space-y-1 uppercase">
              <li>TODO O MATERIAL FOI DIAGRAMADO PELA IA DOUTORA NO PADRÃO RGF (ARIAL 11, MAIÚSCULAS, NEGRITO).</li>
              <li>O MATERIAL ESTÁ SINCRONIZADO NA NUVEM — ALTERAÇÕES FEITAS EM QUALQUER DISPOSITIVO SERÃO REFLETIDAS AUTOMATICAMENTE.</li>
              <li>PARA COMPARTILHAR COM OUTROS PROFESSORES, UTILIZE O BOTÃO DE WHATSAPP OU COPIE O LINK.</li>
              <li>EM CASO DE DÚVIDAS, CONSULTE O MANUAL DO SISTEMA OU A COORDENAÇÃO PEDAGÓGICA.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t-2 border-black text-center" style={{ fontSize: '8pt' }}>
          <p className="uppercase font-bold">COORDENAÇÃO PEDAGÓGICA — {school}</p>
          <p className="uppercase mt-1 text-gray-500">GUIA GERADO AUTOMATICAMENTE PELO EDUCREATOR PRO · {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}
