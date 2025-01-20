/**
 * @fileoverview Main messaging component that handles real-time chat functionality,
 * file attachments, and message threading for workspace channels.
 * 
 * Key features:
 * - Real-time message updates using Supabase subscriptions
 * - File upload and attachment handling
 * - Message reactions and threading
 * - Sanitized HTML rendering
 * - Auto-scrolling behavior
 */

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
import { generateMessageEmbedding } from '../utils/embeddings';

/**
 * Main messaging component for displaying and managing channel messages
 * @param {string} channelId - Unique identifier for the current channel
 * @param {string} channelName - Display name of the current channel
 * @param {string} workspaceId - Unique identifier for the current workspace
 * @param {string} workspaceName - Display name of the current workspace
 * @param {Function} onThreadClick - Callback handler for thread interactions
 */
export default function Messaging({ channelId, channelName, workspaceId, workspaceName, onThreadClick }) {
  // State management for messages, file uploads, and UI
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const messageEndRef = useRef(null);

  /**
   * Smoothly scrolls the message container to the latest message
   */
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Sets up real-time message subscription and initial message fetch
   * Handles new message insertions with duplicate detection
   */
  useEffect(() => {
    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `channel_id=eq.${channelId}` 
      }, async (payload) => {
        // Skip thread replies
        if (payload.new.parent_message_id) return;

        // Fetch complete message data including sender info
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

        // Add new message with duplicate detection
        setMessages(prev => {
          const isDuplicate = prev.some(msg => 
            msg.id === messageData.id || 
            (msg.content === messageData.content && 
             msg.sender_id === messageData.sender_id && 
             Math.abs(new Date(msg.created_at) - new Date(messageData.created_at)) < 1000)
          );
          if (isDuplicate) return prev;
          return [...prev, messageData];
        });
        scrollToBottom();
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, channelName, workspaceId]);

  /**
   * Effect hook to auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Effect hook to clear selected files when changing channels
   */
  useEffect(() => {
    setSelectedFiles([]);
  }, [channelId]);

  /**
   * Fetches messages for the current channel including user info and reactions
   * Transforms the reaction data into a format suitable for the MessageReactions component
   */
  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          name
        ),
        message_reactions (
          id,
          emoji,
          user_id,
          users!message_reactions_user_id_fkey (
            id,
            name
          )
        )
      `)
      .eq("channel_id", channelId)
      .eq("workspace_id", workspaceId)
      .is("parent_message_id", null)  // Only fetch top-level messages
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      // Transform the reactions data into the format expected by MessageReactions
      const messagesWithFormattedReactions = data.map(message => ({
        ...message,
        initialReactions: message.message_reactions.reduce((acc, reaction) => {
          // Find existing emoji group or create new one
          const existingGroup = acc.find(group => group.emoji === reaction.emoji);
          if (existingGroup) {
            existingGroup.users.push({
              id: reaction.users.id,
              name: reaction.users.name,
              reaction_id: reaction.id
            });
            return acc;
          }
          // Create new emoji group
          acc.push({
            emoji: reaction.emoji,
            users: [{
              id: reaction.users.id,
              name: reaction.users.name,
              reaction_id: reaction.id
            }]
          });
          return acc;
        }, [])
      }));
      setMessages(messagesWithFormattedReactions);
    }
  }

  /**
   * Handles file selection from the file input
   * @param {Event} event - The file input change event
   */
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  /**
   * Removes a file from the selected files list
   * @param {number} index - Index of the file to remove
   */
  const removeSelectedFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  /**
   * Uploads a single file to Supabase storage
   * Creates a unique filename and handles upload progress
   * @param {File} file - The file to upload
   */
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

  /**
   * Handles sending a new message with optional file attachments
   * - Uploads any attached files to Supabase storage
   * - Creates a new message record with file attachments
   * - Generates embeddings for the message content
   * - Triggers real-time updates through subscription
   * @param {string} message - The message content to send
   */
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
        // Generate embeddings for the new message
        await generateMessageEmbedding({
          messageId: data.id,
          content: data.content,
          workspaceId: data.workspace_id,
          senderId: data.sender_id,
          senderName: data.users.name,
          channelName,
          workspaceName,
          timestamp: data.created_at,
          parentMessageContent: null // This is a new message, not a reply
        });
        
        // Message will be added by the subscription handler
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

  /**
   * Creates a signed URL for accessing a file in Supabase storage
   * @param {string} path - The storage path of the file
   * @returns {Promise<string|null>} The signed URL or null if error
   */
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

  /**
   * Memoized component for rendering file attachments
   * Handles signed URL generation and refresh for secure file access
   * @param {Object} props - Component props
   * @param {Object} props.attachment - Attachment metadata including path and type
   */
  const AttachmentItem = memo(({ attachment }) => {
    const [signedUrl, setSignedUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isImage = attachment.type.startsWith('image/');
    const urlExpiryRef = useRef(null);
    
    /**
     * Refreshes the signed URL if expired or not yet generated
     * Creates a URL valid for 7 days (maximum allowed)
     */
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
    
    /**
     * Effect hook to refresh signed URL when attachment path changes
     */
    useEffect(() => {
      refreshSignedUrl();
    }, [attachment.path]);

    /**
     * Handles file download with URL refresh if expired
     * Downloads the file using the signed URL and triggers browser download
     */
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

    /**
     * Triggers the browser's download mechanism for a blob
     * @param {Blob} blob - The file blob to download
     */
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

    /**
     * Handles clicking on file links
     * Refreshes URL if expired before opening in new tab
     * @param {Event} e - Click event
     */
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

    /**
     * Loading state UI for attachment
     */
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
    
    /**
     * Image attachment UI with preview and download options
     */
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

  /**
   * Renders a file attachment component
   * @param {Object} attachment - The attachment object containing file metadata
   * @returns {JSX.Element} The AttachmentItem component
   */
  const renderAttachment = (attachment) => {
    return <AttachmentItem key={attachment.path} attachment={attachment} />;
  };

  /**
   * Handles clicking the reply button on a message
   * @param {Object} message - The message being replied to
   */
  const handleReplyClick = (message) => {
    onThreadClick(message);
  };

  /**
   * Renders a single message with sender info, content, attachments, and reactions
   * Features:
   * - Avatar with user initial
   * - Sender name and timestamp
   * - Sanitized message content
   * - File attachments
   * - Message reactions
   * - Hover actions (reply)
   * 
   * @param {Object} message - The message object to render
   * @returns {JSX.Element} The message component
   */
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
          {message.users?.name ? message.users.name.charAt(0).toUpperCase() : ''}
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
          <MessageReactions messageId={message.id} initialReactions={message.initialReactions} />
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

  /**
   * Main component render
   * Layout structure:
   * - Messages area with auto-scroll
   * - File upload preview with progress indicators
   * - Message input with file attachment support
   */
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages Area with Auto-scroll */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map(message => renderMessage(message))}
        <div ref={messageEndRef} />
      </Box>

      {/* File Upload Preview with Progress Indicators */}
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
              {/* Upload Progress Indicator */}
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

      {/* Message Input Component */}
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