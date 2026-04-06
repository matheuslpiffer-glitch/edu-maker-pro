interface StudyDay {
  day: string;
  mission: string;
  time: string;
}

interface Props {
  schedule: StudyDay[];
  institutionName?: string;
  theme?: string;
}

export default function StudySchedule({ schedule, institutionName, theme }: Props) {
  if (!schedule.length) return null;

  return (
    <div
      className="bg-white text-black p-8 max-w-[210mm] mx-auto"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11pt',
        pageBreakBefore: 'always',
      }}
      data-pdf-section="study-schedule"
    >
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <p className="text-xs font-bold uppercase">{institutionName || 'INSTITUIÇÃO DE ENSINO'}</p>
        <p className="text-sm font-bold uppercase mt-1">📅 CRONOGRAMA DE ESTUDO SEMANAL</p>
        {theme && <p className="text-xs uppercase mt-1">TEMA: {theme}</p>}
      </div>

      <div className="mb-4 space-y-2" style={{ fontSize: '10pt' }}>
        <p className="uppercase">NOME: _________________________________________________________ Nº: ______</p>
        <p className="uppercase">TURMA: _________________ DATA: ____/____/________ TURNO: ______________</p>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border-2 border-black" style={{ fontSize: '10pt' }}>
        <thead>
          <tr>
            <th className="border-2 border-black p-2 text-left uppercase font-bold" style={{ width: '20%', background: '#F3F4F6' }}>
              DIA
            </th>
            <th className="border-2 border-black p-2 text-left uppercase font-bold" style={{ background: '#F3F4F6' }}>
              MISSÃO DE ESTUDO
            </th>
            <th className="border-2 border-black p-2 text-center uppercase font-bold" style={{ width: '18%', background: '#F3F4F6' }}>
              TEMPO SUGERIDO
            </th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item, i) => (
            <tr key={i}>
              <td className="border-2 border-black p-2 font-bold uppercase">{item.day}</td>
              <td className="border-2 border-black p-2 uppercase">{item.mission}</td>
              <td className="border-2 border-black p-2 text-center uppercase">{item.time}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tip box */}
      <div className="mt-4 p-3 border border-black rounded" style={{ fontSize: '9pt' }}>
        <p className="font-bold uppercase">💡 DICA DA IA DOUTORA:</p>
        <p className="uppercase mt-1">
          ESTUDE EM UM LOCAL TRANQUILO, SEM DISTRAÇÕES. MARQUE UM ✓ AO LADO DE CADA MISSÃO CONCLUÍDA PARA ACOMPANHAR SEU PROGRESSO!
        </p>
      </div>

      {/* Checkboxes */}
      <div className="mt-3 flex flex-wrap gap-4" style={{ fontSize: '9pt' }}>
        {schedule.map((item, i) => (
          <div key={i} className="flex items-center gap-1 uppercase">
            <div className="w-4 h-4 border-2 border-black" /> <span className="font-bold">{item.day}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-2 border-t border-gray-300 text-center" style={{ fontSize: '7pt', color: '#9CA3AF' }}>
        <p className="uppercase">CRONOGRAMA DE ESTUDO — INFOGRÁFICO PEDAGÓGICO — EDUCREATOR PRO</p>
      </div>
    </div>
  );
}

export type { StudyDay };
