import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Ya hay una sesión activa: no tiene sentido mostrar el formulario de login.
  if (isAuthenticated) {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00345E] via-[#335D7E] to-[#00345E] p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="text-white space-y-6 hidden md:block">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold">UTA</h1>
            <div className="w-20 h-1 bg-[#C9982E]"></div>
          </div>
          <h2 className="text-3xl font-semibold">Universidad Técnica de Ambato</h2>
          <p className="text-xl text-white/80">Sistema de Gestión de Promociones y Escalafón Docente</p>
          <div className="pt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#C9982E] rounded-full mt-2"></div>
              <p className="text-white/70">Gestión integral de promoción docente</p>
            </div>
          </div>
        </div>

        <Card className="w-full shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#C9982E] rounded-lg flex items-center justify-center text-white font-bold text-xl">U</div>
              <div>
                <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
                <CardDescription>Sistema de Promociones  UTA</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@uta.edu.ec" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full bg-[#00345E] hover:bg-[#002A4B]" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
