import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { supabase } from '../supabaseClient';

export default function RepliesContent({ parentMessage }) {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (parentMessage) {
      fetchReplies();
    }
  }, [parentMessage]);

  const fetchReplies = async () => {
    if (!parentMessage) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          users:sender_id (
            name
          )
        `)
        .eq('parent_message_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !parentMessage) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          content: newReply,
          sender_id: user.id,
          parent_message_id: parentMessage.id,
          channel_id: parentMessage.channel_id,
          workspace_id: parentMessage.workspace_id,
        }])
        .select(`
          *,
          users:sender_id (
            name
          )
        `)
        .single();

      if (error) throw error;

      setReplies(prev => [...prev, data]);
      setNewReply('');
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  if (!parentMessage) {
    return (
      <Typography color="grey.600">
        Select a message to view replies
      </Typography>
    );
  }

  return (
    <Box>
      {/* Original Message */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="grey.600" sx={{ mb: 1 }}>
          Original Message
        </Typography>
        <Box
          sx={{
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
              {parentMessage.users?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="subtitle2">
              {parentMessage.users?.name}
            </Typography>
            <Typography variant="caption" color="grey.600" sx={{ ml: 1 }}>
              {new Date(parentMessage.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Typography>
          </Box>
          <Typography
            dangerouslySetInnerHTML={{ __html: parentMessage.content }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Replies Section */}
      <Box>
        <Typography variant="subtitle2" color="grey.600" sx={{ mb: 2 }}>
          Replies
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : replies.length > 0 ? (
          <Box sx={{ mb: 3 }}>
            {replies.map((reply) => (
              <Box
                key={reply.id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                  {reply.users?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2">
                      {reply.users?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(reply.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Typography
                    dangerouslySetInnerHTML={{ __html: reply.content }}
                    sx={{ wordBreak: 'break-word' }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="grey.600" sx={{ mb: 3 }}>
            No replies yet
          </Typography>
        )}

        {/* Reply Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Reply to thread..."
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendReply}
            disabled={!newReply.trim() || sending}
          >
            {sending ? 'Sending...' : 'Reply'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
} 