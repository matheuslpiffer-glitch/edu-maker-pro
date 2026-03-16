import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SavedQuestionsBankProvider } from "@/hooks/useSavedQuestionsBank";
import { StudentModeProvider } from "@/hooks/useStudentMode";
import MatChatbot from "@/components/MatChatbot";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
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
import PisaSimulators from "@/pages/PisaSimulators";
import PisaStudentView from "@/pages/PisaStudentView";
// Removed: ResultsAnalysis, PedagogicalEvolution (focus on 5 core engines)
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
import Inclusao from "@/pages/Inclusao";
import ReferenciasBibliograficas from "@/pages/ReferenciasBibliograficas";
import NotFound from "@/pages/NotFound";
import Install from "@/pages/Install";
import SignAttendance from "@/pages/SignAttendance";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
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
        <Route path="/vestibulares" element={<Vestibulares />} />
        <Route path="/tecnicos" element={<Tecnicos />} />
        <Route path="/jogos" element={<GameFactory />} />
        <Route path="/pisa" element={<PisaSimulators />} />
        <Route path="/biblioteca" element={<BibliotecaAvaliacoes />} />
        {/* Removed: /resultados, /evolucao, /agenda — focusing on core engines */}
        <Route path="/banco-ia" element={<QuestionBankAI />} />
        <Route path="/guia" element={<SystemGuide />} />
        <Route path="/manual" element={<TeacherManual />} />
        <Route path="/manual-aluno" element={<ManualAluno />} />
        <Route path="/corretor-visao" element={<VisionCorrector />} />
        <Route path="/referencias" element={<ReferenciasBibliograficas />} />
        {/* Student Edition routes */}
        <Route path="/aluno" element={<StudentDashboard />} />
        <Route path="/aluno/quiz" element={<StudentQuiz />} />
        <Route path="/aluno/desempenho" element={<StudentPerformance />} />
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
                <Route path="/assinar/:id" element={<SignAttendance />} />
                <Route path="/pisa-aluno/:id" element={<PisaStudentView />} />
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
