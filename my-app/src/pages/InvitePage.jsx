import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { supabase } from '../supabaseClient';

export default function InvitePage() {
  const { id: inviteId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchInviteDetails();
  }, []);

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      setError('Please log in to accept the invite.');
      setLoading(false);
      return;
    }
    
    if (user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        setCurrentUser(userData);
      }
    }
  };

  const fetchInviteDetails = async () => {
    try {
      // Fetch the invite details
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select(`
          id,
          workspace_id,
          expires_at,
          active,
          used_at,
          workspaces (
            id,
            name,
            description
          )
        `)
        .eq('id', inviteId)
        .single();

      if (inviteError) throw inviteError;

      if (!invite) {
        setError('This invite link is invalid.');
        setLoading(false);
        return;
      }

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        setError('This invite link has expired.');
        setLoading(false);
        return;
      }

      // Check if invite is still active
      if (!invite.active) {
        setError('This invite link has been revoked.');
        setLoading(false);
        return;
      }

      // Check if invite has already been used
      if (invite.used_at) {
        setError('This invite link has already been used.');
        setLoading(false);
        return;
      }

      setInvite(invite);
      setWorkspace(invite.workspaces);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invite:', error);
      setError('Error loading invite details.');
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('user_id', currentUser.id)
        .single();

      if (existingMembership) {
        setError('You are already a member of this workspace.');
        setLoading(false);
        return;
      }

      // Start a transaction by using RPC
      const { data, error } = await supabase.rpc('accept_workspace_invite', {
        p_invite_id: inviteId,
        p_user_id: currentUser.id
      });

      if (error) throw error;

      // Redirect to the workspace
      navigate('/user');
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError('Failed to accept the invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        {error ? (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/')}
            >
              Go to Login
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom>
              Join {workspace.name}
            </Typography>
            {workspace.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {workspace.description}
              </Typography>
            )}
            <Button
              variant="contained"
              fullWidth
              onClick={handleAcceptInvite}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Workspace'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 