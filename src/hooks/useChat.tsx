import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

interface CanvasSection {
  id: string;
  title: string;
  content: string;
}

interface CanvasDocument {
  title: string;
  subtitle: string;
  difficultyLevel: number;
  sections: CanvasSection[];
}

interface ChatContextType {
  messages: Msg[];
  setMessages: (messages: Msg[] | ((prev: Msg[]) => Msg[])) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  isCanvasOpen: boolean;
  setIsCanvasOpen: (open: boolean) => void;
  canvasDocument: CanvasDocument;
  setCanvasDocument: (doc: CanvasDocument | ((prev: CanvasDocument) => CanvasDocument)) => void;
  canvasMessages: any[];
  setCanvasMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  // MatChat state
  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = sessionStorage.getItem('mat-chat-messages');
    return saved ? JSON.parse(saved) : [{ role: 'assistant', content: 'Olá, professor(a)! 👋 Sou o **Mat**, seu consultor pedagógico **EduCreator Pro**.' }];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem('mat-chat-session-id');
  });

  // EduCanvas state
  const [isCanvasOpen, setIsCanvasOpen] = useState(() => {
    return sessionStorage.getItem('edu-canvas-open') === 'true';
  });

  const [canvasDocument, setCanvasDocument] = useState<CanvasDocument>(() => {
    const saved = sessionStorage.getItem('edu-canvas-doc');
    return saved ? JSON.parse(saved) : {
      title: 'PEI - Plano de Ensino Individualizado',
      subtitle: 'Adaptação Curricular - 6º Ano (Matemática)',
      difficultyLevel: 2,
      sections: [
        {
          id: 'sec-1',
          title: '1. Perfil e Diagnóstico',
          content: 'O estudante apresenta excelente raciocínio lógico-espacial, necessitando de suporte visual para fixação de algoritmos fracionários e adaptação no tempo de realização das avaliações.',
        },
        {
          id: 'sec-2',
          title: '2. Objetivos de Aprendizagem (BNCC)',
          content: '(EF06MA07) Compreender, comparar e ordenar frações associadas às ideias de partes de inteiros e resultado de divisão.',
        },
        {
          id: 'sec-3',
          title: '3. Estratégias e Acessibilidade',
          content: '• Uso de material dourado e blocos fracionários virtuais.\n• Fragmentação das atividades em blocos curtos com pausas reflexivas.\n• Avaliação continuada com apoio de esquemas visuais.',
        },
      ],
    };
  });

  const [canvasMessages, setCanvasMessages] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('edu-canvas-messages');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        sender: 'ai',
        text: 'Olá! Como posso ajudar você hoje? Selecione uma ação no botão (+) ou digite o que precisa.',
      },
    ];
  });

  // Persistence effects
  useEffect(() => {
    if (messages) sessionStorage.setItem('mat-chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (currentSessionId) sessionStorage.setItem('mat-chat-session-id', currentSessionId);
    else sessionStorage.removeItem('mat-chat-session-id');
  }, [currentSessionId]);

  useEffect(() => {
    sessionStorage.setItem('edu-canvas-open', String(isCanvasOpen));
  }, [isCanvasOpen]);

  useEffect(() => {
    sessionStorage.setItem('edu-canvas-doc', JSON.stringify(canvasDocument));
  }, [canvasDocument]);

  useEffect(() => {
    sessionStorage.setItem('edu-canvas-messages', JSON.stringify(canvasMessages));
  }, [canvasMessages]);

  return (
    <ChatContext.Provider value={{
      messages, setMessages,
      currentSessionId, setCurrentSessionId,
      isCanvasOpen, setIsCanvasOpen,
      canvasDocument, setCanvasDocument,
      canvasMessages, setCanvasMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
