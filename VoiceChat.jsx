import React, { useState } from 'react';

const VoiceChat = () => {
  const [userText, setUserText] = useState('');
  const [botReply, setBotReply] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'tr-TR';
  recognition.continuous = false;

  recognition.onstart = () => setIsListening(true);
  recognition.onend = () => setIsListening(false);

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    setUserText(transcript);

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript }),
      });

      const data = await response.json();
      const reply = data.response || data.error;
      setBotReply(reply);
      speak(reply);
    } catch (error) {
      console.error('Gemini API hatası:', error);
      setBotReply('Hata oluştu.');
    }
  };

  const startListening = () => {
    try {
      recognition.start();
    } catch (e) {
      console.error('Mikrofon başlatılamadı:', e);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>🎙️ Sesli Gemini Chat</h2>
      <button onClick={startListening} disabled={isListening}>
        {isListening ? 'Dinleniyor...' : 'Konuşmaya Başla'}
      </button>

      <div style={{ marginTop: '1rem' }}>
        <p><strong>Kullanıcı:</strong> {userText}</p>
        <p><strong>Gemini:</strong> {botReply}</p>
      </div>
    </div>
  );
};

export default VoiceChat;
