import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Stack,
  Alert,
  CircularProgress,
  styled,
} from '@mui/material';
import { supabase } from '../supabaseClient';

// Custom styled components - matching Authentication page
const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    fontSize: '18px',
    color: 'rgb(29,28,29)',
    borderRadius: '12px',
    '& input::placeholder': {
      fontSize: '18px',
      color: 'rgba(29,28,29,0.7)',
      fontWeight: 400,
      opacity: 1,
    },
    '& fieldset': {
      borderColor: 'rgba(94, 93, 96, 0.45)',
      borderRadius: '12px',
    },
    '& .MuiOutlinedInput-input': {
      padding: '9px 12px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(94, 93, 96, 0.45)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(94, 93, 96, 0.45)',
    },
  },
});

const StyledButton = styled(Button)({
  fontSize: '18px',
  padding: '9px 12px',
  fontWeight: 700,
  width: '100%',
  height: '44px',
  borderRadius: '12px',
});

export default function SignUp() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formState.email,
        password: formState.password,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_HOST}/`,
          data: {
            name: formState.displayName,
          },
        }
      });

      if (authError) throw authError;

      alert('Please check your email for confirmation link before logging in.');
      navigate('/');
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      pt: '8vh',
      pb: 18,
    }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <Box 
          component="img"
          src="/ChatGenius-logo-text-full.png"
          alt="ChatGenius Logo"
          sx={{ 
            width: 'auto',
            height: '34px',
            mb: '4vh',
          }}
        />

        <Typography 
          variant="h1" 
          align="center" 
          gutterBottom
          sx={{ 
            fontSize: '48px',
            fontWeight: 800,
            color: 'rgb(29,28,29)',
            mb: 1.5,
            lineHeight: 1.2,
          }}
        >
          Sign up for ChatGenius
        </Typography>

        <Typography 
          align="center" 
          sx={{ 
            fontSize: '18px',
            fontWeight: 400,
            color: 'rgb(29,28,29)',
            mb: 4,
            whiteSpace: 'nowrap',
          }}
        >
          We suggest using the{' '}
          <Box component="span" sx={{ fontWeight: 600 }}>
            email address you use at work.
          </Box>
        </Typography>

        <form onSubmit={handleSignUp} style={{ width: '100%' }}>
          <Stack spacing={2.5} width="100%">
            {error && (
              <Alert severity="error" sx={{ fontSize: '14px' }}>
                {error}
              </Alert>
            )}

            <StyledTextField
              placeholder="Display name"
              name="displayName"
              value={formState.displayName}
              onChange={handleChange}
              required
              fullWidth
            />

            <StyledTextField
              placeholder="Email address"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleChange}
              required
              fullWidth
            />

            <StyledTextField
              placeholder="Password"
              name="password"
              type="password"
              value={formState.password}
              onChange={handleChange}
              required
              fullWidth
            />

            <StyledButton
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </StyledButton>
          </Stack>
        </form>

        <Box sx={{ 
          mt: 3, 
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          <Typography 
            component="span" 
            sx={{ 
              color: 'rgba(29,28,29,0.7)',
              fontSize: '14px',
            }}
          >
            Already have an account?
          </Typography>
          <Link
            component="button"
            onClick={() => navigate('/')}
            sx={{ 
              fontSize: '14px',
              textDecoration: 'none',
              fontWeight: 400,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Sign in instead
          </Link>
        </Box>
      </Box>
    </Container>
  );
}