import React, { useState, useRef } from 'react';
import { Box, IconButton, CircularProgress } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function MessageInput({ channelId, channelName, onSendMessage, onFileSelect, uploading, selectedFiles = [] }) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    onSendMessage(message);
    setMessage('');
  };

  const canSend = message.trim().length > 0 || selectedFiles.length > 0;

  const buttonStyles = {
    color: 'grey.600',
    '&:hover': {
      bgcolor: 'transparent',
      color: 'grey.900',
    },
    '&.Mui-disabled': {
      color: 'grey.300',
    },
  };

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileSelect}
        multiple
      />
      <ReactQuill
        theme="snow"
        value={message}
        onChange={setMessage}
        placeholder={`Message ${channelName || '...'}`}
        modules={{
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['link', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ]
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
          <AttachFileIcon />
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
  );
} 