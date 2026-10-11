import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { Studio } from './pages/Studio.js';
import { Projects } from './pages/Projects.js';
import { Templates } from './pages/Templates.js';
import { Favorites } from './pages/Favorites.js';
import { Credits } from './pages/Credits.js';
import { Admin } from './pages/Admin.js';
import { Settings } from './pages/Settings.js';
import { Help } from './pages/Help.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="create" element={<Studio />} />
              <Route path="projects" element={<Projects />} />
              <Route path="templates" element={<Templates />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="credits" element={<Credits />} />
              <Route path="admin" element={<Admin />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
