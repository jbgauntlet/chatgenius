/**
 * Embeddings Utility Module
 * 
 * Provides functions for generating and managing text embeddings using OpenAI's API.
 * Used for semantic search and AI-powered features in the application.
 */

import { supabase } from '../supabaseClient';

/**
 * Generates an embedding vector for a given text using OpenAI's text-embedding-3-small model
 * 
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} A promise that resolves to the embedding vector
 * @throws {Error} If the OpenAI API request fails
 */
export async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const result = await response.json();
  return result.data[0].embedding;
}

/**
 * Generates an embedding for a message with rich context including sender, recipient,
 * channel, workspace, and parent message information.
 * 
 * @param {Object} params - The parameters for generating the message embedding
 * @param {string} params.messageId - The ID of the message
 * @param {string} params.content - The message content
 * @param {string} params.workspaceId - The ID of the workspace
 * @param {string} params.senderId - The ID of the message sender
 * @param {string} params.senderName - The name of the message sender
 * @param {string} [params.channelName] - The name of the channel (for channel messages)
 * @param {string} params.workspaceName - The name of the workspace
 * @param {string} params.timestamp - The message timestamp
 * @param {string} [params.parentMessageContent] - The content of the parent message (for replies)
 * @param {string} [params.recipientId] - The ID of the message recipient (for DMs)
 * @param {string} [params.recipientName] - The name of the message recipient (for DMs)
 * @returns {Promise<void>}
 */
export async function generateMessageEmbedding({
  messageId,
  content,
  workspaceId,
  senderId,
  senderName,
  channelName,
  workspaceName,
  timestamp,
  parentMessageContent,
  recipientId,
  recipientName
}) {
  try {
    // Build rich context string for better semantic understanding
    const contextString = `
      Sender: ${senderName || 'Unknown'}
      ${recipientName ? `Recipient: ${recipientName || 'Unknown'}` : ''}
      Channel: ${channelName || 'Direct Message'}
      Workspace: ${workspaceName || 'Unknown'}
      Timestamp: ${timestamp}
      ${parentMessageContent ? `Parent Message: ${parentMessageContent}` : ''}
      Message: ${content}
    `.trim();

    // Generate and store embedding using Edge Function
    const { data, error } = await supabase.functions.invoke('generate_embeddings', {
      body: {
        message_id: messageId,
        content: contextString,
        workspace_id: workspaceId,
        sender_id: senderId,
        recipient_id: recipientId
      },
    });

    if (error) {
      throw new Error('Failed to generate embeddings: ' + error.message);
    }

    return data;
  } catch (error) {
    console.error('Error generating message embedding:', error);
    // Don't throw the error - we don't want to break the messaging flow
    // if embedding generation fails
  }
} 