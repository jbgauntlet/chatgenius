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
  Avatar,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Messaging from '../components/Messaging';

function UserPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchChannels();
  }, []);

  const fetchUserData = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Error fetching auth user:', authError);
      navigate('/');
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return;
    }

    setCurrentUser({ ...user, ...userData });
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

  // Get the first letter of the user's name for the avatar
  const getAvatarLetter = () => {
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?';
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
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                {getAvatarLetter()}
              </Avatar>
              <ListItemText 
                primary={currentUser?.name || 'Loading...'}
                secondary="Online"
              />
            </ListItem>
            <Divider />
            {channels.map((channel, index) => (
              <ListItem
                button
                key={index}
                onClick={() => setSelectedChannel(channel)}
              >
                <ListItemText primary={`# ${channel.name}`} />
              </ListItem>
            ))}
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
