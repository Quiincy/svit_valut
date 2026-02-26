import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, User } from 'lucide-react';
import { chatService } from '../services/api';

// Generate unique chat ID
const getChatId = () => {
  let chatId = localStorage.getItem('chatId');
  if (!chatId) {
    chatId = crypto.randomUUID();
    localStorage.setItem('chatId', chatId);
  }
  return chatId;
};

export default function LiveChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const chatId = getChatId();
  const pollIntervalRef = useRef(null);

  // Chat availability — 08:00–20:00 Kyiv time
  const isChatAvailable = () => {
    const now = new Date();
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
    return totalMinutes >= 480 && totalMinutes <= 1200;
  };
  const chatOnline = isChatAvailable();

  useEffect(() => {
    const savedName = localStorage.getItem('chatCustomerName');
    if (savedName) {
      setCustomerName(savedName);
      setNameSubmitted(true);
    }

    // Only fetch and poll if the chat is actually open
    if (!isOpen) return;

    // Initialize session on backend
    chatService.initSession({ session_id: chatId }).catch(console.error);

    fetchMessages();
    pollIntervalRef.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [chatId, isOpen]);

  const fetchMessages = async () => {
    try {
      const res = await chatService.getMessages(chatId);
      if (res && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const messageContent = input.trim();
    setInput('');

    // Optimistic update
    const newMessage = {
      id: Date.now(),
      sender: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      await chatService.sendMessage(chatId, { sender: 'user', content: messageContent });
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleNameSubmit = async () => {
    if (!customerName.trim()) return;
    localStorage.setItem('chatCustomerName', customerName.trim());
    setNameSubmitted(true);

    // Instead of local fake welcome message, we send a system-like automated first message 
    // to give the admin the user's name, or we can just send it as a regular message from the user.
    try {
      await chatService.sendMessage(chatId, {
        sender: 'user',
        content: `👋 Привіт! Мене звати ${customerName.trim()}.\n(Користувач розпочав чат)`
      });
      fetchMessages();
    } catch (err) {
      console.error('Error sending welcome ping:', err);
    }
  };

  if (!isOpen) return null;

  if (minimized) {
    const unreadAdminCount = messages.filter(m => m.sender === 'admin' && !m.is_read).length;
    return (
      <button
        onClick={() => setMinimized(false)}
        aria-label="Відкрити чат"
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <MessageSquare className="w-6 h-6 text-primary" />
        {unreadAdminCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
            {unreadAdminCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed z-[100] bg-primary-light border-white/10 shadow-2xl overflow-hidden flex flex-col
      inset-0 w-full h-full rounded-none border-0
      lg:inset-auto lg:bottom-4 lg:right-4 lg:w-[350px] lg:h-[500px] lg:rounded-2xl lg:border lg:max-h-[calc(100vh-100px)]"
    >
      {/* Header */}
      <div className="bg-accent-yellow p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold">
            $
          </div>
          <div>
            <div className="font-bold text-primary">Світ Валют</div>
            <div className={`text-xs ${chatOnline ? 'text-primary/70' : 'text-red-600/70'}`}>
              {chatOnline ? 'Онлайн підтримка' : 'Не в мережі (08:00–20:00)'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMinimized(true)} className="p-2 hover:bg-primary/10 rounded-lg text-primary" aria-label="Мінімізувати чат">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-lg text-primary" aria-label="Закрити чат">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Name Input Step */}
      {!nameSubmitted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-accent-yellow/20 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-accent-yellow" />
          </div>
          <h3 className="text-lg font-bold mb-2">Вітаємо!</h3>
          <p className="text-sm text-text-secondary text-center mb-4">
            Як до вас звертатися?
          </p>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Ваше ім'я"
            aria-label="Ваше ім'я"
            className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center mb-4"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            disabled={!customerName.trim()}
            className="w-full py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90 disabled:opacity-50"
          >
            Почати чат
          </button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-8">
                Напишіть нам, і ми відповімо якнайшвидше!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.sender === 'user'
                      ? 'bg-accent-yellow text-primary rounded-br-sm'
                      : 'bg-primary border border-white/10 rounded-bl-sm text-white'
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary/60' : 'text-text-secondary'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            {chatOnline ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Напишіть повідомлення..."
                  aria-label="Напишіть повідомлення"
                  className="flex-1 px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-sm text-white"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="p-3 bg-accent-yellow rounded-xl text-primary hover:opacity-90 disabled:opacity-50"
                  aria-label="Надіслати повідомлення">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-gray-400">Чат працює щодня з 08:00 до 20:00</p>
                <p className="text-xs text-gray-500 mt-1">Залиште повідомлення і ми відповімо вранці</p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Залишити повідомлення..."
                    aria-label="Напишіть повідомлення"
                    className="flex-1 px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-sm text-white"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    aria-label="Надіслати повідомлення"
                    className="p-3 bg-accent-yellow/60 rounded-xl text-primary hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
