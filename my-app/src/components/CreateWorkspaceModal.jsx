/**
 * CreateWorkspaceModal Component
 * 
 * A modal dialog component for creating new workspaces.
 * Handles workspace creation with name, description, and visibility settings.
 * 
 * Features:
 * - Workspace name and description input
 * - Public/private visibility toggle
 * - Form validation
 * - Error handling
 * - Loading states
 * - Database integration with Supabase
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Controls modal visibility
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onWorkspaceCreated - Callback when workspace is successfully created
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { supabase } from '../supabaseClient';

export default function CreateWorkspaceModal({ open, onClose, onWorkspaceCreated }) {
  // State Management
  const [name, setName] = useState(''); // Workspace name
  const [description, setDescription] = useState(''); // Optional workspace description
  const [visibility, setVisibility] = useState('private'); // Workspace visibility setting
  const [loading, setLoading] = useState(false); // Loading state for form submission
  const [error, setError] = useState(null); // Error state for form validation

  /**
   * Handles form submission for workspace creation
   * Creates workspace and adds creator as owner
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert([
          {
            name,
            description: description || null,
            owner_id: user.id,
            is_public: visibility === 'public'
          }
        ])
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add the creator as an owner in workspace_memberships
      const { error: membershipError } = await supabase
        .from('workspace_memberships')
        .insert([
          {
            workspace_id: workspace.id,
            user_id: user.id,
            role: 'owner'
          }
        ]);

      if (membershipError) throw membershipError;

      onWorkspaceCreated(workspace);
      handleClose();
    } catch (error) {
      console.error('Error creating workspace:', error);
      setError('Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets form state and closes modal
   */
  const handleClose = () => {
    setName('');
    setDescription('');
    setVisibility('private');
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              autoFocus
              label="Workspace Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 3 }}
            />

            <FormControl component="fieldset">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Visibility
              </Typography>
              <RadioGroup
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <FormControlLabel
                  value="private"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">
                        Private
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Only invited members can join this workspace
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="public"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">
                        Public
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Anyone can find and join this workspace
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={!name.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 