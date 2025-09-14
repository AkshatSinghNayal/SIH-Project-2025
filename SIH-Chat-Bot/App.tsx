
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import ChatView from './components/ChatView';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return user ? <ChatView /> : <Auth />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="h-screen w-screen font-sans">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;
