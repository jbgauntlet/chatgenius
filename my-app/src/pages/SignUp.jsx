import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        navigate('/user');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign-up error:', err);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, mt: 8 }}>
        <Box textAlign="center" mb={2}>
          <Typography variant="h4" component="h1" gutterBottom>
            Sign Up
          </Typography>
        </Box>
        <Box component="form" noValidate autoComplete="off">
          <TextField
            fullWidth
            margin="normal"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <Box textAlign="center" mt={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSignUp}
            >
              Sign Up
            </Button>
          </Box>
        </Box>
        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link href="/" underline="hover">
              Log in here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default SignUp;