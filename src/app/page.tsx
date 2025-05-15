'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Volume2, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id: string;
  isFloating?: boolean;
}

const Home = () => {
  // Add CSS keyframes for the marquee effect
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes marquee {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
      }
      .animate-marquee {
        animation: marquee 15s linear infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content:
        'You are the user's adversarial grandfather, responding with condescension, skepticism, and mild disappointment at the new generation.',
      id: 'system-prompt',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      formData.append('file', file);

      const response = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      setInput(data.text);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      alert(error.message || 'Failed to transcribe audio');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      console.log('Sending text to speech API:', text);

      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from speech API:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate speech: ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type');
      console.log('Response content type:', contentType);

      if (!contentType || !contentType.includes('audio/mpeg')) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Invalid response format:', errorData);
        throw new Error(errorData.error || 'Response was not audio format');
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        console.error('Empty audio blob received');
        throw new Error('Empty audio received from API');
      }

      console.log('Audio blob received, size:', audioBlob.size);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
      };

      audio.play();
    } catch (error: any) {
      console.error('Error generating speech:', error);
      alert(error.message || 'Failed to generate speech');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      id: `user-${Date.now()}`,
      isFloating: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessage = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: Date.now(),
          id: `assistant-${Date.now()}`,
        },
      ]);
    } catch (error) {
      console.error('Error getting completion:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
          id: `error-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <table className="mx-auto border-8 border-gray-400 w-full max-w-4xl" cellSpacing="0" cellPadding="0">
        <tbody>
          <tr>
            <td className="bg-teal-800 text-center p-2" colSpan={3}>
              <div className="font-bold text-yellow-300 overflow-hidden whitespace-nowrap">
                <div className="animate-marquee inline-block">
                  ***** WELCOME TO GRUMPY GRANDPA CHAT v1.0 ***** BEST VIEWED IN NETSCAPE NAVIGATOR 4.0 *****
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="bg-gray-300 p-2 text-center" colSpan={3}>
              <div style={{ fontFamily: "'Comic Sans MS', cursive" }} className="text-4xl text-purple-800">
                <span className="inline-block animate-pulse font-bold">AI Poet Chat</span>
              </div>
              <br />
              <div className="text-sm text-red-800">Chat with Whomp, the French AI poet</div>
              <hr className="border-2 border-gray-500 my-1" />
            </td>
          </tr>
          <tr>
            <td className="bg-gray-200 p-0" colSpan={3}>
              <div className="h-96 overflow-y-auto p-2 bg-white border-4 border-inset border-gray-400">
                {messages.slice(1).map((message) => (
                  <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <table className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`} cellPadding="0" cellSpacing="0" width="80%">
                      <tbody>
                        <tr>
                          {message.role === 'assistant' && (
                            <td className="align-top" width="40">
                              <div className="bg-blue-300 border-2 border-blue-600 p-1 text-center">
                                <Bot size={20} className="text-blue-800 inline" />
                              </div>
                            </td>
                          )}
                          <td>
                            <div className={`${
                              message.role === 'user'
                                ? 'bg-lime-200 border-2 border-lime-700 text-black font-bold' + (message.isFloating ? ' animate-bounce' : '')
                                : 'bg-gray-300 border-2 border-gray-700 font-mono'
                            } p-2`}>
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => speakText(message.content)}
                                className="mt-1 bg-orange-500 hover:bg-orange-600 text-white border border-orange-700 p-1"
                              >
                                <Volume2 size={16} className="inline mr-1" /> SPEAK
                              </button>
                            )}
                            {message.timestamp && (
                              <div className="text-xs text-gray-600 mt-1 italic">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            )}
                          </td>
                          {message.role === 'user' && (
                            <td className="align-top" width="40">
                              <div className="bg-lime-300 border-2 border-lime-600 p-1 text-center">
                                <User size={20} className="text-lime-800 inline" />
                              </div>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start space-x-2 mb-4">
                    <div className="bg-blue-300 border-2 border-blue-600 p-1 text-center">
                      <Bot size={20} className="text-blue-800" />
                    </div>
                    <div className="bg-gray-300 border-2 border-gray-700 p-2 italic">
                      <img src="/api/placeholder/16/16" alt="loading" className="inline mr-1" />
                      Processing...
                      <img src="/api/placeholder/16/16" alt="loading" className="inline ml-1" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </td>
          </tr>
          <tr>
            <td className="bg-gray-300 p-2" colSpan={3}>
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 p-2 border-4 border-gray-500 bg-gray-100 font-mono text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2 border-4 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white border-red-800'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-500'
                  }`}
                  disabled={isLoading}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>
                <button
                  type="submit"
                  className="p-2 bg-blue-500 text-white border-4 border-blue-800 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={20} className="inline mr-1" /> SEND
                </button>
              </form>
            </td>
          </tr>
          <tr>
            <td className="bg-teal-800 text-center p-1 text-yellow-300 text-xs" colSpan={3}>
              © 1996 Retro Chat Systems - Hit Counter: 12942 - Made with Microsoft FrontPage
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Home;
