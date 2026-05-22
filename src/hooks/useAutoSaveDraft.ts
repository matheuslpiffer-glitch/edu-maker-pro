import { useEffect, useState } from 'react';

/**
 * Hook de Persistência Ativa - EduCreator Pro
 * Garante resiliência de dados mesmo se a aba fechar ou resetar.
 */
export function useAutoSaveDraft<T>(storageKey: string, initialValue: T): [T, (value: T) => void] {
    
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

    return [state, setState];
}
