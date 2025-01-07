import React from 'react';
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
  Divider,
  Container,
} from '@mui/material';

const channels = ['General', 'Development', 'Random'];

function UserPage() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
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
            {channels.map((channel, index) => (
              <ListItem button key={index}>
                <ListItemText primary={`# ${channel}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Slack Clone
            </Typography>
            <Button color="inherit">Logout</Button>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Container sx={{ mt: 4 }}>
          <Typography variant="h5"># General</Typography>
          <Typography color="textSecondary">
            Welcome to the General channel!
          </Typography>
          {/* Add a MessageInput and MessageList here */}
        </Container>
      </Box>
    </Box>
  );
}

export default UserPage;
