/**
 * JoinWorkspacesPage Component
 * 
 * A page component that displays available workspaces and allows users to join them.
 * Features both public workspace discovery and private workspace access via invite codes.
 * 
 * Features:
 * - Public workspace discovery
 * - Private workspace access via invite codes
 * - Workspace creation
 * - Real-time search filtering
 * - Tabbed interface for public and joined workspaces
 * - Responsive grid layout
 * 
 * @component
 */

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

  // State Management
  const [workspaces, setWorkspaces] = useState([]); // Public workspaces
  const [myWorkspaces, setMyWorkspaces] = useState([]); // User's joined workspaces
  const [loading, setLoading] = useState(true); // Loading state for workspace data
  const [error, setError] = useState(null); // Error state for operations
  const [searchQuery, setSearchQuery] = useState(''); // Search filter text
  const [joiningWorkspace, setJoiningWorkspace] = useState(null); // Currently joining workspace
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Create workspace modal
  const [isJoinPrivateModalOpen, setIsJoinPrivateModalOpen] = useState(false); // Join private workspace modal
  const [joinCode, setJoinCode] = useState(''); // Private workspace invite code
  const [currentTab, setCurrentTab] = useState(0); // Active tab index

  /**
   * Checks user authentication on component mount
   * Redirects to login if not authenticated
   */
  useEffect(() => {
    checkAuth();
    fetchPublicWorkspaces();
    fetchMyWorkspaces();
  }, []);

  /**
   * Verifies user authentication status
   */
  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      navigate('/');
    }
  };

  /**
   * Fetches public workspaces with member counts and owner details
   */
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

  /**
   * Fetches workspaces that the current user is a member of
   */
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

  /**
   * Handles joining a workspace or navigating to an existing one
   * @param {Object} workspace - The workspace to join or navigate to
   */
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

  /**
   * Handles successful workspace creation
   * @param {Object} workspace - The newly created workspace
   */
  const handleWorkspaceCreated = (workspace) => {
    navigate('/user');
  };

  /**
   * Handles tab change between public and my workspaces
   * @param {Event} event - Tab change event
   * @param {number} newValue - New tab index
   */
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = (currentTab === 0 ? workspaces : myWorkspaces).filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workspace.description && workspace.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /**
   * Handles joining a workspace using an invite code
   */
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
      {/* Header Section */}
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

      {/* Search Bar */}
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

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Public Workspaces" />
          <Tab label="My Workspaces" />
        </Tabs>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Workspace Grid */}
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

      {/* Create Workspace Modal */}
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