import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn } from '@/src/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
  label?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscript, 
  lang = 'ta-IN', 
  className,
  label
}) => {
  const [isListening, setIsListening] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert(t('Microphone access was denied. Please go to your phone settings > Apps > [App Name] > Permissions and allow Microphone access.'));
        } else {
          alert(`${t('Speech Recognition Error')}: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  if (!browserSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 shadow-sm border",
        isListening 
          ? "bg-red-500 text-white border-red-400 animate-pulse shadow-red-200" 
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
        className
      )}
      title={label || t('Tamil Voice')}
    >
      {isListening ? (
        <>
          <X size={12} className="animate-spin" />
          <span>{t('Stop')}</span>
        </>
      ) : (
        <>
          <Mic size={12} className={cn(isListening ? "text-white" : "text-emerald-600")} />
          <span>{label || t('Tamil Voice')}</span>
        </>
      )}
    </button>
  );
};
