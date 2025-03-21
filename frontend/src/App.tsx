import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AuthProtect } from './components/AuthProtect';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
import GuildManagePage from './pages/GuildManagePage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import CharactersPage from './pages/CharactersPage';

const queryClient = new QueryClient();

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
                  <Route path="/dashboard" element={
                    <AuthProtect>
                      <Dashboard />
                    </AuthProtect>
                  } />
                  <Route path="/guild/:guildId" element={
                    <AuthProtect>
                      <GuildPage />
                    </AuthProtect>
                  } />
                  <Route path="/guild/:guildId/manage" element={
                    <AuthProtect>
                      <GuildManagePage />
                    </AuthProtect>
                  } />
                  <Route path="/guild/:guildId/event/create" element={
                    <AuthProtect>
                      <CreateEventPage />
                    </AuthProtect>
                  } />
                  <Route path="/event/:eventId" element={
                    <AuthProtect>
                      <EventDetailsPage />
                    </AuthProtect>
                  } />
                  <Route path="/event/:eventId/edit" element={
                    <AuthProtect>
                      <EditEventPage />
                    </AuthProtect>
                  } />
                  <Route path="/characters" element={
                    <AuthProtect>
                      <CharactersPage />
                    </AuthProtect>
                  } />
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
