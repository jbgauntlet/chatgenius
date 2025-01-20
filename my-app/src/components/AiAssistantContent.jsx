/**
 * AiAssistantContent Component
 * 
 * A chat interface component for interacting with an AI assistant.
 * Provides a message history view and input area for user queries.
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.queryAiAssistant - Function to process user queries and get AI responses
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function AiAssistantContent({ queryAiAssistant }) {
  // State Management
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI assistant. How can I help you?' }
  ]); // Chat message history
  const [input, setInput] = useState(''); // User input text
  const [isLoading, setIsLoading] = useState(false); // Loading state for AI responses
  const messagesEndRef = useRef(null); // Reference for auto-scrolling

  /**
   * Auto-scrolls to the bottom of the message list when new messages are added
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handles form submission and processes user queries
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await queryAiAssistant(userMessage);
      if (!response) {
        throw new Error('No response from assistant');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error querying AI assistant:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: error.message === 'No workspace selected' 
          ? 'Please select a workspace first to use the AI assistant.'
          : 'Sorry, I encountered an error. Please try again.' 
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
      {/* Messages Area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {messages.map((message, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              maxWidth: '80%',
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              bgcolor: message.role === 'user' ? '#461147' : '#FFFFFF',
              color: message.role === 'user' ? '#FFFFFF' : 'inherit',
              boxShadow: 1,
            }}
          >
            <Typography variant="body1">
              {message.content}
            </Typography>
          </Paper>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: '#FFFFFF',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#F8F8F8',
            },
          }}
        />
        <IconButton 
          type="submit" 
          disabled={isLoading || !input.trim()}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default AiAssistantContent; 