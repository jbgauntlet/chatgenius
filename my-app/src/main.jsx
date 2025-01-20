/**
 * Application Entry Point
 * 
 * Sets up the React application with Material-UI theming and global styles.
 * This is the main entry point that renders the root App component.
 * 
 * Features:
 * - Material-UI theme provider integration
 * - CSS baseline normalization
 * - Strict Mode for development
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './styles/theme';

// Create root and render application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
