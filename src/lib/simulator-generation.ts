import { supabase } from '@/integrations/supabase/client';

export interface GenerationBatch {
  difficulty: string;
  count: number;
}

export interface SimulatorGenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalSteps: number;
  partialResult: any[];
  result?: unknown;
  error?: string;
}

export function chunkCount(total: number, chunkSize: number) {
  if (total <= 0) return [] as number[];

  const chunks: number[] = [];
  let remaining = total;

  while (remaining > 0) {
    const size = Math.min(chunkSize, remaining);
    chunks.push(size);
    remaining -= size;
  }

  return chunks;
}

export function buildBatchPlan(batches: GenerationBatch[], chunkSize = 3): GenerationBatch[] {
  return batches.flatMap((batch) =>
    chunkCount(batch.count, chunkSize).map((count) => ({
      difficulty: batch.difficulty,
      count,
    })),
  );
}

export async function createSimulatorGenerationJob(metadata: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('simulator-generation-job', {
    body: {
      action: 'create',
      metadata,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as SimulatorGenerationJob;
}

export async function updateSimulatorGenerationJob(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('simulator-generation-job', {
    body: {
      action: 'update',
      ...body,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as SimulatorGenerationJob;
}

export async function getSimulatorGenerationJob(jobId: string) {
  const { data, error } = await supabase.functions.invoke('simulator-generation-job', {
    body: {
      action: 'get',
      jobId,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as SimulatorGenerationJob;
}
