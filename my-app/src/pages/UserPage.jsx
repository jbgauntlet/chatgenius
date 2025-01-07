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
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TagIcon from '@mui/icons-material/Tag';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Messaging from '../components/Messaging';

function UserPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [channelsOpen, setChannelsOpen] = useState(true);

  useEffect(() => {
    fetchUserData();
    fetchChannels();
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
    const { data, error } = await supabase
      .from('channels')
      .select('id, name');

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data);
      if (data.length > 0) {
        setSelectedChannel(data[0]);
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

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 280, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
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
                {channels.map((channel, index) => (
                  <ListItemButton
                    key={index}
                    onClick={() => setSelectedChannel(channel)}
                    selected={selectedChannel?.id === channel.id}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon>
                      <TagIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={channel.name} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </List>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar position="static" color="primary">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6">
              ChatGenius
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        {selectedChannel && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}>
              <Typography variant="h6"># {selectedChannel.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                Welcome to the {selectedChannel.name} channel!
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Messaging channelId={selectedChannel.id} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default UserPage;
