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

export default function UserMessageReactions({ messageId, initialReactions = [] }) {
  const [reactionMap, setReactionMap] = useState(() => {
    // Initialize map from initial reactions
    const map = {};
    initialReactions.forEach(({ emoji, users }) => {
      map[emoji] = users.map(user => ({
        userId: user.id,
        reactionId: user.reaction_id,
        name: user.name
      }));
    });
    return map;
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setCurrentUser(user);
      }
    });

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`user-message-reactions-${messageId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_message_reactions',
        filter: `message_id=eq.${messageId}`
      }, async (payload) => {
        console.log('subscription success - insert', payload);
        if (mounted) {
          // Fetch user details for the tooltip
          const { data: userData } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', payload.new.user_id)
            .single();

          // Update map with new reaction
          setReactionMap(prevMap => {
            const newMap = { ...prevMap };
            const { emoji, user_id: userId } = payload.new;
            
            // Initialize emoji array if it doesn't exist
            if (!newMap[emoji]) {
              newMap[emoji] = [];
            }
            
            // Check if this user's reaction already exists
            const existingReactionIndex = newMap[emoji].findIndex(r => r.userId === userId);
            if (existingReactionIndex === -1) {
              // Only add if reaction doesn't exist
              newMap[emoji].push({
                userId,
                reactionId: payload.new.id,
                name: userData.name
              });
            }
            
            return newMap;
          });
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_message_reactions'
      }, (payload) => {
        console.log('subscription success - delete', payload);
        if (mounted) {
          // Remove reaction from map using reactionId
          setReactionMap(prevMap => {
            const newMap = { ...prevMap };
            const deletedReactionId = payload.old.id;
            
            // Find and remove the reaction
            Object.keys(newMap).forEach(emoji => {
              newMap[emoji] = newMap[emoji].filter(r => r.reactionId !== deletedReactionId);
              // Remove emoji key if no reactions left
              if (newMap[emoji].length === 0) {
                delete newMap[emoji];
              }
            });
            
            return newMap;
          });
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const handleEmojiClick = async (emojiData) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.rpc('toggle_user_message_reaction', {
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

      const { error } = await supabase.rpc('toggle_user_message_reaction', {
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
      {Object.entries(reactionMap).map(([emoji, users]) => {
        const hasUserReacted = currentUser && users.some(r => r.userId === currentUser.id);
        return (
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
                backgroundColor: hasUserReacted ? '#F3E5F5' : '#F5F5F5',
                borderRadius: 3,
                px: 1,
                py: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: hasUserReacted ? '#E1BEE7' : '#E0E0E0',
                },
              }}
            >
              <Typography>{emoji}</Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary' }}
              >
                {users.length}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}

      <IconButton
        size="small"
        onClick={handleAddReactionClick}
        sx={{ 
          color: 'grey.500',
          '&:hover': {
            color: 'grey.700',
            backgroundColor: '#F5F5F5',
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