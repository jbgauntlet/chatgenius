import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import ReactQuill from 'react-quill';
import { supabase } from '../supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './Messaging.css';

export default function Messaging({ channelId, channelName, workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const messageEndRef = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `channel_id=eq.${channelId}` 
      }, async (payload) => {
        // Fetch the complete message data including sender info
        const { data: messageData, error } = await supabase
          .from("messages")
          .select(`
            *,
            users:sender_id (
              name
            )
          `)
          .eq('id', payload.new.id)
          .eq('workspace_id', workspaceId)
          .single();

        if (error) {
          console.error('Error fetching message details:', error);
          return;
        }

        // Check for duplicates before adding
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === messageData.id);
          if (messageExists) return prev;
          return [...prev, messageData];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, channelName, workspaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        users:sender_id (
          name
        )
      `)
      .eq("channel_id", channelId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data);
    }
  }

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const uploadFile = async (file) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Create a clean filename with a unique prefix
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const filePath = `${uniquePrefix}-${cleanFileName}`;

      // Upload the file with minimal options
      const { data, error: uploadError } = await supabase.storage
        .from('private-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return {
        path: filePath,
        name: file.name,
        type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "" && selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }

      // Upload files first
      const attachments = [];
      for (const file of selectedFiles) {
        const fileData = await uploadFile(file);
        attachments.push(fileData);
      }

      const messageData = {
        channel_id: channelId,
        workspace_id: workspaceId,
        sender_id: user.id,
        content: newMessage,
        attachments
      };

      const { data, error } = await supabase
        .from("messages")
        .insert([messageData])
        .select(`
          *,
          users:sender_id (
            name
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setMessages(prev => [...prev, data]);
        setNewMessage("");
        setSelectedFiles([]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const getSignedUrl = async (path) => {
    const { data, error } = await supabase.storage
      .from('private-files')
      .createSignedUrl(path, 3600); // URL valid for 1 hour

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  const AttachmentItem = ({ attachment }) => {
    const [signedUrl, setSignedUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isImage = attachment.type.startsWith('image/');
    
    const refreshSignedUrl = async () => {
      setIsLoading(true);
      try {
        const url = await getSignedUrl(attachment.path);
        setSignedUrl(url);
      } catch (error) {
        console.error('Error refreshing signed URL:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    useEffect(() => {
      refreshSignedUrl();
    }, [attachment.path]);

    const handleDownload = async () => {
      try {
        // Try to fetch with current URL
        const response = await fetch(signedUrl);
        
        // If the URL has expired (403 or 401), refresh it and try again
        if (!response.ok && (response.status === 403 || response.status === 401)) {
          await refreshSignedUrl();
          const newResponse = await fetch(signedUrl);
          if (!newResponse.ok) throw new Error('Failed to download file');
          const blob = await newResponse.blob();
          triggerDownload(blob);
        } else {
          const blob = await response.blob();
          triggerDownload(blob);
        }
      } catch (error) {
        console.error('Error downloading file:', error);
      }
    };

    const triggerDownload = (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    };

    const handleLinkClick = async (e) => {
      e.preventDefault();
      // Try to open the URL, if it fails (expired), refresh and try again
      try {
        const response = await fetch(signedUrl, { method: 'HEAD' });
        if (!response.ok && (response.status === 403 || response.status === 401)) {
          await refreshSignedUrl();
          window.open(signedUrl, '_blank');
        } else {
          window.open(signedUrl, '_blank');
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    };

    if (isLoading) {
      return (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CircularProgress size={16} />
          <Typography variant="body2">{attachment.name}</Typography>
        </Box>
      );
    }
    
    return (
      <Box
        sx={{
          mt: 1,
          p: 1,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <FileUploadIcon sx={{ color: 'primary.main' }} />
        <Typography variant="body2" component="a" 
          href={signedUrl}
          onClick={handleLinkClick}
          sx={{ 
            color: 'primary.main',
            textDecoration: 'none',
            flexGrow: 1,
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {attachment.name}
        </Typography>
        <Tooltip title="Download">
          <IconButton 
            size="small" 
            onClick={handleDownload}
            sx={{ ml: 'auto' }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderAttachment = (attachment) => {
    return <AttachmentItem key={attachment.path} attachment={attachment} />;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} className="message-container">
            <div className="message-header">
              <div className="message-user-info">
                <div className="message-avatar">
                  {msg.users?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="message-name">{msg.users?.name || 'Unknown User'}</span>
              </div>
              <span className="message-timestamp">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="message-content">
              <span dangerouslySetInnerHTML={{ __html: msg.content }} />
              {msg.attachments && msg.attachments.map(attachment => renderAttachment(attachment))}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      <div style={{ 
        borderTop: '1px solid #e0e0e0',
        padding: '20px',
        backgroundColor: '#fff',
      }}>
        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {selectedFiles.map((file, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1
                }}
              >
                <AttachFileIcon sx={{ color: 'primary.main' }} />
                <Typography variant="body2">{file.name}</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => removeSelectedFile(index)}
                  sx={{ ml: 'auto' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        <div className="editor-container">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            multiple
          />
          <ReactQuill
            key={channelId}
            theme="snow"
            value={newMessage}
            onChange={setNewMessage}
            placeholder={`Message #${channelName || '...'}`}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <AttachFileIcon />
            </IconButton>
            <button 
              className="send-button" 
              onClick={sendMessage}
              disabled={uploading}
            >
              {uploading ? <CircularProgress size={20} /> : 'Send'}
            </button>
          </Box>
        </div>
      </div>
    </div>
  );
}