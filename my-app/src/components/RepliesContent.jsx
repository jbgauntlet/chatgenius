import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Box,
  Typography,
  Divider,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { supabase } from '../supabaseClient';
import MessageInput from './MessageInput';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';

export default function RepliesContent({ parentMessage }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const repliesEndRef = useRef(null);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (parentMessage) {
      fetchReplies();
    }
  }, [parentMessage]);

  const fetchReplies = async () => {
    if (!parentMessage) return;

    try {
      // Check if it's a DM or channel message based on the presence of channel_id
      const isDirectMessage = !parentMessage.channel_id;
      const table = isDirectMessage ? 'user_messages' : 'messages';

      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          ${isDirectMessage ? `
            sender:sender_id (
              name
            ),
            recipient:recipient_id (
              name
            )
          ` : `
            users:sender_id (
              name
            )
          `}
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

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    // Remove immediate scroll since we have the effect above
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    setUploadProgress(progress => {
      const newProgress = { ...progress };
      delete newProgress[selectedFiles[index].name];
      return newProgress;
    });
  };

  const handleSendReply = async (message) => {
    if ((!message || !message.trim()) && selectedFiles.length === 0) return;

    setSending(true);
    setUploadProgress({});
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload files first if any
      const attachments = [];
      for (const file of selectedFiles) {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const filePath = `${uniquePrefix}-${cleanFileName}`;

        const { data: fileData, error: uploadError } = await supabase.storage
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

        attachments.push({
          path: filePath,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }

      // Check if it's a DM or channel message
      const isDirectMessage = !parentMessage.channel_id;
      const table = isDirectMessage ? 'user_messages' : 'messages';

      // Prepare message data
      const messageData = {
        content: message,
        sender_id: user.id,
        parent_message_id: parentMessage.id,
        workspace_id: parentMessage.workspace_id,
        attachments: attachments.length > 0 ? attachments : null,
        ...(isDirectMessage ? {
          recipient_id: parentMessage.sender_id === user.id ? parentMessage.recipient_id : parentMessage.sender_id
        } : {
          channel_id: parentMessage.channel_id
        })
      };

      // Insert the reply
      const { data, error } = await supabase
        .from(table)
        .insert([messageData])
        .select(`
          *,
          ${isDirectMessage ? `
            sender:sender_id (
              name
            ),
            recipient:recipient_id (
              name
            )
          ` : `
            users:sender_id (
              name
            )
          `}
        `)
        .single();

      if (error) throw error;

      // Update thread count on parent message
      const { error: updateError } = await supabase
        .from(table)
        .update({ thread_count: (parentMessage.thread_count || 0) + 1 })
        .eq('id', parentMessage.id);

      if (updateError) throw updateError;

      setReplies(prev => [...prev, data]);
      setSelectedFiles([]);
      setUploadProgress({});
      // Only scroll to bottom after sending a message
      scrollToBottom();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
      setUploadProgress({});
    }
  };

  const AttachmentItem = memo(({ attachment }) => {
    const [signedUrl, setSignedUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isImage = attachment.type?.startsWith('image/');
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
          <CircularProgress size={20} />
          <Typography variant="body2">Loading attachment...</Typography>
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
            className="reply-image"
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

  if (!parentMessage) {
    return (
      <Typography color="grey.600">
        Select a message to view replies
      </Typography>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
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
          {parentMessage.attachments?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {parentMessage.attachments.map(attachment => renderAttachment(attachment))}
            </Box>
          )}
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
                  {reply.attachments?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {reply.attachments.map(attachment => renderAttachment(attachment))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={repliesEndRef} />
          </Box>
        ) : (
          <Typography color="grey.600" sx={{ mb: 3 }}>
            No replies yet
          </Typography>
        )}

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
                  disabled={sending}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                {sending && uploadProgress[file.name] !== undefined && (
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

        {/* Reply Input */}
        <MessageInput
          channelId={parentMessage.channel_id}
          channelName="thread"
          onSendMessage={handleSendReply}
          onFileSelect={handleFileSelect}
          uploading={sending}
          selectedFiles={selectedFiles}
        />
      </Box>
    </Box>
  );
} 