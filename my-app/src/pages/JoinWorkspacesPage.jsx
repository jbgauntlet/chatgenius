import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Modal,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import { supabase } from '../supabaseClient';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';

export default function JoinWorkspacesPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningWorkspace, setJoiningWorkspace] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinPrivateModalOpen, setIsJoinPrivateModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchPublicWorkspaces();
    fetchMyWorkspaces();
  }, []);

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      navigate('/');
    }
  };

  const fetchPublicWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          description,
          created_at,
          owner_id,
          users!workspaces_owner_id_fkey (
            name
          ),
          workspace_memberships (
            count
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkspaces(data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setError('Failed to load workspaces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyWorkspaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workspace_memberships')
        .select(`
          workspace:workspaces (
            id,
            name,
            description,
            created_at,
            owner_id,
            users!workspaces_owner_id_fkey (
              name
            ),
            workspace_memberships (
              count
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      setMyWorkspaces(data.map(item => item.workspace));
    } catch (error) {
      console.error('Error fetching my workspaces:', error);
    }
  };

  const handleJoinWorkspace = async (workspace) => {
    setJoiningWorkspace(workspace.id);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      if (currentTab === 1) {
        // For "My Workspaces" tab - set workspace and navigate
        localStorage.setItem('currentWorkspaceId', workspace.id);
        navigate('/user');
        return;
      }

      // Check if user is already a member
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .single();

      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        throw membershipCheckError;
      }

      if (existingMembership) {
        localStorage.setItem('currentWorkspaceId', workspace.id);
        navigate('/user');
        return;
      }

      // Add user to workspace
      const { error: joinError } = await supabase
        .from('workspace_memberships')
        .insert([
          {
            workspace_id: workspace.id,
            user_id: user.id,
            role: 'member'
          }
        ]);

      if (joinError) throw joinError;

      // Set workspace and navigate
      localStorage.setItem('currentWorkspaceId', workspace.id);
      navigate('/user');
    } catch (error) {
      console.error('Error joining workspace:', error);
      setError('Failed to join workspace. Please try again.');
    } finally {
      setJoiningWorkspace(null);
    }
  };

  const handleWorkspaceCreated = (workspace) => {
    navigate('/user');
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const filteredWorkspaces = (currentTab === 0 ? workspaces : myWorkspaces).filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workspace.description && workspace.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoinWithCode = async () => {
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First verify the invite code
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select('workspace_id, active, used_at, expires_at')
        .eq('id', joinCode)
        .single();

      if (inviteError) {
        throw new Error('Invalid invite code');
      }

      if (!invite.active || invite.used_at || new Date(invite.expires_at) < new Date()) {
        throw new Error('This invite code has expired or is no longer valid');
      }

      // Check if user is already a member
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', invite.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        throw membershipCheckError;
      }

      if (existingMembership) {
        localStorage.setItem('currentWorkspaceId', invite.workspace_id);
        navigate('/user');
        return;
      }

      // Add user to workspace
      const { error: joinError } = await supabase
        .from('workspace_memberships')
        .insert([
          {
            workspace_id: invite.workspace_id,
            user_id: user.id,
            role: 'member'
          }
        ]);

      if (joinError) throw joinError;

      // Mark invite as used
      await supabase
        .from('workspace_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', joinCode);

      // Set workspace and navigate
      localStorage.setItem('currentWorkspaceId', invite.workspace_id);
      navigate('/user');
    } catch (error) {
      console.error('Error joining workspace:', error);
      setError(error.message || 'Failed to join workspace. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Workspaces
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<KeyIcon />}
            onClick={() => setIsJoinPrivateModalOpen(true)}
          >
            Join Workspace With Code
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Workspace
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Public Workspaces" />
          <Tab label="My Workspaces" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} key={workspace.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(249, 237, 255, 0.15)',
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(249, 237, 255, 0.2)',
                }
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'rgb(29,28,29)' }}>
                    {workspace.name}
                  </Typography>
                  {workspace.description && (
                    <Typography variant="body2" sx={{ color: 'rgba(29,28,29,0.7)' }} paragraph>
                      {workspace.description}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ color: 'rgba(29,28,29,0.7)' }}>
                    Created by {workspace.users.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(29,28,29,0.7)' }}>
                    {workspace.workspace_memberships.length} members
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleJoinWorkspace(workspace)}
                    disabled={joiningWorkspace === workspace.id}
                  >
                    {joiningWorkspace === workspace.id ? (
                      <CircularProgress size={24} />
                    ) : currentTab === 1 ? (
                      'Open'
                    ) : (
                      'Join Workspace'
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {filteredWorkspaces.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No workspaces found matching your search.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <CreateWorkspaceModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {/* Join Private Workspace Modal */}
      <Dialog
        open={isJoinPrivateModalOpen}
        onClose={() => setIsJoinPrivateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Join Workspace</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the invite code to join a workspace.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Invite Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            error={Boolean(error)}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsJoinPrivateModalOpen(false)}>Cancel</Button>
          <Button onClick={handleJoinWithCode} variant="contained" disabled={!joinCode.trim()}>
            Join Workspace
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 