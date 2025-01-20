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
import DOMPurify from 'dompurify';
import { supabase } from '../supabaseClient';
import MessageInput from './MessageInput';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import MessageReactions from './MessageReactions';
import UserMessageReactions from './UserMessageReactions';
import { getAvatarColor } from '../utils/colors';
import { generateMessageEmbedding } from '../utils/embeddings';

export default function RepliesContent({ parentMessage, workspaceName, channelName }) {
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

  // Add subscription effect
  useEffect(() => {
    let channel;
    
    const setupSubscription = async () => {
      if (!parentMessage) return;

      const isDirectMessage = !parentMessage.channel_id;
      const table = isDirectMessage ? 'user_messages' : 'messages';

      // Subscribe to new replies
      channel = supabase
        .channel(`replies_${parentMessage.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: table,
          filter: `parent_message_id=eq.${parentMessage.id}` 
        }, async (payload) => {
          // Fetch the complete reply data including sender info and reactions
          const { data: replyData, error } = await supabase
            .from(table)
            .select(`
              *,
              ${isDirectMessage ? `
                sender:sender_id (
                  id,
                  name
                ),
                recipient:recipient_id (
                  id,
                  name
                ),
                user_message_reactions (
                  id,
                  emoji,
                  user_id,
                  users!user_message_reactions_user_id_fkey (
                    id,
                    name
                  )
                )
              ` : `
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
              `}
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching reply details:', error);
            return;
          }

          // Format the reactions data
          const replyWithFormattedReactions = {
            ...replyData,
            initialReactions: (isDirectMessage ? replyData.user_message_reactions : replyData.message_reactions).reduce((acc, reaction) => {
              const existingGroup = acc.find(group => group.emoji === reaction.emoji);
              if (existingGroup) {
                existingGroup.users.push({
                  id: reaction.users.id,
                  name: reaction.users.name,
                  reaction_id: reaction.id
                });
                return acc;
              }
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
          };

          // Add the new reply to the list
          setReplies(prev => {
            const replyExists = prev.some(reply => reply.id === replyWithFormattedReactions.id);
            if (replyExists) return prev;
            return [...prev, replyWithFormattedReactions];
          });
          scrollToBottom();
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
              id,
              name
            ),
            recipient:recipient_id (
              id,
              name
            ),
            user_message_reactions (
              id,
              emoji,
              user_id,
              users!user_message_reactions_user_id_fkey (
                id,
                name
              )
            )
          ` : `
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
          `}
        `)
        .eq('parent_message_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform the reactions data into the format expected by MessageReactions
      const repliesWithFormattedReactions = data.map(reply => ({
        ...reply,
        initialReactions: (isDirectMessage ? reply.user_message_reactions : reply.message_reactions).reduce((acc, reaction) => {
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
      setReplies(repliesWithFormattedReactions);
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

      // Determine recipient_id for DMs
      let recipientId = null;
      if (isDirectMessage) {
        recipientId = parentMessage.sender_id === user.id ? 
          parentMessage.recipient_id : 
          parentMessage.sender_id;
      }

      console.log("Parent message:", {
        parentMessage,
        isDirectMessage,
        currentUserId: user.id,
        calculatedRecipientId: recipientId
      });

      // Prepare message data
      const messageData = {
        content: message,
        sender_id: user.id,
        parent_message_id: parentMessage.id,
        workspace_id: parentMessage.workspace_id,
        attachments: attachments.length > 0 ? attachments : null,
        ...(isDirectMessage ? {
          recipient_id: recipientId
        } : {
          channel_id: parentMessage.channel_id
        })
      };

      console.log("Message data being sent:", messageData);

      // Insert the reply
      const { data, error } = await supabase
        .from(table)
        .insert([messageData])
        .select(`
          *,
          ${isDirectMessage ? `
            sender:sender_id (
              id,
              name
            ),
            recipient:recipient_id (
              id,
              name
            )
          ` : `
            users:sender_id (
              id,
              name
            )
          `}
        `)
        .single();

      if (error) throw error;

      // Log recipient data for verification
      console.log("Reply data for embedding:", {
        isDirectMessage,
        recipientId: data.recipient_id,
        recipientName: isDirectMessage ? data.recipient?.name : null,
        senderId: data.sender_id,
        senderName: isDirectMessage ? data.sender?.name : data.users?.name,
        parentMessage: {
          sender_id: parentMessage.sender_id,
          recipient_id: parentMessage.recipient_id,
          channel_id: parentMessage.channel_id,
          channel_name: parentMessage.channel_name,
          channel: parentMessage.channel
        }
      });

      // Generate embedding for the reply
      await generateMessageEmbedding({
        messageId: data.id,
        content: data.content,
        workspaceId: data.workspace_id,
        senderId: data.sender_id,
        senderName: isDirectMessage ? data.sender.name : data.users.name,
        channelName: isDirectMessage ? null : channelName,
        workspaceName: workspaceName,
        timestamp: data.created_at,
        parentMessageContent: parentMessage.content,
        recipientId: isDirectMessage ? data.recipient_id : null,
        recipientName: isDirectMessage ? data.recipient.name : null
      });

      // Update thread count on parent message
      const { error: updateError } = await supabase
        .from(table)
        .update({ thread_count: (parentMessage.thread_count || 0) + 1 })
        .eq('id', parentMessage.id);

      if (updateError) throw updateError;

      // Remove immediate state update - let subscription handle it
      // setReplies(prev => [...prev, data]);
      setSelectedFiles([]);
      setUploadProgress({});
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
            <Avatar 
              sx={{ 
                width: 24, 
                height: 24, 
                mr: 1, 
                fontSize: '0.75rem',
                borderRadius: 1,
                bgcolor: getAvatarColor(parentMessage.sender_id),
                fontWeight: 700
              }}
            >
              {parentMessage.users?.name ? parentMessage.users.name.charAt(0).toUpperCase() : ''}
            </Avatar>
            <Typography variant="subtitle2">
              {parentMessage.users?.name}
            </Typography>
            <Typography variant="caption" color="grey.600" sx={{ ml: 1, pt: '2px' }}>
              {new Date(parentMessage.created_at).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </Typography>
          </Box>
          <Typography
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(parentMessage.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'code', 'pre', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'target'],
                ALLOW_DATA_ATTR: false,
              }) 
            }}
          />
          {parentMessage.attachments?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {parentMessage.attachments.map(attachment => renderAttachment(attachment))}
            </Box>
          )}
          {parentMessage.channel_id ? (
            <MessageReactions messageId={parentMessage.id} initialReactions={parentMessage.initialReactions} />
          ) : (
            <UserMessageReactions messageId={parentMessage.id} initialReactions={parentMessage.initialReactions} />
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
                  alignItems: 'flex-start',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    fontSize: '0.75rem',
                    borderRadius: 1,
                    bgcolor: getAvatarColor(reply.sender_id),
                    fontWeight: 700
                  }}
                >
                  {reply.users?.name ? reply.users.name.charAt(0).toUpperCase() : ''}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {reply.users?.name}
                      <Typography variant="caption" color="text.secondary" sx={{ pt: '2px' }}>
                        {new Date(reply.created_at).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    </Typography>
                  </Box>
                  <Typography
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(reply.content, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'code', 'pre', 'ul', 'ol', 'li'],
                        ALLOWED_ATTR: ['href', 'target'],
                        ALLOW_DATA_ATTR: false,
                      }) 
                    }}
                    sx={{ wordBreak: 'break-word' }}
                  />
                  {reply.attachments?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {reply.attachments.map(attachment => renderAttachment(attachment))}
                    </Box>
                  )}
                  {parentMessage.channel_id ? (
                    <MessageReactions messageId={reply.id} initialReactions={reply.initialReactions} />
                  ) : (
                    <UserMessageReactions messageId={reply.id} initialReactions={reply.initialReactions} />
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
          padding={0}
        />
      </Box>
    </Box>
  );
} 