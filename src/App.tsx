import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { SavedQuestionsBankProvider } from "@/hooks/useSavedQuestionsBank";
import { StudentModeProvider } from "@/hooks/useStudentMode";
import MatChatbot from "@/components/MatChatbot";
import WwwRedirect from "@/components/WwwRedirect";
import { BackgroundGenerationProvider } from "@/hooks/useBackgroundGeneration";
import { ChatProvider } from "@/hooks/useChat";
import PinAutoRedirect from "@/components/PinAutoRedirect";
import AppLayout from "@/components/AppLayout";
import RoleSelection from "@/pages/RoleSelection";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazy-retry";

// Lazy-loaded pages
const LandingProfessor = lazyWithRetry(() => import("@/pages/LandingProfessor"));
const LandingEstudo = lazyWithRetry(() => import("@/pages/LandingEstudo"));
const Index = lazyWithRetry(() => import("@/pages/Index"));
const MatChat = lazyWithRetry(() => import("@/pages/MatChat"));
const QuestionBank = lazyWithRetry(() => import("@/pages/QuestionBank"));
const CreateQuestion = lazyWithRetry(() => import("@/pages/CreateQuestion"));
const Assessments = lazyWithRetry(() => import("@/pages/Assessments"));
const CreateAssessment = lazyWithRetry(() => import("@/pages/CreateAssessment"));
const Subjects = lazyWithRetry(() => import("@/pages/Subjects"));
const AdvancedSettings = lazyWithRetry(() => import("@/pages/AdvancedSettings"));
const RedacaoView = lazyWithRetry(() => import("@/views/RedacaoView"));
const EssayCorrector = lazyWithRetry(() => import("@/pages/EssayCorrector"));
const EssayEliteCorrector = lazyWithRetry(() => import("@/pages/EssayEliteCorrector"));
const EduSlides = lazyWithRetry(() => import("@/pages/EduSlides"));
const Simulators = lazyWithRetry(() => import("@/pages/Simulators"));
const Vestibulares = lazyWithRetry(() => import("@/pages/Vestibulares"));
const Tecnicos = lazyWithRetry(() => import("@/pages/Tecnicos"));
const GameFactory = lazyWithRetry(() => import("@/pages/GameFactory"));
const LiteraturaView = lazyWithRetry(() => import("@/views/LiteraturaView"));
const PisaSimulators = lazyWithRetry(() => import("@/pages/PisaSimulators"));
const PisaStudentView = lazyWithRetry(() => import("@/pages/PisaStudentView"));
const QuestionBankAI = lazyWithRetry(() => import("@/pages/QuestionBankAI"));
const SobreProjeto = lazyWithRetry(() => import("@/pages/SobreProjeto"));
const SystemGuide = lazyWithRetry(() => import("@/pages/SystemGuide"));
const ManualAluno = lazyWithRetry(() => import("@/pages/ManualAluno"));
const TeacherManual = lazyWithRetry(() => import("@/pages/TeacherManual"));
const BibliotecaAvaliacoes = lazyWithRetry(() => import("@/pages/BibliotecaAvaliacoes"));
const StudentDashboard = lazyWithRetry(() => import("@/pages/StudentDashboard"));
const StudentQuiz = lazyWithRetry(() => import("@/pages/StudentQuiz"));
const StudentPerformance = lazyWithRetry(() => import("@/pages/StudentPerformance"));
const VisionCorrector = lazyWithRetry(() => import("@/pages/VisionCorrector"));
const AltaPerformance = lazyWithRetry(() => import("@/pages/AltaPerformance"));
const BussolaVocacional = lazyWithRetry(() => import("@/pages/BussolaVocacional"));
const Inclusao = lazyWithRetry(() => import("@/pages/Inclusao"));
const EduStudio = lazyWithRetry(() => import("@/pages/EduStudio"));
const MindMapGenerator = lazyWithRetry(() => import("@/pages/MindMapGenerator"));
const HubPlanejamento = lazyWithRetry(() => import("@/pages/HubPlanejamento"));
const Infograficos = lazyWithRetry(() => import("@/pages/Infograficos"));
const ReferenciasBibliograficas = lazyWithRetry(() => import("@/pages/ReferenciasBibliograficas"));
const StudentActivityResponse = lazyWithRetry(() => import("@/pages/StudentActivityResponse"));
const StudentSimulatorView = lazyWithRetry(() => import("@/pages/StudentSimulatorView"));
const ResultadosAlunos = lazyWithRetry(() => import("@/pages/ResultadosAlunos"));
const MinhaBiblioteca = lazyWithRetry(() => import("@/pages/MinhaBiblioteca"));
const ShortLinkRedirect = lazyWithRetry(() => import("@/pages/ShortLinkRedirect"));
const Install = lazyWithRetry(() => import("@/pages/Install"));
const SignAttendance = lazyWithRetry(() => import("@/pages/SignAttendance"));
const EscutaAtiva = lazyWithRetry(() => import("@/pages/EscutaAtiva"));
const PausaPedagogica = lazyWithRetry(() => import("@/pages/PausaPedagogica"));
const ExtraActivity = lazyWithRetry(() => import("@/pages/ExtraActivity"));
const EssayLab = lazyWithRetry(() => import("@/pages/EssayLab"));
const EssayLabStudentPage = lazyWithRetry(() => import("@/pages/EssayLabStudentPage"));
const StudentEssayPortal = lazyWithRetry(() => import("@/pages/StudentEssayPortal"));
const CoordView = lazyWithRetry(() => import("@/pages/CoordView"));
const StudentEssayArena = lazyWithRetry(() => import("@/pages/StudentEssayArena"));
const Pricing = lazyWithRetry(() => import("@/pages/Pricing"));
const CheckoutReturn = lazyWithRetry(() => import("@/pages/CheckoutReturn"));
const HubRedacao = lazyWithRetry(() => import("@/pages/HubRedacao"));
const HubCriar = lazyWithRetry(() => import("@/pages/HubCriar"));
const HubAvaliacoes = lazyWithRetry(() => import("@/pages/HubAvaliacoes"));
const HubBiblioteca = lazyWithRetry(() => import("@/pages/HubBiblioteca"));
const OAuthConsent = lazyWithRetry(() => import("@/pages/OAuthConsent"));
const MatNotebook = lazyWithRetry(() => import("@/pages/MatNotebook"));
const EduCanvas = lazyWithRetry(() => import("@/pages/EduCanvas"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/* Block student from teacher routes */
function TeacherOnly({ children }: { children: React.ReactNode }) {
  const { isStudent, loading } = useRole();
  const { toast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (!loading && isStudent && !shown.current) {
      shown.current = true;
      toast({ title: 'Acesso restrito', description: 'Esta área é restrita a professores.', variant: 'destructive' });
    }
  }, [loading, isStudent, toast]);

  if (loading) return null;
  if (isStudent) return <Navigate to="/aluno" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading, refetchRole, isStudent } = useRole();

  if (authLoading || (user && roleLoading)) {
    return <LazyFallback />;
  }

  if (!user) return (
    <Suspense fallback={<LazyFallback />}>
      <LandingProfessor />
    </Suspense>
  );

  if (!hasRole) {
    return <RoleSelection onRoleSelected={refetchRole} />;
  }

  if (isStudent) {
    return (
      <AppLayout>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/portal-aluno" replace />} />
            <Route path="/portal-aluno" element={<StudentDashboard />} />
            <Route path="/portal-aluno/quiz" element={<StudentQuiz />} />
            <Route path="/portal-aluno/arena-redacao" element={<StudentEssayArena />} />
            <Route path="/portal-aluno/desempenho" element={<StudentPerformance />} />
            <Route path="/portal-aluno/literatura" element={<LiteraturaView />} />
            <Route path="/infograficos" element={<Infograficos />} />
            <Route path="/planos" element={<Pricing />} />
            <Route path="/aluno" element={<Navigate to="/portal-aluno" replace />} />
            <Route path="/aluno/quiz" element={<Navigate to="/portal-aluno/quiz" replace />} />
            <Route path="/aluno/desempenho" element={<Navigate to="/portal-aluno/desempenho" replace />} />
            <Route path="*" element={<Navigate to="/portal-aluno" replace />} />
          </Routes>
        </Suspense>
        <MatChatbot />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/mat-chat" element={<MatChat />} />
          <Route path="/mat-notebook" element={<MatNotebook />} />
          <Route path="/edu-canvas" element={<EduCanvas />} />
          <Route path="/" element={<Index />} />
          <Route path="/dashboard-professor" element={<Navigate to="/" replace />} />
          <Route path="/sobre" element={<SobreProjeto />} />
          <Route path="/questoes" element={<QuestionBank />} />
          <Route path="/questoes/nova" element={<CreateQuestion />} />
          <Route path="/questoes/:id/editar" element={<CreateQuestion />} />
          <Route path="/provas" element={<Assessments />} />
          <Route path="/provas/nova" element={<CreateAssessment />} />
          <Route path="/provas/:id" element={<CreateAssessment />} />
          <Route path="/disciplinas" element={<Subjects />} />
          <Route path="/redacao" element={<RedacaoView />} />
          <Route path="/redacao/corretor" element={<EssayCorrector />} />
          <Route path="/redacao/elite" element={<EssayEliteCorrector />} />
          <Route path="/literatura" element={<LiteraturaView />} />
          <Route path="/configuracoes" element={<AdvancedSettings />} />
          <Route path="/eduslides" element={<EduSlides />} />
          <Route path="/simuladores" element={<Simulators />} />
          <Route path="/inclusao" element={<Inclusao />} />
          <Route path="/edustudio" element={<EduStudio />} />
          <Route path="/mapas-mentais" element={<MindMapGenerator />} />
          <Route path="/hub-360" element={<HubPlanejamento />} />
          <Route path="/infograficos" element={<Infograficos />} />
          <Route path="/alta-performance" element={<AltaPerformance />} />
          <Route path="/vestibulares" element={<Vestibulares />} />
          <Route path="/tecnicos" element={<Tecnicos />} />
          <Route path="/jogos" element={<GameFactory />} />
          <Route path="/atividade-extra" element={<ExtraActivity />} />
          <Route path="/redacao-lab" element={<EssayLab />} />
          <Route path="/redacao-hub" element={<HubRedacao />} />
          <Route path="/criar-hub" element={<HubCriar />} />
          <Route path="/avaliacoes-hub" element={<HubAvaliacoes />} />
          <Route path="/biblioteca-hub" element={<HubBiblioteca />} />
          <Route path="/bussola-vocacional" element={<BussolaVocacional />} />
          <Route path="/escuta-ativa" element={<EscutaAtiva />} />
          <Route path="/pausa-pedagogica" element={<PausaPedagogica />} />
          <Route path="/pisa" element={<PisaSimulators />} />
          <Route path="/biblioteca" element={<BibliotecaAvaliacoes />} />
          <Route path="/resultados-alunos" element={<ResultadosAlunos />} />
          <Route path="/coordenacao" element={<CoordView />} />
          <Route path="/minha-biblioteca" element={<MinhaBiblioteca />} />
          <Route path="/banco-ia" element={<QuestionBankAI />} />
          <Route path="/guia" element={<SystemGuide />} />
          <Route path="/manual" element={<TeacherManual />} />
          <Route path="/manual-aluno" element={<ManualAluno />} />
          <Route path="/corretor-visao" element={<VisionCorrector />} />
          <Route path="/referencias" element={<ReferenciasBibliograficas />} />
          <Route path="/planos" element={<Pricing />} />
          <Route path="/portal-aluno" element={<StudentDashboard />} />
          <Route path="/portal-aluno/quiz" element={<StudentQuiz />} />
          <Route path="/portal-aluno/arena-redacao" element={<StudentEssayArena />} />
          <Route path="/portal-aluno/desempenho" element={<StudentPerformance />} />
          <Route path="/portal-aluno/literatura" element={<LiteraturaView />} />
          <Route path="/aluno" element={<Navigate to="/portal-aluno" replace />} />
          <Route path="/aluno/quiz" element={<Navigate to="/portal-aluno/quiz" replace />} />
          <Route path="/aluno/desempenho" element={<Navigate to="/portal-aluno/desempenho" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <MatChatbot />
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SavedQuestionsBankProvider>
        <AuthProvider>
          <StudentModeProvider>
            <BackgroundGenerationProvider>
              <ChatProvider>
                <BrowserRouter>
                <WwwRedirect />
                <PinAutoRedirect>
                  <Suspense fallback={<LazyFallback />}>
                    <Routes>
                      <Route path="/install" element={<Install />} />
                      <Route path="/professor" element={<LandingProfessor />} />
                      <Route path="/estudo" element={<LandingEstudo />} />
                      <Route path="/assinar/:id" element={<SignAttendance />} />
                      <Route path="/pisa-aluno/:id" element={<PisaStudentView />} />
                      <Route path="/atividade/:id" element={<StudentActivityResponse />} />
                      <Route path="/redacao-online/:code" element={<StudentEssayPortal />} />
                      <Route path="/simulado/:id" element={<StudentSimulatorView />} />
                      <Route path="/aluno/simulado/:id" element={<StudentSimulatorView />} />
                      <Route path="/s/:code" element={<ShortLinkRedirect />} />
                      <Route path="/checkout/return" element={<CheckoutReturn />} />
                      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                      <Route path="/*" element={<AppRoutes />} />
                    </Routes>
                  </Suspense>
                </PinAutoRedirect>
                </BrowserRouter>
              </ChatProvider>
            </BackgroundGenerationProvider>
          </StudentModeProvider>
        </AuthProvider>
      </SavedQuestionsBankProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
