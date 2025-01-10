import React, { useEffect, useState, useRef } from 'react';
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
  ListItemAvatar,
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
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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
import SidePanel from '../components/SidePanel';
import HelpContent from '../components/HelpContent';
import RepliesContent from '../components/RepliesContent';
import SearchResults from '../components/SearchResults';
import SearchBar from '../components/SearchBar';

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedHeroButton, setSelectedHeroButton] = useState('home');
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState(null);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [workspaceChanges, setWorkspaceChanges] = useState({
    name: '',
    description: ''
  });
  const [isWorkspaceEdited, setIsWorkspaceEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [activeInvites, setActiveInvites] = useState([]);
  const [sidePanelState, setSidePanelState] = useState({
    type: null, // 'help' | 'replies' | null
    isOpen: false,
    data: null
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');

  useEffect(() => {
    fetchUserData();
    fetchWorkspaces();
    fetchChannels();
    fetchUsers();
  }, []);

  // Add effect to fetch role when workspace changes
  useEffect(() => {
    if (currentWorkspace && currentUser) {
      fetchUserWorkspaceRole();
    }
  }, [currentWorkspace, currentUser]);

  // Add effect to fetch workspace members when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceMembers();
    }
  }, [currentWorkspace]);

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

  const fetchWorkspaceMembers = async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select(`
        role,
        users (
          id,
          name
        )
      `)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching workspace members:', error);
    } else {
      console.log('Workspace members:', data);
      setWorkspaceMembers(data);
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

  const handleSidePanelClose = () => {
    setSidePanelState({
      type: null,
      isOpen: false,
      data: null
    });
  };

  const handleHelpClick = () => {
    setSidePanelState({
      type: 'help',
      isOpen: true,
      data: null
    });
  };

  const handleWorkspaceMenuClick = (event) => {
    setWorkspaceMenuAnchor(event.currentTarget);
  };

  const handleWorkspaceMenuClose = () => {
    setWorkspaceMenuAnchor(null);
  };

  const handleWorkspaceSettingsOpen = () => {
    setWorkspaceChanges({
      name: currentWorkspace?.name || '',
      description: currentWorkspace?.description || ''
    });
    setIsWorkspaceSettingsOpen(true);
    handleWorkspaceMenuClose();
  };

  const handleWorkspaceSettingsClose = () => {
    setIsWorkspaceSettingsOpen(false);
    setIsWorkspaceEdited(false);
    setSaveError(null);
  };

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
      handleWorkspaceSettingsClose();
    } catch (error) {
      console.error('Error updating workspace:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleRemoveMember = async (memberId) => {
    if (!currentWorkspace || currentUserRole !== 'owner') return;

    try {
      const { error } = await supabase
        .from('workspace_memberships')
        .delete()
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', memberId);

      if (error) throw error;

      // Update the local state to remove the member
      setWorkspaceMembers(prev => 
        prev.filter(member => member.users.id !== memberId)
      );
    } catch (error) {
      console.error('Error removing member:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleGenerateInviteLink = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert([{ 
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        }])
        .select()
        .single();

      if (error) throw error;

      // Create the invite link using the invite ID
      const inviteUrl = `${window.location.origin}/invite/${data.id}`;
      setInviteLink(inviteUrl);
      
      // Refresh the active invites list
      fetchActiveInvites();
    } catch (error) {
      console.error('Error generating invite link:', error);
    }
  };

  const fetchActiveInvites = async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('workspace_invites')
      .select(`
        id,
        created_at,
        expires_at,
        users:created_by (
          name
        )
      `)
      .eq('workspace_id', currentWorkspace.id)
      .eq('active', true)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
    } else {
      setActiveInvites(data);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('workspace_invites')
        .update({ active: false })
        .eq('id', inviteId);

      if (error) throw error;

      // Update local state to remove the revoked invite
      setActiveInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error revoking invite:', error);
    }
  };

  // Fetch active invites when the modal opens
  useEffect(() => {
    if (isInviteMembersOpen) {
      fetchActiveInvites();
    }
  }, [isInviteMembersOpen]);

  const handleThreadClick = (message) => {
    setSidePanelState({
      type: 'replies',
      isOpen: true,
      data: message
    });
  };

  const handleGlobalSearch = async (query) => {
    setShowSearchResults(true);
    setIsSearching(true);
    setCurrentSearchQuery(query);

    try {
      // Search in both messages and user_messages tables
      const [messagesResult, dmResult] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (
              name
            ),
            channel:channel_id (
              name
            )
          `)
          .eq('workspace_id', currentWorkspace.id)
          .ilike('content', `%${query}%`),
        
        supabase
          .from('user_messages')
          .select(`
            *,
            sender:sender_id (
              name
            ),
            recipient:recipient_id (
              name
            )
          `)
          .eq('workspace_id', currentWorkspace.id)
          .ilike('content', `%${query}%`)
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (dmResult.error) throw dmResult.error;

      // Combine and sort results by date
      const allResults = [...messagesResult.data, ...dmResult.data]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setSearchResults(allResults);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add search result click handler
  const handleSearchResultClick = async (message) => {
    const isDirectMessage = !message.channel_id;
    const isThreadReply = Boolean(message.parent_message_id);

    if (isDirectMessage) {
      // For DMs, set the recipient as selected user
      const recipient = message.sender_id === currentUser?.id ? 
        { id: message.recipient_id, name: message.recipient.name } :
        { id: message.sender_id, name: message.sender.name };
      setSelectedUser(recipient);
      setSelectedChannel(null);
    } else {
      // For channel messages, set the channel
      setSelectedChannel({ id: message.channel_id, name: message.channel.name });
      setSelectedUser(null);
    }

    // If it's a thread reply, open the thread panel
    if (isThreadReply) {
      // Fetch the parent message first
      const { data: parentMessage } = await supabase
        .from(isDirectMessage ? 'user_messages' : 'messages')
        .select(`
          *,
          sender:sender_id (
            name
          ),
          ${isDirectMessage ? `
            recipient:recipient_id (
              name
            )
          ` : `
            channel:channel_id (
              name
            )
          `}
        `)
        .eq('id', message.parent_message_id)
        .single();

      if (parentMessage) {
        setSidePanelState({
          type: 'replies',
          isOpen: true,
          data: parentMessage
        });
      }
    }

    // Clear search results
    setShowSearchResults(false);
  };

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
          height: '40px',
          minHeight: '40px',
          '& .MuiToolbar-root': {
            minHeight: '40px',
            height: '40px',
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
          <SearchBar
            users={users}
            channels={channels}
            onUserSelect={(user) => {
              handleUserSelect(user);
              setShowSearchResults(false);
            }}
            onChannelSelect={(channel) => {
              handleChannelSelect(channel);
              setShowSearchResults(false);
            }}
            onSearch={handleGlobalSearch}
          />

          {/* Right section - Help */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <IconButton
              onClick={handleHelpClick}
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
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content container */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        minHeight: 0,
      }}>
        {/* Hero Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
            width: '70px',
          flexShrink: 0,
            height: '100%',
            '& .MuiDrawer-paper': { 
              position: 'relative',
              width: '70px', 
              boxSizing: 'border-box',
              backgroundColor: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 1,
              pb: 3,
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
                          mt: 0.5,
                          ml: 0.5,
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

          {/* Bottom section with user avatar */}
          <Box sx={{ mt: 'auto' }}>
            <IconButton
              onClick={handleUserMenuClick}
              disableRipple
              sx={{ 
                width: 36,
                height: 36,
                borderRadius: 1.5,
                backgroundColor: '#FF6B2C',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#E55A1F',
                },
              }}
              >
                {currentUser?.name?.charAt(0).toUpperCase()}
            </IconButton>
            <Popper
              open={Boolean(userMenuAnchor)}
              anchorEl={userMenuAnchor}
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
                      mt: 0.5,
                      ml: 0.5,
                      backgroundColor: 'grey.800',
                    }}
                  >
                    <ClickAwayListener onClickAway={handleUserMenuClose}>
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
                          {currentUser?.name}
                        </Typography>
                        <MenuItem
                          onClick={() => {
                            handleUserMenuClose();
                            handleLogout();
                          }}
                          sx={{ 
                            color: 'grey.400',
                            fontSize: '0.875rem',
                            py: 0.75,
                            '&:hover': {
                              backgroundColor: 'grey.700',
                            },
                          }}
                        >
                          Sign out
                        </MenuItem>
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
          </Box>
        </Drawer>

        {/* Rounded container for channel sidebar, content area, and settings */}
        <Box sx={{ 
          display: 'flex',
          flexGrow: 1,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 2,
          overflow: 'hidden',
          mr: '4px',
          mb: '5px',
        }}>
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
                bgcolor: 'rgba(249, 237, 255, 0.15)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '& .MuiListItemText-primary': {
                  color: 'rgb(249, 237, 255)',
                  fontSize: '15px',
                },
                '& .MuiListItemText-secondary': {
                  color: 'rgba(249, 237, 255, 0.7)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgb(249, 237, 255)',
                },
                '& .MuiDivider-root': {
                  borderColor: 'rgba(249, 237, 255, 0.2)',
                },
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
                <ListItemButton onClick={handleWorkspaceMenuClick}>
              <ListItemText 
                    primary={currentWorkspace?.name || 'Select a workspace'} 
                    sx={{ 
                      ml: 2,
                      '& .MuiListItemText-primary': {
                        fontSize: '16px',
                        fontWeight: 500,
                      },
                    }}
                  />
                </ListItemButton>
                <Popper
                  open={Boolean(workspaceMenuAnchor)}
                  anchorEl={workspaceMenuAnchor}
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
                          mt: 0.5,
                          ml: 0.5,
                          backgroundColor: 'grey.800',
                        }}
                      >
                        <ClickAwayListener onClickAway={handleWorkspaceMenuClose}>
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
                              {currentWorkspace?.name}
                            </Typography>
                            {currentUserRole === 'owner' && (
                              <MenuItem
                                onClick={handleWorkspaceSettingsOpen}
                                sx={{ 
                                  color: 'grey.400',
                                  fontSize: '0.875rem',
                                  py: 0.75,
                                  '&:hover': {
                                    backgroundColor: 'grey.700',
                                  },
                                }}
                              >
                                Settings
                              </MenuItem>
                            )}
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
            <Divider />
            
                <ListItemButton 
                  onClick={handleChannelsClick}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '& .MuiListItemText-primary': {
                      fontSize: '15px',
                    },
                  }}
                >
                  <Box sx={{ mr: 1.5 }}>
              {channelsOpen ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                  <ListItemText primary="Channels" />
            </ListItemButton>
            
            <Collapse in={channelsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {channels.map((channel) => (
                  <ListItemButton
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    selected={selectedChannel?.id === channel.id}
                        sx={{ 
                          pl: 4,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgb(249, 237, 255)',
                            '& .MuiListItemText-primary': {
                              color: '#461147',
                            },
                            '& .MuiSvgIcon-root': {
                              color: '#461147',
                            },
                            '&:hover': {
                              backgroundColor: 'rgb(249, 237, 255)',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ color: 'rgb(249, 237, 255)', minWidth: 36 }}>
                      <TagIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={channel.name} />
                  </ListItemButton>
                ))}
                <ListItemButton
                  onClick={() => setIsCreateChannelOpen(true)}
                      sx={{ 
                        pl: 4,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'rgb(249, 237, 255)', minWidth: 36 }}>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Add Channel" />
                </ListItemButton>
              </List>
            </Collapse>

            <ListItemButton onClick={handleDMsClick}>
                  <Box sx={{ mr: 1.5 }}>
              {dmsOpen ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                  <ListItemText primary="Direct Messages" />
            </ListItemButton>

            <Collapse in={dmsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {users.map((user) => (
                  <ListItemButton
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    selected={selectedUser?.id === user.id}
                        sx={{ 
                          pl: 4,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgb(249, 237, 255)',
                            '& .MuiListItemText-primary': {
                              color: '#461147',
                            },
                            '&:hover': {
                              backgroundColor: 'rgb(249, 237, 255)',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
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

          {/* Content and Settings Container */}
          <Box sx={{ 
            display: 'flex', 
            flexGrow: 1,
            position: 'relative',
          }}>
            {/* Main Content Area */}
            <Box sx={{ 
              width: sidePanelState.isOpen ? 'calc(100% - 400px)' : '100%',
              transition: 'width 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              bgcolor: '#fff',
            }}>
              {showSearchResults ? (
                <SearchResults
                  query={currentSearchQuery}
                  results={searchResults}
                  loading={isSearching}
                  onMessageClick={handleSearchResultClick}
                />
              ) : (
                (selectedChannel || selectedUser) && (
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
                          onThreadClick={handleThreadClick}
                        />
                      ) : (
                        <DirectMessaging 
                          recipientId={selectedUser.id}
                          recipientName={selectedUser.name}
                          workspaceId={currentWorkspace.id}
                          onThreadClick={handleThreadClick}
                        />
                      )}
                    </Box>
                  </Box>
                )
              )}
            </Box>

            {/* Side Panel */}
            <SidePanel
              open={sidePanelState.isOpen}
              onClose={handleSidePanelClose}
              type={sidePanelState.type}
              title={
                sidePanelState.type === 'help' ? 'Help' :
                sidePanelState.type === 'replies' ? 'Thread' :
                ''
              }
            >
              {sidePanelState.type === 'help' && <HelpContent />}
              {sidePanelState.type === 'replies' && (
                <RepliesContent parentMessage={sidePanelState.data} />
              )}
            </SidePanel>
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

      {/* Workspace Settings Modal */}
      <Modal
        open={isWorkspaceSettingsOpen}
        onClose={handleWorkspaceSettingsClose}
        aria-labelledby="workspace-settings-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            width: 500,
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3,
          }}
        >
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Workspace Settings
            </Typography>
            <IconButton onClick={handleWorkspaceSettingsClose} sx={{ color: 'grey.500' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={3}>
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
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Workspace Name
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={workspaceChanges.name}
                    onChange={handleWorkspaceChange('name')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'grey.100',
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Add a description for your workspace"
                    value={workspaceChanges.description}
                    onChange={handleWorkspaceChange('description')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'grey.100',
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, display: 'block', color: 'grey.600' }}
                  >
                    Let people know what this workspace is about.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Members Section */}
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
                Members
              </Typography>

              <Stack spacing={2}>
                {/* Members List */}
                <List 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {workspaceMembers.map((member) => (
                    <ListItem
                      key={member.users.id}
                      secondaryAction={
                        currentUserRole === 'owner' && member.users.id !== currentUser?.id && (
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveMember(member.users.id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {member.users.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.users.name}
                        secondary={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Invite Members Button */}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={() => setIsInviteMembersOpen(true)}
                >
                  Invite Members
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Save Button and Error Message */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, mt: 2 }}>
              {saveError && (
                <Typography color="error" variant="caption">
                  {saveError}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={handleSaveWorkspaceChanges}
                disabled={!isWorkspaceEdited || isSaving}
                sx={{ minWidth: 100 }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>

      {/* Invite Members Modal */}
      <Modal
        open={isInviteMembersOpen}
        onClose={() => setIsInviteMembersOpen(false)}
        aria-labelledby="invite-members-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            width: 500,
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3,
          }}
        >
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invite Members
            </Typography>
            <IconButton onClick={() => setIsInviteMembersOpen(false)} sx={{ color: 'grey.500' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Generate an invite link to share with others
              </Typography>
              
              {inviteLink ? (
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  alignItems: 'center',
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={inviteLink}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      // TODO: Show a copy success message
                    }}
                  >
                    Copy
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleGenerateInviteLink}
                  startIcon={<AddIcon />}
                >
                  Generate Invite Link
                </Button>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Active Invites
              </Typography>
              {activeInvites.length > 0 ? (
                <List sx={{ bgcolor: 'grey.100', borderRadius: 1 }}>
                  {activeInvites.map((invite) => (
                    <ListItem
                      key={invite.id}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleRevokeInvite(invite.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              Created by {invite.users.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No active invites
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
}

export default UserPage;
