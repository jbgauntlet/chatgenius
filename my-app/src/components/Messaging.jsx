import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
  Avatar
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ReactQuill from 'react-quill';
import { supabase } from '../supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './Messaging.css';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MessageInput from './MessageInput';
import MessageReactions from './MessageReactions';
import DOMPurify from 'dompurify';
import { getAvatarColor } from '../utils/colors';

export default function Messaging({ channelId, channelName, workspaceId, onThreadClick }) {
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
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
        // Only process if it's not a thread reply
        if (payload.new.parent_message_id) return;

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

  useEffect(() => {
    setSelectedFiles([]);
  }, [channelId]);

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
      .is("parent_message_id", null)  // Only fetch top-level messages
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

      // Upload the file with progress tracking
      const { data, error: uploadError } = await supabase.storage
        .from('private-files')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: Math.round(percent)
            }));
          }
        });

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

  const handleSendMessage = async (message) => {
    if (!message.trim() && selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});
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
        content: message,
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
        setSelectedFiles([]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
      setUploadProgress({});
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

  const AttachmentItem = memo(({ attachment }) => {
    const [signedUrl, setSignedUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isImage = attachment.type.startsWith('image/');
    const urlExpiryRef = useRef(null);
    
    const refreshSignedUrl = async () => {
      // If we have a valid URL that hasn't expired, don't refresh
      if (signedUrl && urlExpiryRef.current && Date.now() < urlExpiryRef.current) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('private-files')
          .createSignedUrl(attachment.path, 604800); // URL valid for 7 days (maximum allowed)

        if (error) throw error;
        
        setSignedUrl(data.signedUrl);
        // Set expiry time to slightly less than the actual expiry to be safe
        urlExpiryRef.current = Date.now() + (604800 * 1000 * 0.9);
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
    
    if (isImage) {
      return (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1
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
          <Box
            component="img"
            src={signedUrl}
            alt={attachment.name}
            sx={{
              maxWidth: '300px',
              maxHeight: '200px',
              objectFit: 'contain',
              borderRadius: 1,
              cursor: 'pointer'
            }}
            onClick={handleLinkClick}
          />
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
  });

  const renderAttachment = (attachment) => {
    return <AttachmentItem key={attachment.path} attachment={attachment} />;
  };

  const handleReplyClick = (message) => {
    onThreadClick(message);
  };

  const renderMessage = (message) => (
    <Box
      key={message.id}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mb: 2,
        '&:hover': {
          '& .message-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Avatar 
          sx={{ 
            width: 36, 
            height: 36,
            borderRadius: 1.5,
            bgcolor: getAvatarColor(message.sender_id),
            fontWeight: 700
          }}
        >
          {message.users.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {message.users.name}
              <Typography variant="caption" color="text.secondary" sx={{ pt: '2px' }}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </Typography>
            </Typography>
          </Box>
          <Typography
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(message.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'code', 'pre', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'target'],
                ALLOW_DATA_ATTR: false,
              }) 
            }}
            sx={{ wordBreak: 'break-word' }}
          />
          {message.attachments?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={index} attachment={attachment} />
              ))}
            </Box>
          )}
          <MessageReactions messageId={message.id} />
        </Box>
        <Box 
          className="message-actions"
          sx={{ 
            opacity: 0, 
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Tooltip title="Reply in thread">
            <IconButton 
              size="small"
              onClick={() => handleReplyClick(message)}
              sx={{ color: 'grey.500' }}
            >
              <ChatBubbleOutlineIcon fontSize="small" />
              {message.thread_count > 0 && (
                <Typography 
                  variant="caption" 
                  sx={{ ml: 0.5 }}
                >
                  {message.thread_count}
                </Typography>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {message.thread_count > 0 && (
        <Box 
          onClick={() => handleReplyClick(message)}
          sx={{ 
            ml: 7,
            mt: 0.5,
            color: 'primary.main',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          <ChatBubbleOutlineIcon fontSize="small" />
          <Typography variant="body2">
            {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map(message => renderMessage(message))}
        <div ref={messageEndRef} />
      </Box>

      {/* File Upload Preview */}
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
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <AttachFileIcon sx={{ color: 'primary.main' }} />
              <Typography variant="body2">{file.name}</Typography>
              <IconButton 
                size="small" 
                onClick={() => removeSelectedFile(index)}
                sx={{ ml: 'auto' }}
                disabled={uploading}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              {uploading && uploadProgress[file.name] !== undefined && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: `${uploadProgress[file.name]}%`,
                    height: '2px',
                    bgcolor: 'primary.main',
                    transition: 'width 0.3s ease'
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Message Input */}
      <MessageInput
        channelId={channelId}
        channelName={channelName}
        onSendMessage={handleSendMessage}
        onFileSelect={handleFileSelect}
        uploading={uploading}
        selectedFiles={selectedFiles}
      />
    </Box>
  );
}