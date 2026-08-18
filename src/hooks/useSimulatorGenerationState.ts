import { useState } from 'react';

export function useSimulatorGenerationState(mode?: string) {
  const [activeMotor, setActiveMotor] = useState(mode ? 'simulado' : 'simulado');
  const [isExporting, setIsExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationTotalSteps, setGenerationTotalSteps] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [technicalDiscipline, setTechnicalDiscipline] = useState('');
  const [activeEspecialidade, setActiveEspecialidade] = useState('');
  const [activeFormat, setActiveFormat] = useState('completa');

  return {
    activeMotor, setActiveMotor,
    isExporting, setIsExporting,
    generating, setGenerating,
    saving, setSaving,
    generationJobId, setGenerationJobId,
    generationProgress, setGenerationProgress,
    generationStep, setGenerationStep,
    generationTotalSteps, setGenerationTotalSteps,
    generationMessage, setGenerationMessage,
    includeImages, setIncludeImages,
    technicalDiscipline, setTechnicalDiscipline,
    activeEspecialidade, setActiveEspecialidade,
    activeFormat, setActiveFormat
  };
}
