import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Popper,
  Paper,
  ClickAwayListener,
  Typography,
} from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../supabaseClient';

export default function MessageReactions({ messageId, initialReactions = [] }) {
  const [reactions, setReactions] = useState(initialReactions);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial reactions
    fetchReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`message-reactions-${messageId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}`
      }, () => {
        fetchReactions();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}`
      }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_message_reactions', {
        message_id_param: messageId
      });

      if (error) {
        console.error('Error fetching reactions:', error);
      } else {
        // Parse the JSONB users array into a proper format
        const formattedData = data?.map(reaction => ({
          ...reaction,
          users: reaction.users || []
        })) || [];
        setReactions(formattedData);
      }
    } catch (error) {
      console.error('Error in fetchReactions:', error);
    }
  };

  const handleEmojiClick = async (emojiData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.rpc('toggle_message_reaction', {
        message_id_param: messageId,
        user_id_param: user.id,
        emoji_param: emojiData.emoji
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
      setAnchorEl(null);
    }
  };

  const handleReactionClick = async (emoji) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.rpc('toggle_message_reaction', {
        message_id_param: messageId,
        user_id_param: user.id,
        emoji_param: emoji
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReactionClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const formatTooltipText = (users) => {
    if (!users || users.length === 0) return 'No reactions';
    if (users.length === 1) return users[0].name;
    if (users.length === 2) return `${users[0].name} and ${users[1].name}`;
    return `${users[0].name}, ${users[1].name} and ${users.length - 2} more`;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
      {reactions?.map(({ emoji, count, users }) => (
        <Tooltip
          key={emoji}
          title={formatTooltipText(users)}
          arrow
          placement="top"
        >
          <Box
            onClick={() => handleReactionClick(emoji)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'grey.100',
              borderRadius: 3,
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'grey.200',
              },
            }}
          >
            <Typography>{emoji}</Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary' }}
            >
              {count}
            </Typography>
          </Box>
        </Tooltip>
      ))}
      
      <IconButton
        size="small"
        onClick={handleAddReactionClick}
        sx={{ 
          color: 'grey.500',
          '&:hover': {
            color: 'grey.700',
            bgcolor: 'grey.100',
          },
        }}
      >
        <AddReactionOutlinedIcon fontSize="small" />
      </IconButton>

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="top-start"
        sx={{ zIndex: 1300 }}
      >
        <Paper sx={{ p: 1, bgcolor: 'grey.800' }}>
          <ClickAwayListener onClickAway={handleClose}>
            <Box>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme="dark"
                width={320}
                height={400}
              />
            </Box>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </Box>
  );
} 