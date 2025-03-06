import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { getAvatarColor } from '../utils/colors';
import { supabase } from '../supabaseClient';
import { generateEmbedding } from '../utils/embeddings';

export default function SearchResults({ 
  query, 
  results, 
  loading, 
  onMessageClick,
  workspaceId,
  currentUser
}) {
  const [semanticResults, setSemanticResults] = useState([]);
  const [loadingSemanticResults, setLoadingSemanticResults] = useState(false);

  useEffect(() => {
    const fetchSemanticResults = async () => {
      if (!query || !workspaceId || !currentUser) return;
      
      setLoadingSemanticResults(true);
      try {
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector search
        const { data: vectorResults, error } = await supabase
          .rpc('vector_search', {
            query_vector: queryEmbedding,
            workspace_id: workspaceId,
            user_id: currentUser.id,
            top_k: 10
          });

        console.log("Vector search results:", {
          vectorResults,
          error,
          workspaceId,
          currentUser
        });

        if (error) throw error;
        console.log("Vector results:", vectorResults);
        // Get unique message IDs from vector results, excluding those already in results
        const existingIds = new Set(results.map(r => r.message_id || r.id));
        const uniqueMessageIds = vectorResults
          .filter(r => !existingIds.has(r.message_id))
          .map(r => r.message_id);
console.log("Unique message IDs:", uniqueMessageIds);
        if (uniqueMessageIds.length === 0) {
          setSemanticResults([]);
          return;
        }
        
        // Fetch full message details for both regular messages and DMs
        const [messagesResult, dmResult] = await Promise.all([
          supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                name
              ),
              channel:channel_id (
                name
              )
            `)
            .in('id', uniqueMessageIds),
          
          supabase
            .from('user_messages')
            .select(`
              *,
              sender:sender_id (
                name
              ),
              recipient:recipient_id (
                name
              )
            `)
            .in('id', uniqueMessageIds)
        ]);

        console.log("Messages result:", messagesResult);
        console.log("DM result:", dmResult);

        if (messagesResult.error) throw messagesResult.error;
        if (dmResult.error) throw dmResult.error;

        // Combine and sort results by similarity score
        const allMessages = [...(messagesResult.data || []), ...(dmResult.data || [])];
        const messageMap = new Map(allMessages.map(m => [m.id, m]));
        
        // Sort messages based on the order from vector search
        const sortedMessages = vectorResults
          .filter(r => messageMap.has(r.message_id))
          .map(r => messageMap.get(r.message_id));

        setSemanticResults(sortedMessages);
      } catch (error) {
        console.error('Error fetching semantic results:', error);
        setSemanticResults([]);
      } finally {
        setLoadingSemanticResults(false);
      }
    };

    fetchSemanticResults();
  }, [query, workspaceId, currentUser, results]);

  const renderMessagePreview = (message) => {
    const isDirectMessage = !message.channel_id;
    const isThreadReply = Boolean(message.parent_message_id);

    return (
      <ListItem
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 1,
          p: 2,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'grey.50',
          },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        onClick={() => onMessageClick(message)}
      >
        {/* Context line */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            width: '100%',
          }}
        >
          {isDirectMessage ? (
            <>
              <Avatar 
                sx={{ 
                  width: 20, 
                  height: 20, 
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  bgcolor: getAvatarColor(message.recipient_id),
                  fontWeight: 700
                }}
              >
                {message.recipient?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2">
                Direct message with {message.recipient?.name}
              </Typography>
            </>
          ) : (
            <>
              <TagIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2">
                #{message.channel?.name}
              </Typography>
            </>
          )}
          {isThreadReply && (
            <Tooltip title="Reply in thread">
              <IconButton size="small" sx={{ ml: 'auto' }}>
                <ChatBubbleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Message content */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Avatar 
            sx={{ 
              width: 28, 
              height: 28, 
              fontSize: '0.875rem',
              borderRadius: 1.2,
              bgcolor: getAvatarColor(message.sender_id),
              fontWeight: 700
            }}
          >
            {message.sender?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {message.sender?.name}
                <Typography variant="caption" color="text.secondary" sx={{ pt: '2px' }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Typography>
              </Typography>
            </Box>
            <Typography
              variant="body2"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
            {message.attachments?.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Search Results for "{query}"
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {results.length} exact match{results.length !== 1 ? 'es' : ''}{' '}
          {semanticResults.length > 0 && `• ${semanticResults.length} similar message${semanticResults.length !== 1 ? 's' : ''}`}
        </Typography>
      </Box>

      {/* Results List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {/* Exact Matches */}
        {results.length > 0 && results.map(renderMessagePreview)}

        {/* Semantic Results */}
        {semanticResults.length > 0 && (
          <>
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="overline" color="text.secondary">
                Similar Messages
              </Typography>
            </Box>
            {semanticResults.map(renderMessagePreview)}
          </>
        )}

        {/* Loading State */}
        {(loading || loadingSemanticResults) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No Results State */}
        {!loading && !loadingSemanticResults && results.length === 0 && semanticResults.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No messages found matching your search.
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
} 