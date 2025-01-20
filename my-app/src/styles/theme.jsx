/**
 * Theme Configuration Module
 * 
 * Defines the global Material-UI theme for the application.
 * Includes customization for colors, typography, and component styles.
 * 
 * Features:
 * - Custom brand color palette
 * - Typography system using Lato font family
 * - Component style overrides
 * - Consistent spacing and border radius
 */

import { createTheme } from '@mui/material/styles';

/**
 * Custom theme configuration
 * Extends Material-UI's default theme with application-specific styles
 */
const theme = createTheme({
  // Color Palette Configuration
  palette: {
    primary: {
      main: '#461147', // Purple brand color - Used for primary actions and branding
    },
    secondary: {
      main: '#FF6B2C', // Orange accent color - Used for secondary actions and highlights
    },
    background: {
      default: '#FFFFFF', // Default page background
      paper: '#FFFFFF', // Surface/card background
    },
  },

  // Typography Configuration
  typography: {
    // Global font family setting
    fontFamily: '"Lato", sans-serif',

    // Heading Styles
    h1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 900, // Extra bold for main headlines
    },
    h2: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 900,
    },
    h3: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 900,
    },
    h4: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700, // Bold for sub-headlines
    },
    h5: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },

    // UI Text Styles
    subtitle1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700, // Bold for important UI text
    },
    subtitle2: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400, // Regular for body text
    },
    body2: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
      textTransform: 'none', // Prevents automatic uppercase transformation
    },
    caption: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400,
    },
    overline: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400,
    },
  },

  // Component Style Overrides
  components: {
    // Button customization
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Consistent border radius
          padding: '8px 16px', // Comfortable click target
        },
      },
    },
    // TextField customization
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8, // Matches button border radius
          },
        },
      },
    },
  },
});

export default theme;
