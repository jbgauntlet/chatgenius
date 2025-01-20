/**
 * App Component
 * 
 * Root component of the application that handles routing and authentication state.
 * Implements protected routes and authentication flow using Supabase.
 * 
 * Features:
 * - Authentication state management
 * - Protected route handling
 * - Public/private route separation
 * - Real-time auth state updates
 * 
 * Routes:
 * Public:
 * - / : Authentication page (redirects to /join if authenticated)
 * - /signup : Sign up page (redirects to /join if authenticated)
 * - /invite/:id : Workspace invitation page
 * 
 * Protected:
 * - /join : Workspace selection/joining page
 * - /user : Main user interface
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Authentication from './pages/Authentication';
import UserPage from './pages/UserPage';
import SignUp from './pages/SignUp';
import InvitePage from './pages/InvitePage';
import JoinWorkspacesPage from './pages/JoinWorkspacesPage';
import { supabase } from './supabaseClient';

/**
 * Main component state:
 * - user: Current authenticated user object or null
 * - loading: Boolean tracking initial auth state loading
 */
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Sets up authentication state and listeners.
   * Handles:
   * 1. Initial auth state check
   * 2. Real-time auth state updates
   * 3. Subscription cleanup
   */
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

  // Show nothing while checking auth state
  if (loading) {
    return null;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes with authentication redirects */}
        <Route
          path="/"
          element={user ? <Navigate to="/join" /> : <Authentication />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/join" /> : <SignUp />}
        />
        <Route path="/invite/:id" element={<InvitePage />} />

        {/* Protected routes with authentication checks */}
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
