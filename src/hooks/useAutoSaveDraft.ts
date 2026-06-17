import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook de Persistência Ativa - EduCreator Pro
 * Garante resiliência de dados mesmo se a aba fechar ou resetar.
 */
function toJsonContent(value: unknown) {
    if (value === undefined || value === null) return null;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        console.error("Erro ao preparar rascunho para sincronização:", error);
        return null;
    }
}

export function useAutoSaveDraft<T>(storageKey: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    
    // 1. Tenta recuperar o rascunho salvo ao iniciar o componente
    const [state, setState] = useState<T>(() => {
        try {
            const savedDraft = localStorage.getItem(storageKey);
            return savedDraft ? JSON.parse(savedDraft) : initialValue;
        } catch (error) {
            console.error("Erro ao ler rascunho:", error);
            return initialValue;
        }
    });

    // 2. Efeito de Debounce: Aguarda 500ms de inatividade para gravar no disco local
    useEffect(() => {
        const handler = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(state));
            } catch (error) {
                console.error("Erro ao salvar rascunho local:", error);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [state, storageKey]);

    // 3. Sincronização com a nuvem quando a aba perde o foco
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                try {
                    const content = toJsonContent(state);
                    // Skip cloud sync when there is nothing to persist (avoids 400 on NOT NULL jsonb)
                    if (content === null) return;
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user) {
                        // Professor saiu da aba: Salva silenciosamente na nuvem
                        await supabase
                            .from('materials_drafts')
                            .upsert(
                                {
                                    user_id: user.id,
                                    storage_key: storageKey,
                                    content: content as any,
                                    updated_at: new Date().toISOString(),
                                },
                                { onConflict: 'user_id,storage_key', ignoreDuplicates: false }
                            );
                    }
                } catch (error) {
                    console.error("Erro ao sincronizar rascunho com a nuvem:", error);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [state, storageKey]);

    return [state, setState];
}