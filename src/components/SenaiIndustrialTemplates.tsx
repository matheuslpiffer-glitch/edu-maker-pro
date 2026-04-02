import { forwardRef } from 'react';

interface Props {
  institutionName: string;
  title: string;
}

const SenaiIndustrialTemplates = forwardRef<HTMLDivElement, Props>(({ institutionName, title }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black" style={{ fontFamily: "'Roboto', 'Arial', sans-serif", fontSize: '10pt', lineHeight: '1.5' }}>
      {/* ── Relatório de Manutenção ── */}
      <div style={{ pageBreakBefore: 'always', padding: '30mm 20mm 20mm 30mm' }}>
        <div className="border-2 border-[#0a1f3d]">
          {/* Header */}
          <div className="flex items-center border-b-2 border-[#0a1f3d]">
            <div className="bg-[#0a1f3d] text-white px-5 py-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              ⚙️ Relatório de Manutenção
            </div>
            <div className="flex-1 text-right px-4 text-xs text-gray-500">
              {institutionName || 'Instituição'} — {title || 'Curso Técnico'}
            </div>
          </div>

          {/* Fields */}
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-[#0a1f3d]">Equipamento/Máquina:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Nº de Patrimônio:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-bold text-[#0a1f3d]">Data:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Setor:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Técnico Responsável:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
            </div>

            {/* Tipo de Manutenção */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-2">Tipo de Manutenção:</span>
              <div className="flex gap-6">
                {['Preventiva', 'Corretiva', 'Preditiva', 'Emergencial'].map(t => (
                  <label key={t} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 border-2 border-[#0a1f3d] rounded-sm" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-1">Descrição do Problema / Serviço Realizado:</span>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6" />
              ))}
            </div>

            {/* Peças */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-2">Peças / Materiais Utilizados:</span>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0a1f3d] text-white">
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-left">Item</th>
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-left">Descrição</th>
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-center w-16">Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map(n => (
                    <tr key={n}>
                      <td className="border border-gray-300 px-2 py-2 text-center w-10">{n}</td>
                      <td className="border border-gray-300 px-2 py-2" />
                      <td className="border border-gray-300 px-2 py-2" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Checklist de Segurança */}
            <div className="p-3 border-2 border-amber-500 bg-amber-50 rounded-lg">
              <span className="font-bold text-amber-800 block mb-2">⚠️ Checklist de Segurança (NR-12 / NR-35):</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Óculos de proteção',
                  'Luvas de segurança',
                  'Protetor auricular',
                  'Calçado de segurança',
                  'Máquina desenergizada (LOTO)',
                  'Área sinalizada',
                  'Extintor disponível',
                  'Supervisor informado',
                ].map(item => (
                  <label key={item} className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-amber-600 rounded-sm" />
                    <span className="text-[10px]">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 pt-6 mt-4">
              <div className="text-center">
                <div className="border-b border-black mb-1" />
                <span className="text-[9px] text-gray-500">Assinatura do Técnico</span>
              </div>
              <div className="text-center">
                <div className="border-b border-black mb-1" />
                <span className="text-[9px] text-gray-500">Assinatura do Supervisor</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[7pt] text-gray-400 mt-4 tracking-wider">
          EDUFLOW INDUSTRIAL | CURRÍCULO TÉCNICO SENAI | Coord. Matheus Lima Piffer
        </p>
      </div>

      {/* ── Ordem de Serviço (OS) ── */}
      <div style={{ pageBreakBefore: 'always', padding: '30mm 20mm 20mm 30mm' }}>
        <div className="border-2 border-[#0a1f3d]">
          {/* Header */}
          <div className="flex items-center border-b-2 border-[#0a1f3d]">
            <div className="bg-[#0a1f3d] text-white px-5 py-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              📋 Ordem de Serviço (OS)
            </div>
            <div className="flex-1 text-right px-4">
              <span className="text-xs text-gray-500">OS Nº: ____________</span>
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Dados do Serviço */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-[#0a1f3d]">Solicitante:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Data de Abertura:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-bold text-[#0a1f3d]">Setor/Linha:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Máquina/TAG:</span>
                <div className="border-b border-gray-400 mt-1 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#0a1f3d]">Prioridade:</span>
                <div className="flex gap-4 mt-1">
                  {['Alta', 'Média', 'Baixa'].map(p => (
                    <label key={p} className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 border-2 border-[#0a1f3d] rounded-full" />
                      <span className="text-[10px]">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Descrição do Serviço */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-1">Descrição do Serviço Solicitado:</span>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6" />
              ))}
            </div>

            {/* Diagnóstico */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-1">Diagnóstico Técnico:</span>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6" />
              ))}
            </div>

            {/* Ações Corretivas */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-2">Ações Corretivas Realizadas:</span>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0a1f3d] text-white">
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-left w-8">#</th>
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-left">Ação</th>
                    <th className="border border-[#0a1f3d] px-2 py-1.5 text-center w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(n => (
                    <tr key={n}>
                      <td className="border border-gray-300 px-2 py-2 text-center">{n}</td>
                      <td className="border border-gray-300 px-2 py-2" />
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <div className="flex justify-center gap-2">
                          <div className="w-3 h-3 border border-gray-400 rounded-sm" />
                          <span className="text-[8px] text-gray-400">OK</span>
                          <div className="w-3 h-3 border border-gray-400 rounded-sm" />
                          <span className="text-[8px] text-gray-400">Pend.</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observações */}
            <div>
              <span className="font-bold text-[#0a1f3d] block mb-1">Observações e Recomendações:</span>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-b border-gray-300 h-6" />
              ))}
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-3 gap-6 pt-6 mt-4">
              <div className="text-center">
                <div className="border-b border-black mb-1" />
                <span className="text-[9px] text-gray-500">Técnico Executor</span>
              </div>
              <div className="text-center">
                <div className="border-b border-black mb-1" />
                <span className="text-[9px] text-gray-500">Supervisor</span>
              </div>
              <div className="text-center">
                <div className="border-b border-black mb-1" />
                <span className="text-[9px] text-gray-500">Solicitante</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[7pt] text-gray-400 mt-4 tracking-wider">
          EDUFLOW INDUSTRIAL | CURRÍCULO TÉCNICO SENAI | Coord. Matheus Lima Piffer
        </p>
      </div>
    </div>
  );
});

SenaiIndustrialTemplates.displayName = 'SenaiIndustrialTemplates';
export default SenaiIndustrialTemplates;
