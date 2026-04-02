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
import PinAutoRedirect from "@/components/PinAutoRedirect";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import RoleSelection from "@/pages/RoleSelection";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, lazy, Suspense } from "react";

// Lazy-loaded pages
const LandingProfessor = lazy(() => import("@/pages/LandingProfessor"));
const LandingEstudo = lazy(() => import("@/pages/LandingEstudo"));
const Index = lazy(() => import("@/pages/Index"));
const QuestionBank = lazy(() => import("@/pages/QuestionBank"));
const CreateQuestion = lazy(() => import("@/pages/CreateQuestion"));
const Assessments = lazy(() => import("@/pages/Assessments"));
const CreateAssessment = lazy(() => import("@/pages/CreateAssessment"));
const Subjects = lazy(() => import("@/pages/Subjects"));
const AdvancedSettings = lazy(() => import("@/pages/AdvancedSettings"));
const RedacaoView = lazy(() => import("@/views/RedacaoView"));
const EssayCorrector = lazy(() => import("@/pages/EssayCorrector"));
const EduSlides = lazy(() => import("@/pages/EduSlides"));
const Simulators = lazy(() => import("@/pages/Simulators"));
const Vestibulares = lazy(() => import("@/pages/Vestibulares"));
const Tecnicos = lazy(() => import("@/pages/Tecnicos"));
const GameFactory = lazy(() => import("@/pages/GameFactory"));
const LiteraturaView = lazy(() => import("@/views/LiteraturaView"));
const PisaSimulators = lazy(() => import("@/pages/PisaSimulators"));
const PisaStudentView = lazy(() => import("@/pages/PisaStudentView"));
const QuestionBankAI = lazy(() => import("@/pages/QuestionBankAI"));
const SobreProjeto = lazy(() => import("@/pages/SobreProjeto"));
const SystemGuide = lazy(() => import("@/pages/SystemGuide"));
const ManualAluno = lazy(() => import("@/pages/ManualAluno"));
const TeacherManual = lazy(() => import("@/pages/TeacherManual"));
const BibliotecaAvaliacoes = lazy(() => import("@/pages/BibliotecaAvaliacoes"));
const StudentDashboard = lazy(() => import("@/pages/StudentDashboard"));
const StudentQuiz = lazy(() => import("@/pages/StudentQuiz"));
const StudentPerformance = lazy(() => import("@/pages/StudentPerformance"));
const VisionCorrector = lazy(() => import("@/pages/VisionCorrector"));
const AltaPerformance = lazy(() => import("@/pages/AltaPerformance"));
const BussolaVocacional = lazy(() => import("@/pages/BussolaVocacional"));
const Inclusao = lazy(() => import("@/pages/Inclusao"));
const EduStudio = lazy(() => import("@/pages/EduStudio"));
const MindMapGenerator = lazy(() => import("@/pages/MindMapGenerator"));
const HubPlanejamento = lazy(() => import("@/pages/HubPlanejamento"));
const ReferenciasBibliograficas = lazy(() => import("@/pages/ReferenciasBibliograficas"));
const StudentActivityResponse = lazy(() => import("@/pages/StudentActivityResponse"));
const StudentSimulatorView = lazy(() => import("@/pages/StudentSimulatorView"));
const ResultadosAlunos = lazy(() => import("@/pages/ResultadosAlunos"));
const MinhaBiblioteca = lazy(() => import("@/pages/MinhaBiblioteca"));
const ShortLinkRedirect = lazy(() => import("@/pages/ShortLinkRedirect"));
const Install = lazy(() => import("@/pages/Install"));
const SignAttendance = lazy(() => import("@/pages/SignAttendance"));
const EscutaAtiva = lazy(() => import("@/pages/EscutaAtiva"));
const PausaPedagogica = lazy(() => import("@/pages/PausaPedagogica"));
const ExtraActivity = lazy(() => import("@/pages/ExtraActivity"));
const EssayLab = lazy(() => import("@/pages/EssayLab"));
const EssayLabStudentPage = lazy(() => import("@/pages/EssayLabStudentPage"));
const StudentEssayPortal = lazy(() => import("@/pages/StudentEssayPortal"));
const CoordView = lazy(() => import("@/pages/CoordView"));

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

  if (!user) return <LandingPage />;

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
            <Route path="/portal-aluno/desempenho" element={<StudentPerformance />} />
            <Route path="/portal-aluno/literatura" element={<LiteraturaView />} />
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
          <Route path="/" element={<Navigate to="/dashboard-professor" replace />} />
          <Route path="/dashboard-professor" element={<Index />} />
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
          <Route path="/literatura" element={<LiteraturaView />} />
          <Route path="/configuracoes" element={<AdvancedSettings />} />
          <Route path="/eduslides" element={<EduSlides />} />
          <Route path="/simuladores" element={<Simulators />} />
          <Route path="/inclusao" element={<Inclusao />} />
          <Route path="/edustudio" element={<EduStudio />} />
          <Route path="/mapas-mentais" element={<MindMapGenerator />} />
          <Route path="/hub-360" element={<HubPlanejamento />} />
          <Route path="/alta-performance" element={<AltaPerformance />} />
          <Route path="/vestibulares" element={<Vestibulares />} />
          <Route path="/tecnicos" element={<Tecnicos />} />
          <Route path="/jogos" element={<GameFactory />} />
          <Route path="/atividade-extra" element={<ExtraActivity />} />
          <Route path="/redacao-lab" element={<EssayLab />} />
          <Route path="/bussola-vocacional" element={<BussolaVocacional />} />
          <Route path="/escuta-ativa" element={<EscutaAtiva />} />
          <Route path="/pausa-pedagogica" element={<PausaPedagogica />} />
          <Route path="/pisa" element={<PisaSimulators />} />
          <Route path="/biblioteca" element={<BibliotecaAvaliacoes />} />
          <Route path="/resultados-alunos" element={<ResultadosAlunos />} />
          <Route path="/minha-biblioteca" element={<MinhaBiblioteca />} />
          <Route path="/banco-ia" element={<QuestionBankAI />} />
          <Route path="/guia" element={<SystemGuide />} />
          <Route path="/manual" element={<TeacherManual />} />
          <Route path="/manual-aluno" element={<ManualAluno />} />
          <Route path="/corretor-visao" element={<VisionCorrector />} />
          <Route path="/referencias" element={<ReferenciasBibliograficas />} />
          <Route path="/portal-aluno" element={<StudentDashboard />} />
          <Route path="/portal-aluno/quiz" element={<StudentQuiz />} />
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
                      <Route path="/*" element={<AppRoutes />} />
                    </Routes>
                  </Suspense>
                </PinAutoRedirect>
              </BrowserRouter>
            </BackgroundGenerationProvider>
          </StudentModeProvider>
        </AuthProvider>
      </SavedQuestionsBankProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
