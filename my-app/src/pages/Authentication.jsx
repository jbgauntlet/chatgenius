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

function Authentication() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Hook for navigation

  const handleLogin = () => {
    console.log('Logging in with', { email, password });
    // Here you would typically call your authentication API.
    // For now, we'll redirect to the user page regardless of input.
    navigate('/user'); // Redirect to UserPage on successful login
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, mt: 8 }}>
        <Box textAlign="center" mb={2}>
          <Typography variant="h4" component="h1" gutterBottom>
            Slack Clone Login
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
          <Box textAlign="center" mt={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleLogin}
            >
              Login
            </Button>
          </Box>
        </Box>
        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Don’t have an account?{' '}
            <Link href="/signup" underline="hover">
              Sign up here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Authentication;
