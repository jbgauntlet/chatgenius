// src/styles/theme.jsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#461147', // Purple brand color
    },
    secondary: {
      main: '#FF6B2C', // Orange accent color
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Lato", sans-serif',
    h1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 900,
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
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    subtitle1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    subtitle2: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Lato", sans-serif',
      fontWeight: 700,
      textTransform: 'none',
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
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme;
