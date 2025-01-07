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
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Messaging from '../components/Messaging';

function UserPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    fetchChannels();
  }, []);

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

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem>
              <Avatar alt="User Name" src="/static/images/avatar/1.jpg" />
              <ListItemText primary="User Name" secondary="Online" />
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

      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              ChatGenius
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Container sx={{ mt: 4 }}>
          {selectedChannel && (
            <>
              <Typography variant="h5"># {selectedChannel.name}</Typography>
              <Typography color="textSecondary">
                Welcome to the {selectedChannel.name} channel!
              </Typography>
              <Messaging channelId={selectedChannel.id} />
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default UserPage;
