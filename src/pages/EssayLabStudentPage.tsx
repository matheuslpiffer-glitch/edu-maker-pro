import { useParams } from 'react-router-dom';
import { EssayLabStudent } from '@/pages/EssayLab';

export default function EssayLabStudentPage() {
  const { code } = useParams<{ code: string }>();
  if (!code) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Código inválido</div>;
  return <EssayLabStudent accessCode={code} />;
}
