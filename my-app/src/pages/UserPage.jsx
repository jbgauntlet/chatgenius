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
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationsFilledIcon from '@mui/icons-material/Notifications';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import HomeFilledIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleFilledIcon from '@mui/icons-material/ChatBubble';

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
  const [workspaceChanges, setWorkspaceChanges] = useState({
    name: '',
    description: ''
  });
  const [isWorkspaceEdited, setIsWorkspaceEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [selectedHeroButton, setSelectedHeroButton] = useState('home');

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
    setIsSettingsOpen(!isSettingsOpen);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  // Reset changes when workspace changes or panel closes
  useEffect(() => {
    setWorkspaceChanges({
      name: currentWorkspace?.name || '',
      description: currentWorkspace?.description || ''
    });
    setIsWorkspaceEdited(false);
  }, [currentWorkspace, isSettingsOpen]);

  const handleWorkspaceChange = (field) => (e) => {
    const newValue = e.target.value;
    setWorkspaceChanges(prev => ({
      ...prev,
      [field]: newValue
    }));
    setIsWorkspaceEdited(true);
  };

  const handleSaveWorkspaceChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceChanges.name,
          description: workspaceChanges.description
        })
        .eq('id', currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCurrentWorkspace(data);
      setWorkspaces(prev => 
        prev.map(w => w.id === data.id ? data : w)
      );
      setIsWorkspaceEdited(false);
    } catch (error) {
      console.error('Error updating workspace:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchUserWorkspaceRole = async () => {
    if (!currentWorkspace || !currentUser) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
    } else {
      setCurrentUserRole(data.role);
    }
  };

  // Add effect to fetch role when workspace changes
  useEffect(() => {
    if (currentWorkspace && currentUser) {
      fetchUserWorkspaceRole();
    }
  }, [currentWorkspace, currentUser]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100%', 
      overflow: 'hidden',
      background: 'linear-gradient(to bottom right, #461147, #39083B)',
    }}>
      {/* Global Top Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'transparent',
          height: 40,
          minHeight: 40,
          '& .MuiToolbar-root': {
            minHeight: 40,
            height: 40,
            padding: '0 16px',
          },
        }}
      >
        <Toolbar 
          sx={{ 
            justifyContent: 'space-between', 
            gap: 2,
          }}
        >
          {/* Left section - reserved for future use */}
          <Box sx={{ width: 240, visibility: 'hidden' }} />

          {/* Center section - Search bar */}
          <Box
            sx={{
              flexGrow: 1,
              maxWidth: 600,
              mx: 'auto',
              position: 'relative',
              height: 28,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                cursor: 'not-allowed',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', color: '#FFFFFF' }}>
                <SearchIcon sx={{ mr: 1, fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: '#FFFFFF' }}>Search workspace...</Typography>
              </Box>
            </Box>
          </Box>

          {/* Right section - Settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <IconButton
              onClick={handleSettingsClick}
              disableRipple
              size="small"
              sx={{ 
                color: '#FFFFFF',
                '&:focus': {
                  outline: 'none',
                },
                p: 0.75,
              }}
            >
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
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
              backgroundColor: 'transparent',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', mb: 3 }}>
            {workspaces.length === 0 ? (
              // Show create workspace button if user has no workspaces
              <Tooltip title="Create Workspace" placement="right">
                <IconButton
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  disableRipple
                  sx={{ 
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    backgroundColor: 'grey.800',
                    color: 'grey.100',
                    '&:hover': {
                      backgroundColor: 'grey.700',
                      '& > svg': {
                        transform: 'scale(1.15)',
                      },
                    },
                    '& > svg': {
                      transition: 'transform 0.2s ease',
                    },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            ) : (
              // Show current workspace button with dropdown
              <>
                <IconButton
                  onClick={handleWorkspaceSwitcherClick}
                  disableRipple
                  sx={{ 
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    backgroundColor: 'primary.main',
                    color: 'grey.100',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                      '& > svg': {
                        transform: 'scale(1.15)',
                      },
                    },
                    '& > svg': {
                      transition: 'transform 0.2s ease',
                    },
                  }}
                >
                  {currentWorkspace?.name?.charAt(0).toUpperCase()}
                </IconButton>
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
          </Box>

          {/* Activity section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 1.75 }}>
            {/* Home button */}
            <Box 
              onClick={() => setSelectedHeroButton('home')}
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiIconButton-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '& .MuiTypography-root': {
                    color: '#fff',
                  },
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              <IconButton
                disableRipple
                sx={{ 
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  backgroundColor: selectedHeroButton === 'home' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& > svg': {
                      transform: 'scale(1.15)',
                    },
                  },
                  '&:focus': {
                    outline: 'none',
                  },
                  '& > svg': {
                    transition: 'transform 0.2s ease',
                    fontSize: 20,
                  },
                }}
              >
                {selectedHeroButton === 'home' ? <HomeFilledIcon /> : <HomeIcon />}
              </IconButton>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#fff',
                  fontSize: '0.6875rem', 
                  mt: 0.75,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  userSelect: 'none',
                  lineHeight: '12px',
                }}
              >
                Home
              </Typography>
            </Box>

            {/* DMs button */}
            <Box 
              onClick={() => setSelectedHeroButton('dms')}
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiIconButton-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '& .MuiTypography-root': {
                    color: '#fff',
                  },
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              <IconButton
                disableRipple
                sx={{ 
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  backgroundColor: selectedHeroButton === 'dms' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& > svg': {
                      transform: 'scale(1.15)',
                    },
                  },
                  '&:focus': {
                    outline: 'none',
                  },
                  '& > svg': {
                    transition: 'transform 0.2s ease',
                    fontSize: 20,
                  },
                }}
              >
                {selectedHeroButton === 'dms' ? <ChatBubbleFilledIcon /> : <ChatBubbleIcon />}
              </IconButton>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#fff',
                  fontSize: '0.6875rem', 
                  mt: 0.75,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  userSelect: 'none',
                  lineHeight: '12px',
                }}
              >
                DMs
              </Typography>
            </Box>

            {/* Activity button */}
            <Box 
              onClick={() => setSelectedHeroButton('activity')}
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiIconButton-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '& .MuiTypography-root': {
                    color: '#fff',
                  },
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              <IconButton
                disableRipple
                sx={{ 
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  backgroundColor: selectedHeroButton === 'activity' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& > svg': {
                      transform: 'scale(1.15)',
                    },
                  },
                  '&:focus': {
                    outline: 'none',
                  },
                  '& > svg': {
                    transition: 'transform 0.2s ease',
                    fontSize: 20,
                  },
                }}
              >
                {selectedHeroButton === 'activity' ? <NotificationsFilledIcon /> : <NotificationsIcon />}
              </IconButton>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#fff',
                  fontSize: '0.6875rem', 
                  mt: 0.75,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  userSelect: 'none',
                  lineHeight: '12px',
                }}
              >
                Activity
              </Typography>
            </Box>

            {/* More button */}
            <Box 
              onClick={() => setSelectedHeroButton('more')}
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiIconButton-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '& .MuiTypography-root': {
                    color: '#fff',
                  },
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              <IconButton
                disableRipple
                sx={{ 
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  backgroundColor: selectedHeroButton === 'more' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& > svg': {
                      transform: 'scale(1.15)',
                    },
                  },
                  '&:focus': {
                    outline: 'none',
                  },
                  '& > svg': {
                    transition: 'transform 0.2s ease',
                    fontSize: 20,
                  },
                }}
              >
                <MoreHorizIcon />
              </IconButton>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#fff',
                  fontSize: '0.6875rem', 
                  mt: 0.75,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  userSelect: 'none',
                  lineHeight: '12px',
                }}
              >
                More
              </Typography>
            </Box>
          </Box>

          {/* Bottom section with logout button */}
          <Box sx={{ mt: 'auto' }}>
            <Tooltip title="Logout" placement="right">
              <IconButton
                onClick={handleLogout}
                disableRipple
                sx={{ 
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  backgroundColor: 'error.dark',
                  color: 'error.contrastText',
                  '&:hover': {
                    backgroundColor: 'error.main',
                    '& > svg': {
                      transform: 'scale(1.15)',
                    },
                  },
                  '& > svg': {
                    transition: 'transform 0.2s ease',
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
              {/* General Settings Section */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'grey.700',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    mb: 2,
                  }}
                >
                  General Settings
                </Typography>

                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: currentUserRole === 'owner' ? 'grey.700' : 'grey.500' }}
                    >
                      Workspace Name
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={workspaceChanges.name}
                      onChange={handleWorkspaceChange('name')}
                      disabled={currentUserRole !== 'owner'}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: currentUserRole === 'owner' ? 'grey.100' : 'grey.50',
                          color: currentUserRole === 'owner' ? 'grey.900' : 'grey.600',
                          '& fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'grey.300' : 'grey.200',
                          },
                          '&:hover fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'grey.400' : 'grey.200',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'primary.main' : 'grey.200',
                          },
                          '&.Mui-disabled': {
                            backgroundColor: 'grey.50',
                            color: 'grey.600',
                            '& fieldset': {
                              borderColor: 'grey.200',
                            },
                          },
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: currentUserRole === 'owner' ? 'grey.700' : 'grey.500' }}
                    >
                      Description
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={3}
                      placeholder={currentUserRole === 'owner' ? "Add a description for your workspace" : "No description provided"}
                      value={workspaceChanges.description}
                      onChange={handleWorkspaceChange('description')}
                      disabled={currentUserRole !== 'owner'}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: currentUserRole === 'owner' ? 'grey.100' : 'grey.50',
                          color: currentUserRole === 'owner' ? 'grey.900' : 'grey.600',
                          '& fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'grey.300' : 'grey.200',
                          },
                          '&:hover fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'grey.400' : 'grey.200',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: currentUserRole === 'owner' ? 'primary.main' : 'grey.200',
                          },
                          '&.Mui-disabled': {
                            backgroundColor: 'grey.50',
                            color: 'grey.600',
                            '& fieldset': {
                              borderColor: 'grey.200',
                            },
                          },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: 'grey.500',
                          opacity: 1,
                        },
                      }}
                    />
                    {currentUserRole === 'owner' && (
                      <Typography
                        variant="caption"
                        sx={{ mt: 0.5, display: 'block', color: 'grey.600' }}
                      >
                        Let people know what this workspace is about.
                      </Typography>
                    )}
                  </Box>

                  {/* Save Button and Error Message */}
                  {currentUserRole === 'owner' && (isWorkspaceEdited || saveError) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, mt: 2 }}>
                      {saveError && (
                        <Typography color="error" variant="caption">
                          {saveError}
                        </Typography>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleSaveWorkspaceChanges}
                        disabled={isSaving}
                        sx={{ minWidth: 100 }}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider sx={{ my: 4, borderColor: 'grey.200' }} />

              {/* Placeholder for other sections */}
              <Typography color="grey.600" align="center">
                More settings coming soon...
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
