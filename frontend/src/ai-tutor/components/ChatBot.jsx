import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, generateSpeech } from '../services/gemini';

const ChatBot = ({ profile }) => {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Hi! I'm your adaptive tutor. I've analyzed your learning style profile and I'm ready to help you learn in the way that suits you best. What topic shall we explore today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const messagesEndRef = useRef(null);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Audio Output State
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    // Initialize session on mount
    const session = createChatSession(profile);
    setChatSession(session);

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const decodeAudioData = async (
    data,
    ctx,
    sampleRate = 24000,
    numChannels = 1
  ) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const handleSpeak = async (text, index) => {
    // If already playing this message, stop it
    if (playingMsgId === index) {
      sourceNodeRef.current?.stop();
      setPlayingMsgId(null);
      return;
    }

    // If playing another message, stop it
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      setPlayingMsgId(null);
    }

    try {
      setIsAudioLoading(index);
      
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      
      // Resume if suspended (browser policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioData = await generateSpeech(text);
      
      if (audioData && audioContextRef.current) {
        const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          setPlayingMsgId(null);
        };
        
        sourceNodeRef.current = source;
        source.start(0);
        setPlayingMsgId(index);
      }
    } catch (err) {
      console.error("Error playing audio:", err);
    } finally {
      setIsAudioLoading(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession || isLoading) return;

    const userMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Add placeholder for bot response
      setMessages(prev => [...prev, {
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);

      const result = await chatSession.sendMessageStream({ message: userMessage.text });
      
      let accumulatedText = '';
      
      for await (const chunk of result) {
        const text = chunk?.text;
        if (text) {
          accumulatedText += text;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            // Ensure we are updating the model's message
            if (newMessages[lastMsgIndex].role === 'model') {
              newMessages[lastMsgIndex] = {
                ...newMessages[lastMsgIndex],
                text: accumulatedText
              };
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        const errorText = "Sorry, I encountered an error connecting to my brain. Please check your connection or API key.";
        
        if (lastMsg.role === 'model' && lastMsg.text === '') {
          lastMsg.text = errorText;
        } else {
          newMessages.push({
            role: 'model',
            text: errorText,
            timestamp: Date.now()
          });
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot">
      <div className="chatbot__header">
        <div className="chatbot__header-icon">
          <i className="fas fa-star" />
        </div>
        <div>
          <h3>ApexLearn AI Tutor</h3>
          <p>Powered by gemini-3-pro-preview</p>
        </div>
      </div>

      <div className="chatbot__messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chatbot__message${msg.role === 'user' ? ' is-user' : ''}`}>
            <div className="chatbot__avatar">
              {msg.role === 'user' ? 'Me' : <i className="fas fa-robot" />}
            </div>
            <div className={`chatbot__bubble${msg.role === 'user' ? ' is-user' : ''}`}>
              {msg.text}
              {msg.role === 'model' && isLoading && idx === messages.length - 1 && (
                <span className="chatbot__cursor" />
              )}
              {msg.role === 'model' && msg.text && (!isLoading || idx !== messages.length - 1) && (
                <button
                  type="button"
                  className="chatbot__tts"
                  onClick={() => handleSpeak(msg.text, idx)}
                  disabled={isAudioLoading !== null && isAudioLoading !== idx}
                  title="Listen to response"
                >
                  {isAudioLoading === idx ? (
                    <i className="fas fa-circle-notch fa-spin" />
                  ) : playingMsgId === idx ? (
                    <>
                      <i className="fas fa-stop-circle" />
                      Stop
                    </>
                  ) : (
                    <>
                      <i className="fas fa-volume-up" />
                      Listen
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.text === '' && (
          <div className="chatbot__loading">
            <i className="fas fa-circle-notch fa-spin" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot__input chatbot-theme-locked">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question or tap mic to speak..."
        />
        <div className="chatbot__input-actions">
          {recognitionRef.current && (
            <button
              type="button"
              onClick={toggleListening}
              className={`chatbot__icon-button${isListening ? ' is-listening' : ''}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="chatbot__send-button"
          >
            {isLoading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-paper-plane" />}
          </button>
        </div>
        <p className="chatbot__hint">
          The AI adapts its responses based on your FSLSM profile.
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
