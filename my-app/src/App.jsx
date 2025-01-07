import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Authentication from './pages/Authentication';
import UserPage from './pages/UserPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Page */}
        <Route path="/" element={<Authentication />} />

        {/* User Page */}
        <Route path="/user" element={<UserPage />} />
      </Routes>
    </Router>
  );
}

export default App;
