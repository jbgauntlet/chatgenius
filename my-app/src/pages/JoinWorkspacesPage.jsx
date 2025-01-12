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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../supabaseClient';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';

export default function JoinWorkspacesPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningWorkspace, setJoiningWorkspace] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPublicWorkspaces();
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

  const handleJoinWorkspace = async (workspaceId) => {
    setJoiningWorkspace(workspaceId);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if user is already a member
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('workspace_memberships')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        throw membershipCheckError;
      }

      if (existingMembership) {
        navigate('/user');
        return;
      }

      // Add user to workspace
      const { error: joinError } = await supabase
        .from('workspace_memberships')
        .insert([
          {
            workspace_id: workspaceId,
            user_id: user.id,
            role: 'member'
          }
        ]);

      if (joinError) throw joinError;

      // Navigate to the workspace
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

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workspace.description && workspace.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Join Public Workspaces
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Discover and join public workspaces to connect with others
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
          sx={{ mt: 2 }}
        >
          Create Workspace
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} key={workspace.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {workspace.name}
                  </Typography>
                  {workspace.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {workspace.description}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Created by {workspace.users.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workspace.workspace_memberships.length} members
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleJoinWorkspace(workspace.id)}
                    disabled={joiningWorkspace === workspace.id}
                  >
                    {joiningWorkspace === workspace.id ? (
                      <CircularProgress size={24} />
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
    </Container>
  );
} 