/**
 * MessageInput Component
 * 
 * A rich text input component for composing messages with formatting options,
 * file attachments, AI assistance, and voice input capabilities.
 * 
 * Features:
 * - Rich text formatting (bold, italic, underline, lists)
 * - File attachments
 * - AI-powered writing assistance
 * - Grammar checking
 * - Voice input with transcription
 * - Message enhancement
 * 
 * @component
 * @param {Object} props
 * @param {string} props.channelId - ID of the current channel
 * @param {string} props.channelName - Name of the current channel
 * @param {Function} props.onSendMessage - Callback when a message is sent
 * @param {Function} props.onFileSelect - Callback when files are selected
 * @param {boolean} props.uploading - Whether files are currently uploading
 * @param {Array} props.selectedFiles - Array of selected files
 * @param {number} [props.padding=3] - Padding around the input component
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, CircularProgress, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import DOMPurify from 'dompurify';
import MessagePromptMenu from './MessagePromptMenu';
import { typeText } from '../utils/textAnimation';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

export default function MessageInput({ 
  channelId, 
  channelName, 
  onSendMessage, 
  onFileSelect, 
  uploading, 
  selectedFiles = [], 
  padding = 3 
}) {
  // State Management
  const [message, setMessage] = useState(''); // Message content
  const [showToolbar, setShowToolbar] = useState(false); // Formatting toolbar visibility
  const [promptMenuAnchor, setPromptMenuAnchor] = useState(null); // AI prompt menu anchor
  const [isGrammarChecking, setIsGrammarChecking] = useState(false); // Grammar check state
  const [isEnhancing, setIsEnhancing] = useState(false); // Text enhancement state
  const [isRecording, setIsRecording] = useState(false); // Voice recording state
  const [mediaRecorder, setMediaRecorder] = useState(null); // Media recorder instance
  const [isTranscribing, setIsTranscribing] = useState(false); // Voice transcription state
  
  // Refs
  const fileInputRef = useRef(null); // Hidden file input
  const editorRef = useRef(null); // Rich text editor
  const audioChunks = useRef([]); // Voice recording chunks

  /**
   * Adjusts the height of the input field based on content
   */
  useEffect(() => {
    const adjustHeight = () => {
      if (!editorRef.current) return;
      
      // Reset height to auto to get proper scrollHeight
      editorRef.current.style.height = 'auto';
      
      // Set new height based on content
      const newHeight = Math.min(200, Math.max(24, editorRef.current.scrollHeight));
      editorRef.current.style.height = `${newHeight}px`;
    };

    adjustHeight();
  }, [message]);

  /**
   * Handles input changes and updates message state
   * @param {Event} e - Input change event
   */
  const handleInput = (e) => {
    const content = e.target.innerHTML;
    // If the content is empty or just whitespace/breaks, clear it completely
    if (!content.replace(/<[^>]*>/g, '').trim()) {
      e.target.innerHTML = '';
      setMessage('');
    } else {
      setMessage(content);
    }
  };

  /**
   * Handles keyboard events for message submission and backspace
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Backspace' && editorRef.current?.innerHTML === '<br>') {
      // Clear the <br> tag when backspacing an empty line
      e.preventDefault();
      editorRef.current.innerHTML = '';
    }
  };

  /**
   * Applies text formatting commands
   * @param {string} command - The formatting command to apply
   */
  const handleFormat = (command) => {
    document.execCommand(command, false, null);
    editorRef.current?.focus();
  };

  /**
   * Sends the current message and resets input state
   */
  const handleSend = () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    
    const sanitizedMessage = DOMPurify.sanitize(message, {
      ALLOWED_TAGS: ['br', 'strong', 'em', 'u', 'code', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
    });

    onSendMessage(sanitizedMessage);
    setMessage('');
    setShowToolbar(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.style.height = '24px';
    }
  };

  /**
   * Handles AI-generated text completion
   * @param {string} generatedText - The AI-generated text
   */
  const handlePromptComplete = async (generatedText) => {
    if (editorRef.current) {
      editorRef.current.textContent = '';
      await typeText(generatedText, editorRef.current, 30, adjustHeight);
      setMessage(editorRef.current.textContent);
    }
  };

  /**
   * Checks and corrects grammar using OpenAI
   */
  const handleGrammarCheck = async () => {
    if (!message.trim()) return;
    
    setIsGrammarChecking(true);
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
              content: "You are a grammar correction assistant. Fix any spelling or grammatical mistakes in the text, but do not change words unless necessary for grammatical correctness. Return only the corrected text without any explanations." 
            },
            { 
              role: "user", 
              content: editorRef.current.textContent
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      const correctedText = result.choices[0].message.content;
      editorRef.current.textContent = '';
      await typeText(correctedText, editorRef.current, 30, adjustHeight);
      setMessage(correctedText);
    } catch (error) {
      console.error('Error checking grammar:', error);
    } finally {
      setIsGrammarChecking(false);
    }
  };

  /**
   * Enhances text using OpenAI for better clarity and impact
   */
  const handleEnhanceText = async () => {
    if (!message.trim()) return;
    
    setIsEnhancing(true);
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
              content: "You are a writing enhancement assistant. Improve the writing style, clarity, and impact of the text while preserving its original meaning and core message. Make it more professional and engaging, but don't change the fundamental ideas. Return only the enhanced text without any explanations." 
            },
            { 
              role: "user", 
              content: editorRef.current.textContent
            }
          ],
          max_tokens: 500,
          temperature: 0.4,
        }),
      });

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      const enhancedText = result.choices[0].message.content;
      editorRef.current.textContent = '';
      await typeText(enhancedText, editorRef.current, 30, adjustHeight);
      setMessage(enhancedText);
    } catch (error) {
      console.error('Error enhancing text:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  /**
   * Starts voice recording for transcription
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  /**
   * Stops voice recording
   */
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  /**
   * Transcribes recorded audio using OpenAI Whisper
   * @param {Blob} audioBlob - The recorded audio blob
   */
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: formData
      });

      const result = await response.json();
      if (result.text) {
        if (editorRef.current) {
          editorRef.current.textContent = '';
          await typeText(result.text, editorRef.current, 30, adjustHeight);
          setMessage(result.text);
        }
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Determine if message can be sent
  const canSend = message.trim().length > 0 || selectedFiles.length > 0;

  // Common button styles
  const buttonStyles = {
    color: 'grey.600',
    padding: '4px',
    '&:hover': {
      bgcolor: 'transparent',
      color: 'grey.900',
    },
    '&.Mui-disabled': {
      color: 'grey.300',
    },
  };

  // Format button configurations
  const formatButtons = [
    { icon: <FormatBoldIcon fontSize="small" />, command: 'bold', tooltip: 'Bold' },
    { icon: <FormatItalicIcon fontSize="small" />, command: 'italic', tooltip: 'Italic' },
    { icon: <FormatUnderlinedIcon fontSize="small" />, command: 'underline', tooltip: 'Underline' },
    { icon: <CodeIcon fontSize="small" />, command: 'formatBlock', param: 'pre', tooltip: 'Code' },
    { icon: <FormatListBulletedIcon fontSize="small" />, command: 'insertUnorderedList', tooltip: 'Bullet List' },
    { icon: <FormatListNumberedIcon fontSize="small" />, command: 'insertOrderedList', tooltip: 'Numbered List' },
  ];

  return (
    <Box sx={{ p: padding }}>
      <Box sx={{ 
        p: 2.5, 
        borderRadius: '8px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onFileSelect}
          multiple
        />
        
        <Box sx={{ 
          display: 'flex', 
          gap: 0.5, 
          mb: 1,
          borderBottom: 1,
          borderColor: 'divider',
          pb: 1
        }}>
          {formatButtons.map((button, index) => (
            <Tooltip key={index} title={button.tooltip}>
              <IconButton
                size="small"
                onClick={() => handleFormat(button.command, button.param)}
                sx={buttonStyles}
              >
                {button.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        <Box
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          sx={{
            fontSize: '15px',
            lineHeight: '22px',
            minHeight: '24px',
            maxHeight: '200px',
            overflowY: 'auto',
            outline: 'none',
            wordBreak: 'break-word',
            position: 'relative',
            '&:empty:before': {
              content: `"Message #${channelName || '...'}"`,
              color: 'rgba(0, 0, 0, 0.6)',
              position: 'absolute',
              pointerEvents: 'none',
              left: 0,
              top: 0,
              fontSize: '15px',
              lineHeight: '22px'
            }
          }}
        />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: 1
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="small"
              sx={buttonStyles}
            >
              <AddIcon />
            </IconButton>
            <IconButton
              onClick={(e) => setPromptMenuAnchor(e.currentTarget)}
              size="small"
              sx={buttonStyles}
            >
              <AutoAwesomeIcon />
            </IconButton>
            <Tooltip title="Fix Grammar">
              <IconButton
                onClick={handleGrammarCheck}
                disabled={!message.trim() || isGrammarChecking}
                size="small"
                sx={buttonStyles}
              >
                {isGrammarChecking ? (
                  <CircularProgress size={20} />
                ) : (
                  <AutoFixNormalIcon />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Enhance Writing">
              <IconButton
                onClick={handleEnhanceText}
                disabled={!message.trim() || isEnhancing}
                size="small"
                sx={buttonStyles}
              >
                {isEnhancing ? (
                  <CircularProgress size={20} />
                ) : (
                  <AutoFixHighIcon />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={isRecording ? "Stop Recording" : "Start Recording"}>
              <IconButton
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                size="small"
                sx={{
                  ...buttonStyles,
                  color: isRecording ? 'error.main' : buttonStyles.color,
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': {
                      transform: 'scale(1)',
                    },
                    '50%': {
                      transform: 'scale(1.1)',
                    },
                    '100%': {
                      transform: 'scale(1)',
                    },
                  },
                }}
              >
                {isTranscribing ? (
                  <CircularProgress size={20} />
                ) : isRecording ? (
                  <StopIcon />
                ) : (
                  <MicIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
          <IconButton
            onClick={handleSend}
            disabled={uploading || !canSend}
            size="small"
            sx={{
              ...buttonStyles,
              color: canSend ? 'grey.600' : 'grey.400',
              '&:hover': {
                bgcolor: 'transparent',
                color: canSend ? 'grey.900' : 'grey.400',
              },
            }}
          >
            {uploading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Box>

      <MessagePromptMenu
        anchorEl={promptMenuAnchor}
        open={Boolean(promptMenuAnchor)}
        onClose={() => setPromptMenuAnchor(null)}
        onPromptComplete={handlePromptComplete}
      />
    </Box>
  );
} 