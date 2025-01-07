import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  TextField,
  Stack,
  Typography,
  Container,
  Paper,
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
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Sign Up
        </Typography>
        <form onSubmit={handleSignUp}>
          <Stack spacing={3}>
            <FormControl fullWidth required>
              <FormLabel>Display Name</FormLabel>
              <TextField
                type="text"
                name="displayName"
                value={formState.displayName}
                onChange={handleChange}
                placeholder="Enter your display name"
                variant="outlined"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth required>
              <FormLabel>Email</FormLabel>
              <TextField
                type="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="Enter your email"
                variant="outlined"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth required>
              <FormLabel>Password</FormLabel>
              <TextField
                type="password"
                name="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Enter your password"
                variant="outlined"
                fullWidth
              />
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/')}
              fullWidth
            >
              Already have an account? Log in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}