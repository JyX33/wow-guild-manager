import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';

const queryClient = new QueryClient();

const GuildPage = () => <div>Guild Page Coming Soon</div>;
const EventDetailsPage = () => <div>Event Details Page Coming Soon</div>;
const CreateEventPage = () => <div>Create Event Page Coming Soon</div>;
const EditEventPage = () => <div>Edit Event Page Coming Soon</div>;

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/guild/:guildId" 
              element={
                <ProtectedRoute>
                  <GuildPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/guild/:guildId/event/create" 
              element={
                <ProtectedRoute>
                  <CreateEventPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/event/:eventId" 
              element={
                <ProtectedRoute>
                  <EventDetailsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/event/:eventId/edit" 
              element={
                <ProtectedRoute>
                  <EditEventPage />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;