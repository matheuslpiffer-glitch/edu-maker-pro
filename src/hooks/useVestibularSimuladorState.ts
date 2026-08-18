import { useState } from 'react';

export function useVestibularSimuladorState() {
  const [vestTab, setVestTab] = useState<'publicas' | 'particulares'>('publicas');
  const [vestInstitution, setVestInstitution] = useState('');
  const [vestFormatType, setVestFormatType] = useState<'geral' | 'disciplina'>('geral');
  const [vestDiscipline, setVestDiscipline] = useState('');

  return {
    vestTab,
    setVestTab,
    vestInstitution,
    setVestInstitution,
    vestFormatType,
    setVestFormatType,
    vestDiscipline,
    setVestDiscipline,
  };
}
