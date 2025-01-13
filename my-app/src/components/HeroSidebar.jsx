import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Tooltip,
  Popper,
  Paper,
  ClickAwayListener,
  MenuList,
  MenuItem,
  Grow,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import HomeFilledIcon from '@mui/icons-material/Home';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleFilledIcon from '@mui/icons-material/ChatBubble';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationsFilledIcon from '@mui/icons-material/Notifications';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../supabaseClient';
import { getAvatarColor } from '../utils/colors';
import { useNavigate } from 'react-router-dom';

function HeroSidebar({ 
  currentUser,
  workspaces,
  currentWorkspace,
  onCreateWorkspace,
  onWorkspaceSelect,
  onLogout
}) {
  const navigate = useNavigate();
  const [selectedHeroButton, setSelectedHeroButton] = useState('home');
  const [workspaceSwitcherAnchor, setWorkspaceSwitcherAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleWorkspaceSwitcherClick = (event) => {
    setWorkspaceSwitcherAnchor(workspaceSwitcherAnchor ? null : event.currentTarget);
  };

  const handleWorkspaceSwitcherClose = () => {
    setWorkspaceSwitcherAnchor(null);
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleWorkspaceSelect = (workspace) => {
    onWorkspaceSelect(workspace);
    handleWorkspaceSwitcherClose();
  };

  return (
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
          <Tooltip title="Create Workspace" placement="right">
            <IconButton
              onClick={onCreateWorkspace}
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
          <>
            <IconButton
              onClick={handleWorkspaceSwitcherClick}
              disableRipple
              sx={{ 
                width: 36,
                height: 36,
                borderRadius: 1.5,
                backgroundColor: getAvatarColor(currentWorkspace?.id || ''),
                color: 'grey.100',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: getAvatarColor(currentWorkspace?.id || ''),
                  opacity: 0.9,
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
                            navigate('/join');
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
                          <SearchIcon sx={{ mr: 1, fontSize: '1.25rem' }} />
                          Join a workspace
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleWorkspaceSwitcherClose();
                            onCreateWorkspace();
                          }}
                          sx={{ 
                            color: 'grey.400',
                            fontSize: '0.875rem',
                            py: 0.75,
                            '&:hover': {
                              backgroundColor: 'grey.700',
                            },
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <AddIcon sx={{ mr: 1, fontSize: '1.25rem' }} />
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
        {[
          { id: 'home', icon: selectedHeroButton === 'home' ? <HomeFilledIcon /> : <HomeIcon /> },
          { id: 'dms', icon: selectedHeroButton === 'dms' ? <ChatBubbleFilledIcon /> : <ChatBubbleIcon /> },
          { id: 'activity', icon: selectedHeroButton === 'activity' ? <NotificationsFilledIcon /> : <NotificationsIcon /> },
          { id: 'more', icon: <MoreHorizIcon /> }
        ].map((button) => (
          <Box 
            key={button.id}
            onClick={() => setSelectedHeroButton(button.id)}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                '& .MuiIconButton-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.26)',
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
                backgroundColor: selectedHeroButton === button.id ? 'rgba(255, 255, 255, 0.26)' : 'transparent',
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
              {button.icon}
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
              {button.id.charAt(0).toUpperCase() + button.id.slice(1)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Bottom section with user avatar */}
      <Box sx={{ mt: 'auto' }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleUserMenuClick}
            disableRipple
            sx={{ 
              width: 36,
              height: 36,
              borderRadius: 1.5,
              backgroundColor: getAvatarColor(currentUser?.id || ''),
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: getAvatarColor(currentUser?.id || ''),
                opacity: 0.9,
              },
            }}
          >
            {currentUser?.name?.charAt(0).toUpperCase()}
          </IconButton>
          <Box
            sx={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid rgba(249, 237, 255, 0.15)',
              backgroundColor: currentUser?.user_presence?.status === 'active' ? '#44b700' : '#B8B8B8',
              zIndex: 1
            }}
          />
        </Box>
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
                      onClick={async () => {
                        console.log('Current status:', currentUser?.user_presence?.status);
                        const newStatus = currentUser?.user_presence?.status === 'active' ? 'away' : 'active';
                        console.log('Setting status to:', newStatus);
                        
                        const { data, error } = await supabase.rpc('update_user_presence', {
                          status_param: newStatus,
                          user_id_param: currentUser.id
                        });
                        
                        if (error) {
                          console.error('Error updating status:', error);
                        } else {
                          console.log('Status updated successfully:', data);
                          handleUserMenuClose();
                        }
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
                      {currentUser?.user_presence?.status === 'away' ? 'Set yourself as active' : 'Set yourself as away'}
                    </MenuItem>

                    <MenuItem
                      onClick={async () => {
                        const newMessage = prompt('Set your status message:', currentUser?.user_presence?.status_message || '');
                        if (newMessage !== null) {
                          // For now, we can only update status, not the message
                          const { data, error } = await supabase.rpc('update_user_presence', {
                            status_param: currentUser?.user_presence?.status || 'active',
                            user_id_param: currentUser.id
                          });
                          
                          if (error) {
                            console.error('Error updating status:', error);
                          } else {
                            console.log('Status updated successfully:', data);
                            handleUserMenuClose();
                          }
                        }
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
                      {currentUser?.user_presence?.status_message ? 'Change status message' : 'Set a status message'}
                    </MenuItem>

                    <Divider sx={{ my: 1, borderColor: 'grey.700' }} />
                    
                    <MenuItem
                      onClick={() => {
                        handleUserMenuClose();
                        onLogout();
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
  );
}

export default HeroSidebar; 