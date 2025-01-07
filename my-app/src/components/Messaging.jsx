import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import './Messaging.css'; // Import custom styles

export default function Messaging({ channelId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
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
  }, [channelId]);

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
      channel_id: channelId,
      sender_id: user.id,
      content: newMessage,
    };

    const { error } = await supabase
      .from("messages")
      .insert([messageData]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage("");
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
          <div key={msg.id} style={{ marginBottom: '12px' }}>
            <strong>{msg.users?.name || 'Unknown User'}</strong>: <span dangerouslySetInnerHTML={{ __html: msg.content }} />
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
            theme="snow"
            value={newMessage}
            onChange={setNewMessage}
            placeholder="Type your message..."
          />
          <button className="send-button" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}