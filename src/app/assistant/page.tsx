"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, Image as ImageIcon, Mic, X, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function AssistantPage() {
  const [language, setLanguage] = useState<'ta' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('farmer_assistant_lang');
      return (saved === 'en' || saved === 'ta') ? saved : 'ta';
    }
    return 'ta';
  });

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: language === 'ta' 
            ? 'வணக்கம்! நான் உங்கள் விவசாய உதவியாளர். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?' 
            : 'Hello! I am your Farmer Assistant. How can I help you today?' 
        }
      ]);
    }
  }, [language]);

  useEffect(() => {
    localStorage.setItem('farmer_assistant_lang', language);
  }, [language]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setInput(prev => prev + event.results[i][0].transcript);
            }
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const t = {
    ta: {
      title: 'விவசாய உதவியாளர்',
      subtitle: 'விவசாயம் & பண்ணை நிபுணர்',
      placeholder: 'கேள்வி கேளுங்கள்...',
      send: 'அனுப்பு',
      voiceSoon: 'குரல் உள்ளீடு விரைவில் வரும்!',
      error: 'மன்னிக்கவும், என்னால் இப்போது பதிலளிக்க முடியவில்லை.',
      upload: 'படம் பதிவேற்று'
    },
    en: {
      title: 'AI Assistant',
      subtitle: 'Agriculture & Farming Expert',
      placeholder: 'Ask a question...',
      send: 'Send',
      voiceSoon: 'Voice input coming soon!',
      error: 'Sorry, I cannot respond right now.',
      upload: 'Upload Image'
    }
  }[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ta' ? 'en' : 'ta');
    stopSpeaking();
  };

  const speak = (text: string, lang: 'ta' | 'en') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    stopSpeaking();
    
    // Clean text: remove markdown bold (**), italics (*), and other symbols
    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.lang = targetLang;

    // Try to find a matching voice
    let voice = voices.find(v => v.lang === targetLang) || 
                voices.find(v => v.lang.startsWith(lang));
    
    // Fallback: If no Tamil voice found, look for any voice with 'Tamil' in the name
    if (!voice && lang === 'ta') {
      voice = voices.find(v => v.name.includes('Tamil'));
    }

    if (voice) {
      utterance.voice = voice;
      console.log(`Speaking with voice: ${voice.name} (${voice.lang})`);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input || (selectedImage ? (language === 'ta' ? 'படம் பதிவேற்றப்பட்டது' : 'Image uploaded') : ''),
      image: selectedImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput('');
    clearImage();
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          image: currentImage,
          language: language
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMessage: Message = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, assistantMessage]);

      if (autoPlay) {
        speak(data.message, language);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: t.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white p-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:bg-green-600 p-2 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-tamil">{t.title}</h1>
            <p className="text-xs text-green-100">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-green-800/50 p-1 rounded-xl border border-green-700/50">
            <button 
              onClick={() => { setLanguage('ta'); stopSpeaking(); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${language === 'ta' ? 'bg-green-600 text-white shadow-lg' : 'text-green-300 hover:text-white'}`}
            >
              தமிழ்
            </button>
            <button 
              onClick={() => { setLanguage('en'); stopSpeaking(); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${language === 'en' ? 'bg-green-600 text-white shadow-lg' : 'text-green-300 hover:text-white'}`}
            >
              English
            </button>
          </div>
          <button 
            onClick={() => setAutoPlay(!autoPlay)}
            className={`p-2.5 rounded-xl border transition-all ${autoPlay ? 'bg-green-600 border-green-400 text-white' : 'bg-green-800/50 border-green-700 text-green-300'}`}
            title={autoPlay ? "Auto-play On" : "Auto-play Off"}
          >
            {autoPlay ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm flex flex-col gap-2 ${
              m.role === 'user' 
                ? 'bg-green-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              <div className="flex gap-3">
                <div className={`mt-1 shrink-0 ${m.role === 'user' ? 'order-last' : 'order-first'}`}>
                  {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-green-600" />}
                </div>
                  <div className="flex flex-col gap-2 relative group">
                    {m.role === 'assistant' && (
                      <button 
                        onClick={() => speak(m.content, language)}
                        className="absolute -right-2 -top-2 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:bg-green-50"
                        title="Speak"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                    {m.image && (
                      <img src={m.image} alt="Uploaded" className="max-w-full h-auto rounded-lg border border-white/20" />
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-green-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
              <Bot className="w-5 h-5 text-green-600" />
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-green-100 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {imagePreview && (
          <div className="max-w-4xl mx-auto mb-3 relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-green-500 shadow-lg" />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-green-100 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-400 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors"
            title="Upload Image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button 
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-green-600 hover:bg-green-100'}`}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'ta' ? 'கேள்வி கேளுங்கள்...' : 'Ask a question...'}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400 text-sm py-2 px-1 outline-none font-medium"
          />

          <button 
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className={`p-2 rounded-xl transition-all ${
              isLoading || (!input.trim() && !selectedImage) 
                ? 'text-gray-300' 
                : 'bg-green-700 text-white shadow-sm hover:bg-green-800 active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">
          Powered by Smart Farmer AI • Indian Agriculture Focus
        </p>
      </div>
    </div>
  );
}



