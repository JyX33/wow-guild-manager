import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
import GuildManagePage from './pages/GuildManagePage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import DiscordLinkPage from './pages/DiscordLinkPage';

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
                    
                      <Dashboard />
                    
                  } />
                  <Route path="/guild/:guildId" element={
                    
                      <GuildPage />
                    
                  } />
                  <Route path="/guild/:guildId/manage" element={
                    
                      <GuildManagePage />
                    
                  } />
                  <Route path="/guild/:guildId/event/create" element={
                    
                      <CreateEventPage />
                    
                  } />
                  <Route path="/event/:eventId" element={
                    
                      <EventDetailsPage />
                    
                  } />
                  <Route path="/event/:eventId/edit" element={
                    
                      <EditEventPage />
                    
                  } />
                  <Route path="/link-discord" element={<DiscordLinkPage />} />
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
