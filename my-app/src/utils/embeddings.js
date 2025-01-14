import { supabase } from '../supabaseClient';

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

export async function generateMessageEmbedding(messageId, content, workspaceId, senderId) {
  try {
    const { data, error } = await supabase.functions.invoke('generate_embeddings', {
      body: {
        message_id: messageId,
        content: content,
        workspace_id: workspaceId,
        sender_id: senderId,
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