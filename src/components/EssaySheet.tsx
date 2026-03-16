import { forwardRef } from 'react';

interface TextoMotivador {
  tipo: string;
  conteudo: string;
}

interface Proposta {
  tema: string;
  textos_motivadores: TextoMotivador[];
  comando: string;
}

interface Props {
  proposta: Proposta;
  lineCount: number;
  includeHeader: boolean;
}

const EssaySheet = forwardRef<HTMLDivElement, Props>(
  ({ proposta, lineCount, includeHeader }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt' }}
      >
        {/* School Header */}
        {includeHeader && (
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <p className="text-xs uppercase tracking-wider">Governo do Estado de São Paulo</p>
            <p className="text-xs uppercase tracking-wider">Secretaria da Educação</p>
            <p className="text-xs uppercase tracking-wider">Unidade Regional de Ensino</p>
            <p className="font-bold text-sm mt-1">Escola William Silva</p>
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="font-bold text-base uppercase tracking-wide">Proposta de Redação</h2>
        </div>

        {/* Motivational Texts */}
        <div className="mb-4 space-y-3">
          {proposta.textos_motivadores.map((t, i) => (
            <div key={i} className="border-l-2 border-gray-400 pl-3">
              <p className="font-bold text-xs uppercase mb-0.5">{t.tipo}</p>
              <p className="text-[10pt] leading-relaxed">{t.conteudo}</p>
            </div>
          ))}
        </div>

        {/* Command */}
        <div className="bg-gray-100 border border-gray-300 rounded p-3 mb-4">
          <p className="text-[10pt] leading-relaxed">
            {proposta.comando.replace('[TEMA]', proposta.tema)}
          </p>
        </div>

        {/* Theme highlight */}
        <div className="text-center mb-5 border border-black py-2 bg-gray-50">
          <p className="text-xs uppercase tracking-wider mb-0.5 font-medium">Tema:</p>
          <p className="font-bold text-sm">{proposta.tema}</p>
        </div>

        {/* Writing grid */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase mb-2 tracking-wider">Folha de Redação</p>
          <div className="border border-gray-400">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="flex items-end"
                style={{ height: '0.8cm' }}
              >
                <span
                  className="text-gray-400 text-[8pt] w-6 text-right pr-1 flex-shrink-0 select-none"
                  style={{ lineHeight: '0.8cm' }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 border-b border-gray-300 h-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black pt-3 space-y-2 text-[10pt]">
          <div className="flex gap-4">
            <p className="flex-1">Nome do Aluno: _______________________________________________</p>
          </div>
          <div className="flex gap-8">
            <p>Série: _______________</p>
            <p>Data: ____/____/________</p>
          </div>
        </div>
      </div>
    );
  }
);

EssaySheet.displayName = 'EssaySheet';

export default EssaySheet;
