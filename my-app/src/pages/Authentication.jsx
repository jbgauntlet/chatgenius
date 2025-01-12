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

export default function Authentication() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Successful login will trigger the auth state change in App.jsx
      // which will redirect to /join
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Welcome Back
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          Sign in to join workspaces and connect with others
        </Typography>

        <form onSubmit={handleLogin}>
          <Stack spacing={3}>
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Button
              variant="text"
              onClick={() => navigate('/signup')}
              fullWidth
            >
              Don't have an account? Sign up
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}