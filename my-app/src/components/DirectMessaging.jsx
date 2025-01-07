import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './Messaging.css';

export default function DirectMessaging({ recipientId, recipientName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messageEndRef = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to new messages - both incoming and outgoing
      const channel = supabase
        .channel(`direct_messages_${recipientId}`)
        // Listen for messages where user is recipient
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_messages',
          filter: `recipient_id=eq.${user.id}` 
        }, handleNewMessage)
        // Listen for messages where user is sender
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_messages',
          filter: `sender_id=eq.${user.id}` 
        }, handleNewMessage)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const handleNewMessage = async (payload) => {
      // Only process messages that are part of this conversation
      if (payload.new.sender_id !== recipientId && payload.new.recipient_id !== recipientId) {
        return;
      }

      // Fetch the complete message data including sender info
      const { data: messageData, error } = await supabase
        .from("user_messages")
        .select(`
          *,
          sender:sender_id (
            name
          )
        `)
        .eq('id', payload.new.id)
        .single();

      if (error) {
        console.error('Error fetching message details:', error);
        return;
      }

      // Only add the message if it's not already in the list
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === messageData.id);
        if (messageExists) return prev;
        return [...prev, messageData];
      });
      scrollToBottom();
    };

    const subscription = setupSubscription();
    return () => {
      subscription.then(cleanup => cleanup?.());
    };
  }, [recipientId, recipientName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch messages where the current user is either sender or recipient
    const { data, error } = await supabase
      .from("user_messages")
      .select(`
        *,
        sender:sender_id (
          name
        ),
        recipient:recipient_id (
          name
        )
      `)
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data);
    }
  }

  async function sendMessage() {
    if (newMessage.trim() === "") return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return;
    }

    const messageData = {
      sender_id: user.id,
      recipient_id: recipientId,
      content: newMessage,
    };

    const { data, error } = await supabase
      .from("user_messages")
      .insert([messageData])
      .select(`
        *,
        sender:sender_id (
          name
        ),
        recipient:recipient_id (
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
    } else {
      // Immediately add the new message to the messages array
      setMessages(prev => [...prev, data]);
      setNewMessage("");
      scrollToBottom();
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} className="message-container">
            <div className="message-header">
              <div className="message-user-info">
                <div className="message-avatar">
                  {msg.sender?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="message-name">{msg.sender?.name || 'Unknown User'}</span>
              </div>
              <span className="message-timestamp">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="message-content">
              <span dangerouslySetInnerHTML={{ __html: msg.content }} />
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
        <div className="editor-container">
          <ReactQuill
            key={recipientId}
            theme="snow"
            value={newMessage}
            onChange={setNewMessage}
            placeholder={`Message ${recipientName || '...'}`}
          />
          <button className="send-button" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
} 