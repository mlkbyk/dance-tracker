import React, { useRef, useState, useEffect } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

function MouseTrail() {
  const [dots, setDots] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setDots((dots) => {
        const newDots = [...dots, { x: e.clientX, y: e.clientY, id: Date.now() }];
        if (newDots.length > 20) newDots.shift();
        return newDots;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex: 9999 }}>
      {dots.map(dot => (
        <span
          key={dot.id}
          style={{
            position: 'fixed',
            left: dot.x - 8,
            top: dot.y - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,255,255,0.3)',
            filter: 'blur(4px)',
            pointerEvents: 'none',
            animation: 'fadeOutTrail 1s forwards',
            animationTimingFunction: 'ease-out',
          }}
        />
      ))}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      stroke="#00ffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [music] = useState(new Audio('https://www.bensound.com/bensound-music/bensound-happyrock.mp3'));
  const [musicMuted, setMusicMuted] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hoş geldin! Sana Zeybek dansında yardımcı olacağım.' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [selectedDance, setSelectedDance] = useState('Zeybek');
  const latestPose = useRef(null);

  // Müzik kontrolü
  useEffect(() => {
    music.loop = true;
    music.volume = 0.5;

    if (started && !musicMuted) {
      music.play().catch(() => {
        console.log("Otomatik müzik oynatılamadı, kullanıcı etkileşimi gerekli.");
      });
    } else {
      music.pause();
    }

    return () => {
      music.pause();
    };
  }, [started, musicMuted, music]);

  // Mediapipe ve kamera kurulumu
  useEffect(() => {
    if (!started) return;
    if (!videoRef.current) return;

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      latestPose.current = results.poseLandmarks;
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
    };
  }, [started, videoRef]);

  // Anlık poz verisini backend'e gönderme (2 saniyede bir)
  useEffect(() => {
    if (!started) return;

    const interval = setInterval(async () => {
      if (!latestPose.current) return;

      try {
        const response = await fetch("http://127.0.0.1:5000/evaluate_pose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pose: latestPose.current }),
        });

        if (!response.ok) throw new Error("Sunucu hatası");

        const data = await response.json();

        setChatMessages(prev => {
          // Aynı mesaj tekrar eklenmesin diye basit kontrol
          if (prev.some(m => m.text === data.feedback)) return prev;
          return [...prev, { sender: 'bot', text: data.feedback }];
        });
      } catch (error) {
        console.error("Poz gönderme hatası:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [started]);

  const startDance = () => {
    if (started) return;
    setStarted(true);
    setMusicMuted(false);
  };

  // Kullanıcı mesajı gönderme
  const handleSend = () => {
    if (!userInput.trim()) return;
    setChatMessages([...chatMessages, { sender: 'user', text: userInput }]);
    setUserInput('');

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Bunu Gemini API ile analiz edeceğim. Şimdilik not aldım.' }]);
    }, 600);
  };

  return (
    <div className="app-container interactive-bg" style={{ position: 'relative' }}>
      <MouseTrail />

      <div className="navbar">
        <h2 className="logo">🩰 AI Dans Eğitmeni</h2>

        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Hangi dansla başlamak istersin? (örn. Zeybek)"
            className="dance-input"
            onChange={(e) => setSelectedDance(e.target.value)}
            value={selectedDance}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div className="music-controls">
          <button onClick={() => setMusicMuted(!musicMuted)}>
            {musicMuted ? 'Müziği Aç' : 'Müziği Kapat'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            defaultValue={0.5}
            onChange={(e) => { music.volume = parseFloat(e.target.value); }}
          />
        </div>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: '#00ffff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 0 10px #00ffff',
          zIndex: 10000,
        }}
        aria-label="Chatbot aç/kapa"
        title="Chatbot"
      >
        <ChatIcon />
      </button>

      {chatOpen && (
        <div
          className="chatbot-box"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#222',
            color: '#0ff',
            borderRadius: '10px',
            padding: '10px',
            zIndex: 10001,
          }}
        >
          <div className="chat-header" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <ChatIcon />
            <span style={{ marginLeft: '8px' }}>Chatbot</span>
          </div>
          <div className="chat-messages" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '6px',
                  textAlign: msg.sender === 'bot' ? 'left' : 'right',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: msg.sender === 'bot' ? '#004d4d' : '#00cccc',
                    color: '#fff',
                    maxWidth: '80%',
                    wordWrap: 'break-word',
                    fontSize: '14px',
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
          <div className="chat-input" style={{ marginTop: '8px', display: 'flex' }}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Bir şey sor..."
              style={{ flexGrow: 1, padding: '6px 8px', borderRadius: '6px 0 0 6px', border: 'none', outline: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <button
              onClick={handleSend}
              style={{ padding: '6px 12px', borderRadius: '0 6px 6px 0', border: 'none', backgroundColor: '#00cccc', color: '#000', cursor: 'pointer' }}
            >
              Gönder
            </button>
          </div>
        </div>
      )}

      {!started && (
        <div className="start-screen zoom-in" style={{ textAlign: 'center', marginTop: '150px' }}>
          <h1 className="title">Bugün {selectedDance} dansı yapıyoruz!</h1>
          <button className="start-button" onClick={startDance}>Dansa Başla</button>
        </div>
      )}

      {started && (
        <div className="video-section" style={{ marginTop: '20px', textAlign: 'center' }}>
          <video
            ref={videoRef}
            className="video-active"
            autoPlay
            muted
          />
        </div>
      )}
    </div>
  );
}
