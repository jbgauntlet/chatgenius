import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { supabase } from '../supabaseClient';

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
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Update the user's display name in the users table
        const { error: profileError } = await supabase
          .from('users')
          .update({ name: formState.displayName })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // Show success message
        alert('Please check your email for confirmation link before logging in.');
        navigate('/');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Create Account
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          Join workspaces and connect with others
        </Typography>

        <form onSubmit={handleSignUp}>
          <Stack spacing={3}>
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <TextField
              label="Display Name"
              name="displayName"
              value={formState.displayName}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              value={formState.password}
              onChange={handleChange}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>

            <Button
              variant="text"
              onClick={() => navigate('/')}
              fullWidth
            >
              Already have an account? Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}