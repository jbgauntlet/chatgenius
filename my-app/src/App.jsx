import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Authentication from './pages/Authentication';
import UserPage from './pages/UserPage';
import SignUp from './pages/SignUp';
import InvitePage from './pages/InvitePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Page */}
        <Route path="/" element={<Authentication />} />

        {/* Sign-Up Page */}
        <Route path="/signup" element={<SignUp />} />

        {/* User Page */}
        <Route path="/user" element={<UserPage />} />

        {/* Invite Page */}
        <Route path="/invite/:id" element={<InvitePage />} />
      </Routes>
    </Router>
  );
}

export default App;
