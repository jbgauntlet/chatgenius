import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import './Messaging.css'; // Import custom styles

export default function Messaging({ channelId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData || !userData.user) {
      console.error('Error fetching user:', userError);
      return;
    }

    const userId = userData.user.id;
    console.log(userData);
    console.log('Sending message with sender_id:', userId);
    console.log({
        channel_id: channelId,
        sender_id: userData.id,
        content: newMessage,
      });

    const { error } = await supabase.from("messages").insert([
      {
        channel_id: channelId,
        sender_id: userId,
        content: newMessage,
      },
    ]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage("");
    }
  }

  return (
    <div>
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender_id}</strong>: <span dangerouslySetInnerHTML={{ __html: msg.content }} />
          </div>
        ))}
      </div>
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
  );
}