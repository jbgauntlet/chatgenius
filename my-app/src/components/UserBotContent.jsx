import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '../supabaseClient';
import { typeText } from '../utils/textAnimation';
import { generateEmbedding } from '../utils/embeddings';

export default function UserBotContent({ user, currentUser, workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchRecentMessages();
  }, [user.id]);

  const fetchRecentMessages = async () => {
    try {
      // Fetch last 5 direct messages between the users
      const { data: recentMessages, error: messagesError } = await supabase
        .from('user_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${user.id}),and(sender_id.eq.${user.id},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messagesError) throw messagesError;

      return recentMessages.reverse();
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = newMessage.trim();
    setNewMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get recent messages for context
      const recentMessages = await fetchRecentMessages();

      // Generate embedding for the user's query
      const queryEmbedding = await generateEmbedding(userMessage);

      // Get vector search results from both functions
      console.log("user.id:", user.id);
      console.log("currentUser.id:", currentUser.id);
      const [userBotResults, generalResults] = await Promise.all([
        supabase.rpc('user_bot_vector_search', {
          query_vector: queryEmbedding,
          user_id_param: currentUser.id,
          workspace_id_param: workspaceId,
          bot_id_param: user.id,
          limit_param: 5   
        }),
        supabase.rpc('general_bot_vector_search', {
          query_vector: queryEmbedding,
          user_id_param: currentUser.id,
          workspace_id_param: workspaceId,
          bot_id_param: user.id,
          limit_param: 5
        })
      ]);

      if (userBotResults.error) throw userBotResults.error;
      if (generalResults.error) throw generalResults.error;

      // Combine and format context for the AI
      const formattedContext = {
        currentChat: messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n'),
        recentDirectMessages: recentMessages.map(m => 
          `${m.sender_id === user.id ? user.name : 'User'}: ${m.content}`
        ).join('\n'),
        relevantUserBotMessages: userBotResults.data?.map(m => 
          `Previous relevant message: ${m.content}`
        ).join('\n'),
        relevantGeneralMessages: generalResults.data?.map(m => 
          `Related message: ${m.content}`
        ).join('\n')
      };

      const systemMessage = `You are ${user.name}'s AI bot. You are currently talking to ${currentUser.name}. 

IMPORTANT INSTRUCTIONS:
1. For understanding HOW to say it: Only mimic the writing style, tone, grammar, punctutation, capitalization,and personality from messages where ${user.name} is the sender.
2. Your goal is to be helpful while maintaining ${user.name}'s unique communication style.
3. Use the mesage below only as context or a guide. Don respond word for word with one of the messages below.
4. If the message below is not relevant, respond as best as you can.
5. Always use the writing style, tone, grammar, punctutation, capitalization,and personality of ${user.name} when responding.
Current conversation:
${formattedContext.currentChat}

Recent direct messages between ${user.name} and ${currentUser.name}:
${formattedContext.recentDirectMessages}

Previous relevant messages from ${user.name} (Use this style, capitalization, punctuation, etc.):
${formattedContext.relevantUserBotMessages}

Additional context (use for information only):
${formattedContext.relevantGeneralMessages}

To reiterate, always use the writing style, tone, grammar, punctutation, capitalization,and personality of ${user.name} when responding.`
;
console.log("user.name:", user.name);
      // Send the message to OpenAI with the context
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      const botMessage = result.choices[0].message.content;
      
      // Add the bot's response with a typing animation
      const messageElement = document.createElement('div');
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      await typeText(botMessage, messageElement);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: botMessage }
      ]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your message.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: '#F8F8F8',
    }}>
      {/* Messages area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Paper
              sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                color: message.role === 'user' ? 'white' : 'text.primary',
                borderRadius: 2,
              }}
            >
              <Typography>{message.content}</Typography>
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}>
        <Box sx={{ 
          display: 'flex',
          gap: 1,
        }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Message the bot..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
          <IconButton 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            color="primary"
          >
            {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
} 