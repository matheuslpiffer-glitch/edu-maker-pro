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
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LandingProfessor from "@/pages/LandingProfessor";
import LandingEstudo from "@/pages/LandingEstudo";
import RoleSelection from "@/pages/RoleSelection";
import Index from "@/pages/Index";
import QuestionBank from "@/pages/QuestionBank";
import CreateQuestion from "@/pages/CreateQuestion";
import Assessments from "@/pages/Assessments";
import CreateAssessment from "@/pages/CreateAssessment";
import Subjects from "@/pages/Subjects";
import AdvancedSettings from "@/pages/AdvancedSettings";
import RedacaoView from "@/views/RedacaoView";
import EssayCorrector from "@/pages/EssayCorrector";
import EduSlides from "@/pages/EduSlides";
import Simulators from "@/pages/Simulators";
import Vestibulares from "@/pages/Vestibulares";
import Tecnicos from "@/pages/Tecnicos";
import GameFactory from "@/pages/GameFactory";
import LiteraturaView from "@/views/LiteraturaView";
import { ArrowLeftRight } from "lucide-react";
import PisaSimulators from "@/pages/PisaSimulators";
import PisaStudentView from "@/pages/PisaStudentView";
import QuestionBankAI from "@/pages/QuestionBankAI";
import SobreProjeto from "@/pages/SobreProjeto";
import SystemGuide from "@/pages/SystemGuide";
import ManualAluno from "@/pages/ManualAluno";
import TeacherManual from "@/pages/TeacherManual";
import BibliotecaAvaliacoes from "@/pages/BibliotecaAvaliacoes";
import StudentDashboard from "@/pages/StudentDashboard";
import StudentQuiz from "@/pages/StudentQuiz";
import StudentPerformance from "@/pages/StudentPerformance";
import VisionCorrector from "@/pages/VisionCorrector";
import AltaPerformance from "@/pages/AltaPerformance";
import BussolaVocacional from "@/pages/BussolaVocacional";
import Inclusao from "@/pages/Inclusao";
import ReferenciasBibliograficas from "@/pages/ReferenciasBibliograficas";
import StudentActivityResponse from "@/pages/StudentActivityResponse";
import StudentSimulatorView from "@/pages/StudentSimulatorView";
import ResultadosAlunos from "@/pages/ResultadosAlunos";
import MinhaBiblioteca from "@/pages/MinhaBiblioteca";
import NotFound from "@/pages/NotFound";
import Install from "@/pages/Install";
import SignAttendance from "@/pages/SignAttendance";
import { Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient();

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  /* User logged in but no role assigned yet → show role picker */
  if (!hasRole) {
    return <RoleSelection onRoleSelected={refetchRole} />;
  }

  /* Student role → only student routes */
  if (isStudent) {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/portal-aluno" replace />} />
          <Route path="/portal-aluno" element={<StudentDashboard />} />
          <Route path="/portal-aluno/quiz" element={<StudentQuiz />} />
          <Route path="/portal-aluno/desempenho" element={<StudentPerformance />} />
          <Route path="/aluno" element={<Navigate to="/portal-aluno" replace />} />
          <Route path="/aluno/quiz" element={<Navigate to="/portal-aluno/quiz" replace />} />
          <Route path="/aluno/desempenho" element={<Navigate to="/portal-aluno/desempenho" replace />} />
          <Route path="*" element={<Navigate to="/portal-aluno" replace />} />
        </Routes>
        <MatChatbot />
      </AppLayout>
    );
  }

  /* Teacher / admin routes */
  return (
    <AppLayout>
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
        <Route path="/alta-performance" element={<AltaPerformance />} />
        <Route path="/vestibulares" element={<Vestibulares />} />
        <Route path="/tecnicos" element={<Tecnicos />} />
        <Route path="/jogos" element={<GameFactory />} />
        <Route path="/bussola-vocacional" element={<BussolaVocacional />} />
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
        {/* Student routes accessible from teacher mode too */}
        <Route path="/portal-aluno" element={<StudentDashboard />} />
        <Route path="/portal-aluno/quiz" element={<StudentQuiz />} />
        <Route path="/portal-aluno/desempenho" element={<StudentPerformance />} />
        <Route path="/aluno" element={<Navigate to="/portal-aluno" replace />} />
        <Route path="/aluno/quiz" element={<Navigate to="/portal-aluno/quiz" replace />} />
        <Route path="/aluno/desempenho" element={<Navigate to="/portal-aluno/desempenho" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
            <BrowserRouter>
              <Routes>
                <Route path="/install" element={<Install />} />
                <Route path="/professor" element={<LandingProfessor />} />
                <Route path="/estudo" element={<LandingEstudo />} />
                <Route path="/assinar/:id" element={<SignAttendance />} />
                <Route path="/pisa-aluno/:id" element={<PisaStudentView />} />
                <Route path="/atividade/:id" element={<StudentActivityResponse />} />
                <Route path="/simulado/:id" element={<StudentSimulatorView />} />
                <Route path="/aluno/simulado/:id" element={<StudentSimulatorView />} />
                <Route path="/*" element={<AppRoutes />} />
              </Routes>
            </BrowserRouter>
          </StudentModeProvider>
        </AuthProvider>
      </SavedQuestionsBankProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
