import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    window.dispatchEvent(new Event("credits:refresh"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md rounded-3xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-5">
          <CheckCircle2 className="text-emerald-400" size={36} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Pagamento concluído!</h1>
        <p className="text-sm text-slate-400 mb-6">
          {sessionId
            ? "Sua assinatura está sendo ativada — pode levar alguns segundos para aparecer no seu perfil."
            : "Não recebemos os dados da sessão. Se o pagamento foi feito, recarregue em instantes."}
        </p>
        <Button asChild size="lg" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold">
          <Link to="/dashboard-professor">
            Ir para o painel <ArrowRight size={16} className="ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}