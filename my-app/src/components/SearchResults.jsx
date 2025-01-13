import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { getAvatarColor } from '../utils/colors';

export default function SearchResults({ 
  query, 
  results, 
  loading, 
  onMessageClick,
}) {
  const renderMessagePreview = (message) => {
    const isDirectMessage = !message.channel_id;
    const isThreadReply = Boolean(message.parent_message_id);

    return (
      <ListItem
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 1,
          p: 2,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'grey.50',
          },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        onClick={() => onMessageClick(message)}
      >
        {/* Context line */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            width: '100%',
          }}
        >
          {isDirectMessage ? (
            <>
              <Avatar 
                sx={{ 
                  width: 20, 
                  height: 20, 
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  bgcolor: getAvatarColor(message.recipient_id),
                  fontWeight: 700
                }}
              >
                {message.recipient?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2">
                Direct message with {message.recipient?.name}
              </Typography>
            </>
          ) : (
            <>
              <TagIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2">
                #{message.channel?.name}
              </Typography>
            </>
          )}
          {isThreadReply && (
            <Tooltip title="Reply in thread">
              <IconButton size="small" sx={{ ml: 'auto' }}>
                <ChatBubbleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Message content */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Avatar 
            sx={{ 
              width: 28, 
              height: 28, 
              fontSize: '0.875rem',
              borderRadius: 1.2,
              bgcolor: getAvatarColor(message.sender_id),
              fontWeight: 700
            }}
          >
            {message.sender?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {message.sender?.name}
                <Typography variant="caption" color="text.secondary" sx={{ pt: '2px' }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Typography>
              </Typography>
            </Box>
            <Typography
              variant="body2"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
            {message.attachments?.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Search Results for "{query}"
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Results List */}
      {results.length > 0 ? (
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
          {results.map(renderMessagePreview)}
        </List>
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No messages found matching your search.
          </Typography>
        </Box>
      )}
    </Box>
  );
} 