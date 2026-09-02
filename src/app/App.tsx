import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ProcessProvider } from './context/ProcessContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <ProcessProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ProcessProvider>
    </AuthProvider>
  );
}
