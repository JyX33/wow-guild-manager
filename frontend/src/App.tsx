import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import withAuth from './components/withAuth';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';

const queryClient = new QueryClient();

// Apply withAuth HOC to components that require authentication
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedGuildPage = withAuth(GuildPage);
const ProtectedCreateEventPage = withAuth(CreateEventPage);
const ProtectedEventDetailsPage = withAuth(EventDetailsPage);
const ProtectedEditEventPage = withAuth(EditEventPage);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="min-h-screen">
              <main className="min-h-screen">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/dashboard" element={<ProtectedDashboard />} />
                  <Route path="/guild/:guildId" element={<ProtectedGuildPage />} />
                  <Route path="/guild/:guildId/event/create" element={<ProtectedCreateEventPage />} />
                  <Route path="/event/:eventId" element={<ProtectedEventDetailsPage />} />
                  <Route path="/event/:eventId/edit" element={<ProtectedEditEventPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
