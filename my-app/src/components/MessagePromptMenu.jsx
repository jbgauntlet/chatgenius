/**
 * MessagePromptMenu Component
 * 
 * A popup menu component that provides AI-powered message generation capabilities.
 * Users can input prompts to generate message content using OpenAI's GPT model.
 * 
 * Features:
 * - AI message generation using GPT-3.5
 * - Real-time loading states
 * - Error handling
 * - Styled popup interface
 * 
 * @component
 * @param {Object} props
 * @param {HTMLElement} props.anchorEl - Element to anchor the popup menu to
 * @param {boolean} props.open - Whether the menu is open
 * @param {Function} props.onClose - Callback when menu is closed
 * @param {Function} props.onPromptComplete - Callback when message generation is complete
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Fade,
  Popper,
  ClickAwayListener,
  InputAdornment,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

export default function MessagePromptMenu({ 
  anchorEl, 
  open, 
  onClose, 
  onPromptComplete
}) {
  // State Management
  const [prompt, setPrompt] = useState(''); // User's prompt input
  const [isGenerating, setIsGenerating] = useState(false); // Loading state for AI generation

  /**
   * Handles form submission and generates AI response
   * @param {Event} e - Form submission event
   */
  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "system", 
              content: "You are a generative llm." 
            },
            { 
              role: "user", 
              content: "Do what the prompt asks. Do not ask questions. Prompt: " + prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      onPromptComplete(result.choices[0].message.content);
      onClose();
      setPrompt('');
    } catch (error) {
      console.error('Error generating message:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="top-start"
      transition
      style={{ zIndex: 1300 }}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={200}>
          <Paper
            sx={{
              p: 2,
              width: 600,
              maxWidth: '90vw',
              mb: 1,
            }}
          >
            <ClickAwayListener onClickAway={onClose}>
              <Box>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon color="primary" />
                    <Typography variant="subtitle1">
                      AI Message Generator
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Prompt Input Form */}
                <form onSubmit={handlePromptSubmit}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Describe the message you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 1 }}>
                          <IconButton
                            type="submit"
                            disabled={!prompt.trim() || isGenerating}
                            color="primary"
                            sx={{ transform: 'scale(1.2)' }}
                          >
                            {isGenerating ? (
                              <CircularProgress size={24} />
                            ) : (
                              <SendIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </form>
              </Box>
            </ClickAwayListener>
          </Paper>
        </Fade>
      )}
    </Popper>
  );
} 