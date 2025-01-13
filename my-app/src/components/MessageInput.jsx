import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, CircularProgress, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import DOMPurify from 'dompurify';

export default function MessageInput({ channelId, channelName, onSendMessage, onFileSelect, uploading, selectedFiles = [] }) {
  const [message, setMessage] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

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

  const handleFormat = (command) => {
    document.execCommand(command, false, null);
    editorRef.current?.focus();
  };

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

  const canSend = message.trim().length > 0 || selectedFiles.length > 0;

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

  const formatButtons = [
    { icon: <FormatBoldIcon fontSize="small" />, command: 'bold', tooltip: 'Bold' },
    { icon: <FormatItalicIcon fontSize="small" />, command: 'italic', tooltip: 'Italic' },
    { icon: <FormatUnderlinedIcon fontSize="small" />, command: 'underline', tooltip: 'Underline' },
    { icon: <CodeIcon fontSize="small" />, command: 'formatBlock', param: 'pre', tooltip: 'Code' },
    { icon: <FormatListBulletedIcon fontSize="small" />, command: 'insertUnorderedList', tooltip: 'Bullet List' },
    { icon: <FormatListNumberedIcon fontSize="small" />, command: 'insertOrderedList', tooltip: 'Numbered List' },
  ];

  return (
    <Box sx={{ p: 3 }}>
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
          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="small"
            sx={buttonStyles}
          >
            <AddIcon />
          </IconButton>
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
    </Box>
  );
} 