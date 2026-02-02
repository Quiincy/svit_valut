import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, User } from 'lucide-react';

// Generate unique chat ID
const getChatId = () => {
  let chatId = localStorage.getItem('chatId');
  if (!chatId) {
    chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatId', chatId);
  }
  return chatId;
};

// Get/save chat messages from localStorage
const getChatMessages = (chatId) => {
  try {
    const stored = localStorage.getItem(`chat_messages_${chatId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveChatMessages = (chatId, messages) => {
  localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(messages));
  // Also save to global chats list for admin
  const allChats = getAllChats();
  const existingIndex = allChats.findIndex(c => c.id === chatId);
  const chatData = {
    id: chatId,
    lastMessage: messages[messages.length - 1]?.text || '',
    lastTime: messages[messages.length - 1]?.time || new Date().toISOString(),
    unread: messages.filter(m => m.from === 'customer' && !m.read).length,
    customerName: localStorage.getItem('chatCustomerName') || 'Гість',
  };
  if (existingIndex >= 0) {
    allChats[existingIndex] = chatData;
  } else {
    allChats.push(chatData);
  }
  localStorage.setItem('allChats', JSON.stringify(allChats));
};

export const getAllChats = () => {
  try {
    return JSON.parse(localStorage.getItem('allChats') || '[]');
  } catch {
    return [];
  }
};

export const getChatById = (chatId) => {
  return getChatMessages(chatId);
};

export const sendOperatorMessage = (chatId, text) => {
  const messages = getChatMessages(chatId);
  messages.push({
    id: Date.now(),
    from: 'operator',
    text,
    time: new Date().toISOString(),
  });
  saveChatMessages(chatId, messages);
};

export default function LiveChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const chatId = getChatId();

  useEffect(() => {
    const savedName = localStorage.getItem('chatCustomerName');
    if (savedName) {
      setCustomerName(savedName);
      setNameSubmitted(true);
    }
    
    const savedMessages = getChatMessages(chatId);
    setMessages(savedMessages);

    // Poll for new messages
    const interval = setInterval(() => {
      const updated = getChatMessages(chatId);
      setMessages(updated);
    }, 2000);

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      from: 'customer',
      text: input.trim(),
      time: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveChatMessages(chatId, updatedMessages);
    setInput('');
  };

  const handleNameSubmit = () => {
    if (!customerName.trim()) return;
    localStorage.setItem('chatCustomerName', customerName.trim());
    setNameSubmitted(true);
    
    // Send welcome message
    const welcomeMessage = {
      id: Date.now(),
      from: 'operator',
      text: `Привіт, ${customerName.trim()}! Чим можу допомогти?`,
      time: new Date().toISOString(),
      auto: true,
    };
    const updatedMessages = [welcomeMessage];
    setMessages(updatedMessages);
    saveChatMessages(chatId, updatedMessages);
  };

  if (!isOpen) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <MessageSquare className="w-6 h-6 text-primary" />
        {messages.filter(m => m.from === 'operator' && !m.read).length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
            !
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[350px] max-w-[calc(100vw-32px)] bg-primary-light rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div className="bg-accent-yellow p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold">
            $
          </div>
          <div>
            <div className="font-bold text-primary">Світ Валют</div>
            <div className="text-xs text-primary/70">Онлайн підтримка</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMinimized(true)} className="p-2 hover:bg-primary/10 rounded-lg text-primary">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-lg text-primary">
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
                  className={`flex ${msg.from === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.from === 'customer'
                        ? 'bg-accent-yellow text-primary rounded-br-sm'
                        : 'bg-primary border border-white/10 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.from === 'customer' ? 'text-primary/60' : 'text-text-secondary'}`}>
                      {new Date(msg.time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Напишіть повідомлення..."
                className="flex-1 px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="p-3 bg-accent-yellow rounded-xl text-primary hover:opacity-90 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
