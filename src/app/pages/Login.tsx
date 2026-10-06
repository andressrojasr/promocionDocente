import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import utaLogo from '../../assets/uta-logo.png';

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#00345E] via-[#335D7E] to-[#00345E] p-4">
      <style>{`
        @keyframes login-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes login-slide { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes login-grow { from { width: 0; } to { width: 5rem; } }
        @keyframes login-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(24px, -26px) scale(1.08); } }
        @keyframes login-shine { from { transform: translateX(-120%) skewX(-20deg); } to { transform: translateX(260%) skewX(-20deg); } }
        .login-rise { animation: login-rise 0.8s ease-out both; }
        .login-slide { animation: login-slide 0.7s ease-out both; }
        .login-grow { animation: login-grow 0.9s ease-out 0.3s both; }
        .login-float { animation: login-float 11s ease-in-out infinite; }
        .login-shine::after { content: ''; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: translateX(-120%) skewX(-20deg); }
        .login-shine:hover::after { animation: login-shine 0.9s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .login-rise, .login-slide, .login-grow, .login-float { animation: none; }
        }
      `}</style>

      {/* Destellos de fondo */}
      <div className="login-float pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-[#C9982E]/20 blur-3xl" />
      <div className="login-float pointer-events-none absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-sky-300/15 blur-3xl [animation-delay:4s]" />

      <div className="relative grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
        <div className="hidden space-y-6 text-white md:block">
          <div className="space-y-4">
            <div className="login-rise inline-block rounded-2xl bg-white px-6 py-4 shadow-xl">
              <img src={utaLogo} alt="Universidad Técnica de Ambato" className="h-24 w-auto" />
            </div>
            <div className="login-grow h-1 rounded-full bg-[#C9982E]" />
          </div>

          <div className="login-slide space-y-3 [animation-delay:250ms]">
            <h1 className="text-4xl font-bold leading-tight">
              Promoción y escalafón
              <span className="block text-[#E8C46A]">del personal académico</span>
            </h1>
            <p className="text-lg text-white/80">
              Plataforma web institucional de postulación, revisión y seguimiento a los procesos de promoción docente.
            </p>
          </div>
        </div>

        <Card className="login-rise w-full shadow-2xl [animation-delay:200ms]">
          <CardHeader className="space-y-1">
            <img
              src={utaLogo}
              alt="Universidad Técnica de Ambato"
              className="mx-auto mb-4 h-16 w-auto md:hidden"
            />
            <div className="mb-4">
              <div className="mb-3 h-1 w-12 rounded-full bg-[#C9982E]" />
              <CardTitle className="text-2xl">Bienvenido</CardTitle>
              <CardDescription>Ingrese con su correo institucional para continuar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="usuario@uta.edu.ec"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="login-shine relative w-full gap-2 overflow-hidden bg-[#00345E] transition-transform hover:bg-[#002A4B] active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
