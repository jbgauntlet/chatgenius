import React, { useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Avatar,
  Divider,
  Collapse,
  Modal,
  TextField,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Popper,
  Grow,
  ClickAwayListener,
  MenuList,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TagIcon from '@mui/icons-material/Tag';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Messaging from '../components/Messaging';
import DirectMessaging from '../components/DirectMessaging';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';

function UserPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaceSwitcherAnchor, setWorkspaceSwitcherAnchor] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchWorkspaces();
    fetchChannels();
    fetchUsers();
  }, []);

  const fetchUserData = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error fetching auth user:', authError);
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

  const fetchChannels = async () => {
    if (!currentWorkspace) return; // Don't fetch if no workspace is selected

    const { data, error } = await supabase
      .from('channels')
      .select('id, name')
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data);
      if (data.length > 0) {
        setSelectedChannel(data[0]);
      }
    }
  };

  // Add useEffect to refetch channels when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchChannels();
      setSelectedChannel(null); // Clear selected channel when switching workspaces
    } else {
      setChannels([]); // Clear channels if no workspace is selected
    }
  }, [currentWorkspace]);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .neq('id', user.id); // Don't include the current user

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
  };

  const fetchWorkspaces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select(`
        workspace:workspaces (
          id,
          name,
          owner_id
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching workspaces:', error);
    } else {
      const workspaceList = data.map(item => item.workspace);
      setWorkspaces(workspaceList);
      // If there's no current workspace but we have workspaces, set the first one
      if (!currentWorkspace && workspaceList.length > 0) {
        setCurrentWorkspace(workspaceList[0]);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleChannelsClick = () => {
    setChannelsOpen(!channelsOpen);
  };

  const handleDMsClick = () => {
    setDmsOpen(!dmsOpen);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedChannel(null); // Deselect channel when selecting a DM
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setSelectedUser(null); // Deselect DM when selecting a channel
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentWorkspace) return;

    const { data, error } = await supabase
      .from('channels')
      .insert([{ 
        name: newChannelName.trim(),
        workspace_id: currentWorkspace.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
    } else {
      setNewChannelName('');
      setIsCreateChannelOpen(false);
      // Set the newly created channel as selected
      setSelectedChannel(data);
      // Update the channels list
      setChannels(prev => [...prev, data]);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert([{ 
        name: newWorkspaceName.trim(),
        owner_id: user.id,
      }])
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError);
      return;
    }

    // Add the creator as an owner in workspace_memberships
    const { error: membershipError } = await supabase
      .from('workspace_memberships')
      .insert([{
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner'
      }]);

    if (membershipError) {
      console.error('Error creating workspace membership:', membershipError);
      return;
    }

    setNewWorkspaceName('');
    setIsCreateWorkspaceOpen(false);
    // Add the new workspace to the list and set it as current
    setWorkspaces(prev => [...prev, workspace]);
    setCurrentWorkspace(workspace);
  };

  const handleWorkspaceSwitcherClick = (event) => {
    setWorkspaceSwitcherAnchor(workspaceSwitcherAnchor ? null : event.currentTarget);
  };

  const handleWorkspaceSwitcherClose = () => {
    setWorkspaceSwitcherAnchor(null);
  };

  const handleWorkspaceSelect = (workspace) => {
    setCurrentWorkspace(workspace);
    handleWorkspaceSwitcherClose();
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Global Top Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'grey.900',
          borderBottom: 1,
          borderColor: 'grey.800',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          {/* Left section - reserved for future use */}
          <Box sx={{ width: 240, visibility: 'hidden' }} />

          {/* Center section - Search bar */}
          <Box
            sx={{
              flexGrow: 1,
              maxWidth: 600,
              mx: 'auto',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: 40,
                backgroundColor: 'grey.800',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                px: 2,
                opacity: 0.7,
                cursor: 'not-allowed',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'grey.400' }}>
                <SearchIcon sx={{ mr: 1 }} />
                <Typography>Search workspace...</Typography>
              </Box>
            </Box>
          </Box>

          {/* Right section - Settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <Tooltip title="Workspace Settings">
              <IconButton
                onClick={handleSettingsClick}
                sx={{ color: 'grey.400' }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content container */}
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {/* Hero Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: 68,
            flexShrink: 0,
            height: '100%',
            '& .MuiDrawer-paper': { 
              position: 'relative',
              width: 68, 
              boxSizing: 'border-box',
              backgroundColor: 'grey.900',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 1,
              pb: 1,
              border: 'none',
              height: '100%',
            },
          }}
        >
          {/* Top section with workspace button */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {workspaces.length === 0 ? (
              // Show create workspace button if user has no workspaces
              <Tooltip title="Create Workspace" placement="right">
                <IconButton
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  sx={{ 
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: 'grey.800',
                    color: 'grey.100',
                    '&:hover': {
                      backgroundColor: 'grey.700',
                    },
                    mb: 1,
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            ) : (
              // Show current workspace button with dropdown
              <>
                <Tooltip title={currentWorkspace?.name || ''} placement="right">
                  <IconButton
                    onClick={handleWorkspaceSwitcherClick}
                    sx={{ 
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: 'primary.main',
                      color: 'grey.100',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      mb: 1,
                    }}
                  >
                    {currentWorkspace?.name?.charAt(0).toUpperCase()}
                  </IconButton>
                </Tooltip>
                <Popper
                  open={Boolean(workspaceSwitcherAnchor)}
                  anchorEl={workspaceSwitcherAnchor}
                  placement="right-start"
                  transition
                  sx={{ zIndex: (theme) => theme.zIndex.drawer + 3 }}
                >
                  {({ TransitionProps }) => (
                    <Grow {...TransitionProps}>
                      <Paper 
                        sx={{ 
                          width: 200,
                          maxHeight: 'calc(100vh - 100px)',
                          overflow: 'auto',
                          mt: 1,
                          ml: 1,
                          backgroundColor: 'grey.800',
                        }}
                      >
                        <ClickAwayListener onClickAway={handleWorkspaceSwitcherClose}>
                          <MenuList>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                px: 2,
                                py: 1,
                                fontWeight: 'bold',
                                color: 'grey.400',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                              }}
                            >
                              Workspaces
                            </Typography>
                            {workspaces.map((workspace) => (
                              <MenuItem
                                key={workspace.id}
                                onClick={() => handleWorkspaceSelect(workspace)}
                                sx={{ 
                                  color: 'grey.400',
                                  fontSize: '0.875rem',
                                  py: 0.75,
                                  '&:hover': {
                                    backgroundColor: 'grey.700',
                                  },
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                {workspace.name}
                                {workspace.id === currentWorkspace?.id && (
                                  <CheckIcon sx={{ ml: 1, fontSize: '1rem' }} />
                                )}
                              </MenuItem>
                            ))}
                            <MenuItem
                              onClick={() => {
                                handleWorkspaceSwitcherClose();
                                setIsCreateWorkspaceOpen(true);
                              }}
                              sx={{ 
                                color: 'grey.400',
                                fontSize: '0.875rem',
                                py: 0.75,
                                '&:hover': {
                                  backgroundColor: 'grey.700',
                                },
                                borderTop: 1,
                                borderColor: 'grey.700',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <ListItemIcon sx={{ color: 'grey.400', minWidth: 36 }}>
                                <AddIcon fontSize="small" />
                              </ListItemIcon>
                              Create Workspace
                            </MenuItem>
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
              </>
            )}
            <Divider sx={{ width: '80%', borderColor: 'grey.800', my: 1 }} />
          </Box>

          {/* Bottom section with logout button */}
          <Box sx={{ mt: 'auto' }}>
            <Tooltip title="Logout" placement="right">
              <IconButton
                onClick={handleLogout}
                sx={{ 
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: 'error.dark',
                  color: 'error.contrastText',
                  '&:hover': {
                    backgroundColor: 'error.main',
                  },
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Drawer>

        {/* Channel and DM Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            height: '100%',
            '& .MuiDrawer-paper': { 
              position: 'relative',
              width: 280, 
              boxSizing: 'border-box',
              borderLeft: 1,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <List>
              <ListItem>
                <Avatar 
                  alt={currentUser?.name || 'User'} 
                  src="/static/images/avatar/1.jpg"
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText 
                  primary={currentUser?.name || 'Loading...'} 
                  secondary="Online"
                  sx={{ ml: 2 }}
                />
              </ListItem>
              <Divider />
              
              <ListItemButton onClick={handleChannelsClick}>
                <ListItemText primary="Channels" />
                {channelsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              
              <Collapse in={channelsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {channels.map((channel) => (
                    <ListItemButton
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      selected={selectedChannel?.id === channel.id}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>
                        <TagIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={channel.name} />
                    </ListItemButton>
                  ))}
                  <ListItemButton
                    onClick={() => setIsCreateChannelOpen(true)}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon>
                      <AddIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Add Channel" />
                  </ListItemButton>
                </List>
              </Collapse>

              <ListItemButton onClick={handleDMsClick}>
                <ListItemText primary="Direct Messages" />
                {dmsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={dmsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {users.map((user) => (
                    <ListItemButton
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      selected={selectedUser?.id === user.id}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>
                        <Avatar 
                          sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText primary={user.name} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </List>
          </Box>
        </Drawer>

        {/* Flex container for content and settings */}
        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1,
          minHeight: 0,
          position: 'relative',
        }}>
          {/* Main Content Area */}
          <Box sx={{ 
            width: isSettingsOpen ? 'calc(100% - 400px)' : '100%',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
          }}>
            {(selectedChannel || selectedUser) && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
              }}>
                {/* Header */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  flexShrink: 0,
                }}>
                  {selectedChannel ? (
                    <>
                      <Typography variant="h6"># {selectedChannel.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Welcome to the {selectedChannel.name} channel!
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h6">{selectedUser.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Direct message with {selectedUser.name}
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Messages Area */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
                  {selectedChannel ? (
                    <Messaging 
                      channelId={selectedChannel.id} 
                      channelName={selectedChannel.name}
                      workspaceId={currentWorkspace.id}
                    />
                  ) : (
                    <DirectMessaging 
                      recipientId={selectedUser.id}
                      recipientName={selectedUser.name}
                      workspaceId={currentWorkspace.id}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Settings Panel */}
          <Box
            sx={{
              width: 400,
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transform: isSettingsOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Settings Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Typography variant="h6">
                Workspace Settings
              </Typography>
              <IconButton onClick={handleSettingsClose} sx={{ color: 'grey.500' }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Settings Content */}
            <Box sx={{ 
              flexGrow: 1,
              overflow: 'auto',
              p: 3,
            }}>
              {/* Sections will be added here */}
              <Typography color="grey.500" align="center">
                Settings content coming soon...
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Modal
        open={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        aria-labelledby="create-channel-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, width: '90%' }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create a new channel
          </Typography>
          <Stack spacing={3}>
            <TextField
              autoFocus
              fullWidth
              placeholder="Enter channel name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateChannel();
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setIsCreateChannelOpen(false);
                  setNewChannelName('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
              >
                Create Channel
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>

      <Modal
        open={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        aria-labelledby="create-workspace-modal"
      >
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            p: 4,
            outline: 'none',
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Workspace
          </Typography>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Workspace Name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => setIsCreateWorkspaceOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
              >
                Create
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
}

export default UserPage;
