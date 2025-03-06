import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Authentication from './pages/Authentication';
import UserPage from './pages/UserPage';
import SignUp from './pages/SignUp';
import InvitePage from './pages/InvitePage';
import JoinWorkspacesPage from './pages/JoinWorkspacesPage';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={user ? <Navigate to="/join" /> : <Authentication />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/join" /> : <SignUp />}
        />
        <Route path="/invite/:id" element={<InvitePage />} />

        {/* Protected routes */}
        <Route
          path="/join"
          element={user ? <JoinWorkspacesPage /> : <Navigate to="/" />}
        />
        <Route
          path="/user"
          element={user ? <UserPage /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
