import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ReviewSessionProvider } from './context/ReviewSessionContext';
import { ProcessProvider } from './context/ProcessContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <ReviewSessionProvider>
        <ProcessProvider>
          <RouterProvider router={router} />
          <Toaster />
        </ProcessProvider>
      </ReviewSessionProvider>
    </AuthProvider>
  );
}
