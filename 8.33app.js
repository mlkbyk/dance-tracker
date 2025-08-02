import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

const songSources = [
  'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
  'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3',
  'https://www.bensound.com/bensound-music/bensound-funkyelement.mp3',
];

const videoSources = [
  '/videos/dance1.mp4',
  '/videos/dance2.mp4',
  '/videos/dance3.mp4',
  '/videos/dance4.mp4',
  '/videos/dance5.mp4',
  '/videos/dance6.mp4',
];

// YORUM: JSON verileri artık doğrudan kodun içine yerleştirildi.
// Bu, harici bir dosya yükleme ihtiyacını ortadan kaldırır.
const hardcodedReferenceData = {
  // ÖRNEK VERİ: Kendi JSON verilerinizi buraya ekleyebilirsiniz.
  // Bu yapı, her bir video için poz verilerini içerir.
  dance1: [
    { frame: 0, landmarks: [{ x: 0.5, y: 0.5, z: 0 }, { x: 0.4, y: 0.4, z: 0 }, /* ...diğer eklemler... */] },
    { frame: 1, landmarks: [{ x: 0.51, y: 0.51, z: 0 }, { x: 0.41, y: 0.41, z: 0 }, /* ...diğer eklemler... */] },
    // ...daha fazla kare verisi...
  ],
  dance2: [
    // ...ikinci video için veri...
  ],
  dance3: [
    // ...üçüncü video için veri...
  ],
  dance4: [
    // ...dördüncü video için veri...
  ],
  dance5: [
    // ...beşinci video için veri...
  ],
  dance6: [
    // ...altıncı video için veri...
  ],
};

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
  const userVideoRef = useRef(null);
  const userCanvasRef = useRef(null);
  const refVideoRef = useRef(null);
  const refCanvasRef = useRef(null);

  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [accuracy, setAccuracy] = useState(0);
  const [geminiFeedback, setGeminiFeedback] = useState('');
  const [referenceIdealSegments, setReferenceIdealSegments] = useState(hardcodedReferenceData);

  // YORUM: JSON verileri koda gömüldüğü için artık bir yükleme durumu yok.
  const isLoadingReferenceData = false;

  const latestUserPose = useRef(null);
  const latestRefPose = useRef(null);

  const userPoseInstance = useRef(null);
  const userCameraInstance = useRef(null);
  const refPoseInstance = useRef(null);
  const refVideoAnimationFrameId = useRef(null);

  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [music] = useState(new Audio(songSources[currentSongIndex]));
  const [musicMuted, setMusicMuted] = useState(true);

  const [refVideoRate, setRefVideoRate] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{
    sender: 'bot', text: 'Hoş geldin! Sana HipHop dansında yardımcı olacağım.'
  }]);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    setChatMessages((prev) => [...prev, {
      sender: 'bot',
      text: 'Uygulama hazır! Dansa başlamak için "Dansa Başla" butonuna tıkla.'
    }]);
  }, []);

  // YORUM: JSON verileri koda gömüldüğü için artık bu fonksiyona ihtiyaç kalmadı.
  // const fetchJsonData = useCallback(async (videoName) => {
  //   ...
  // }, []);

  // YORUM: Artık useEffect içinde JSON yüklemeye gerek yok. Veri zaten mevcut.
  // useEffect(() => {
  //   if (started) {
  //     const currentVideoName = videoSources[currentStep - 1].split('/').pop().split('.')[0];
  //     fetchJsonData(currentVideoName);
  //   }
  // }, [started, currentStep, fetchJsonData]);

  const startDance = () => {
    setStarted(true);
    setCurrentStep(1);
    setMusicMuted(false);
    setGeminiFeedback('');
  };

  const skipToNext = () => {
    if (currentStep < videoSources.length) {
      setCurrentStep(currentStep + 1);
      setAccuracy(0);
      setGeminiFeedback('');
    } else {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Tebrikler! Tüm dans adımlarını tamamladınız. Başa dönülüyor.' }]);
      setCurrentStep(1);
      setStarted(false);
    }
  };

  const pauseVideo = () => refVideoRef.current?.pause();
  const playVideo = () => refVideoRef.current?.play();
  const increaseSpeed = () => {
    if (refVideoRef.current) {
      const newRate = Math.min(refVideoRef.current.playbackRate + 0.25, 3);
      refVideoRef.current.playbackRate = newRate;
      setRefVideoRate(newRate);
    }
  };
  const decreaseSpeed = () => {
    if (refVideoRef.current) {
      const newRate = Math.max(refVideoRef.current.playbackRate - 0.25, 0.25);
      refVideoRef.current.playbackRate = newRate;
      setRefVideoRate(newRate);
    }
  };

  const playNextSong = () => {
    const nextIndex = (currentSongIndex + 1) % songSources.length;
    setCurrentSongIndex(nextIndex);
    music.src = songSources[nextIndex];
    if (!musicMuted) music.play().catch(() => console.log("Sonraki şarkı otomatik oynatılamadı."));
  };
  const playPrevSong = () => {
    const prevIndex = (currentSongIndex - 1 + songSources.length) % songSources.length;
    setCurrentSongIndex(prevIndex);
    music.src = songSources[prevIndex];
    if (!musicMuted) music.play().catch(() => console.log("Önceki şarkı otomatik oynatılamadı."));
  };

  const handleSend = async () => {
    if (!userInput.trim()) return;
    const userMessage = userInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setUserInput('');
    setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Cevap bekleniyor...' }]);

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json();
      setChatMessages((prev) => [...prev.slice(0, -1), { sender: 'bot', text: data.response }]);
    } catch (error) {
      console.error("Error fetching chat response:", error);
      setChatMessages((prev) => [...prev.slice(0, -1), { sender: 'bot', text: 'Chatbot yanıtı alınırken bir hata oluştu.' }]);
    }
  };

  useEffect(() => {
    music.loop = true;
    music.volume = 0.5;
    if (started && !musicMuted) {
      music.play().catch(() => console.log("Otomatik müzik oynatılamadı. Kullanıcı etkileşimi gerekebilir."));
    } else {
      music.pause();
    }
    return () => music.pause();
  }, [started, musicMuted, music]);

  useEffect(() => {
    const setupUserCamera = async () => {
      if (userVideoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          userVideoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Kullanıcı kamerasına erişilemedi:", err);
          setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Kameranıza erişilemedi. Lütfen izinleri kontrol edin.' }]);
        }
      }
    };
    if (started) {
      setupUserCamera();
    }
    return () => {
      if (userVideoRef.current?.srcObject) {
        userVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        userVideoRef.current.srcObject = null;
      }
    };
  }, [started]);

  useEffect(() => {
    const setCanvasDimensions = () => {
      if (userVideoRef.current && userCanvasRef.current) {
        userCanvasRef.current.width = userVideoRef.current.videoWidth || 420;
        userCanvasRef.current.height = userVideoRef.current.videoHeight || 465;
      }
      if (refVideoRef.current && refCanvasRef.current) {
        refCanvasRef.current.width = refVideoRef.current.videoWidth || 420;
        refCanvasRef.current.height = refVideoRef.current.videoHeight || 465;
      }
    };

    if (userVideoRef.current) userVideoRef.current.onloadedmetadata = setCanvasDimensions;
    if (refVideoRef.current) refVideoRef.current.onloadedmetadata = setCanvasDimensions;
    setCanvasDimensions();

    const createPoseModel = (onResultsCallback) => {
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
        onResultsCallback(results);
      });
      return pose;
    };

    if (started) {
      if (!userPoseInstance.current) {
        userPoseInstance.current = createPoseModel((results) => latestUserPose.current = results.poseLandmarks);
        userCameraInstance.current = new Camera(userVideoRef.current, {
          onFrame: async () => {
            if (userVideoRef.current?.readyState >= 2) {
              await userPoseInstance.current.send({ image: userVideoRef.current });
            }
          },
          width: 420,
          height: 465,
        });
        userCameraInstance.current.start().catch((err) => console.error("User camera start error:", err));
      }

      if (!refPoseInstance.current) {
        refPoseInstance.current = createPoseModel((results) => latestRefPose.current = results.poseLandmarks);
        const sendRefFrames = async () => {
          if (refVideoRef.current?.readyState >= 2) {
            await refPoseInstance.current.send({ image: refVideoRef.current });
          }
          refVideoAnimationFrameId.current = requestAnimationFrame(sendRefFrames);
        };
        refVideoAnimationFrameId.current = requestAnimationFrame(sendRefFrames);
      }
    }

    return () => {
      const userCamera = userCameraInstance.current;
      const userPose = userPoseInstance.current;
      const refPose = refPoseInstance.current;
      const refAnimFrameId = refVideoAnimationFrameId.current;

      if (userCamera) {
        userCamera.stop();
        userCameraInstance.current = null;
      }
      if (userPose) {
        userPose.close();
        userPoseInstance.current = null;
      }
      if (refAnimFrameId) {
        cancelAnimationFrame(refAnimFrameId);
        refVideoAnimationFrameId.current = null;
      }
      if (refPose) {
        refPose.close();
        refPoseInstance.current = null;
      }
      if (userVideoRef.current) userVideoRef.current.onloadedmetadata = null;
      if (refVideoRef.current) refVideoRef.current.onloadedmetadata = null;
    };
  }, [started]);

  const calculatePoseSimilarity = useCallback((userLandmarks, refLandmarks) => {
    if (!userLandmarks || !refLandmarks || userLandmarks.length !== refLandmarks.length) return 0;
    let totalDistance = 0;
    const importantLandmarkIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    let validLandmarkCount = 0;

    for (const index of importantLandmarkIndices) {
      const userL = userLandmarks[index];
      const refL = refLandmarks[index];
      if (userL && refL && userL.visibility > 0.7 && refL.visibility > 0.7) {
        const dx = userL.x - refL.x;
        const dy = userL.y - refL.y;
        const dz = userL.z ? (userL.z - refL.z) : 0;
        totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        validLandmarkCount++;
      }
    }
    if (validLandmarkCount === 0) return 0;
    const maxPossibleDistancePerLandmark = Math.sqrt(3);
    const maxTotalPossibleDistance = validLandmarkCount * maxPossibleDistancePerLandmark;
    let similarity = 1 - (totalDistance / maxTotalPossibleDistance);
    return Math.floor(Math.max(0, Math.min(1, similarity)) * 100);
  }, []);

  useEffect(() => {
    if (!started || isLoadingReferenceData) return;

    const evaluationInterval = setInterval(async () => {
      const currentVideoName = videoSources[currentStep - 1].split('/').pop().split('.')[0];
      const refIdealSegmentFrames = referenceIdealSegments[currentVideoName];
      const currentRefTime = refVideoRef.current?.currentTime;
      const videoFps = 30;

      if (!latestUserPose.current) {
        setAccuracy(0);
        setGeminiFeedback('Kamerada görünmüyorsunuz. Lütfen doğru şekilde pozisyon alın.');
        return;
      }

      if (!refIdealSegmentFrames || refIdealSegmentFrames.length === 0 || currentRefTime === undefined) {
        setAccuracy(0);
        setGeminiFeedback('Referans dans verisi bulunamadı. Lütfen koda eklenen JSON verilerini kontrol edin.');
        return;
      }

      const currentRefFrameNumber = Math.floor(currentRefTime * videoFps);
      const idealFrameIndex = Math.floor(currentRefFrameNumber % refIdealSegmentFrames.length);
      const relevantReferencePose = refIdealSegmentFrames[idealFrameIndex]?.landmarks;

      if (!relevantReferencePose) {
        setAccuracy(0);
        setGeminiFeedback('Referans pozu bulunamadı. Lütfen videonun oynadığından emin olun.');
        return;
      }

      const currentAccuracy = calculatePoseSimilarity(latestUserPose.current, relevantReferencePose);
      setAccuracy(currentAccuracy);

      try {
        const response = await fetch('http://localhost:5000/evaluate_pose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_pose: latestUserPose.current,
            reference_pose: relevantReferencePose,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setGeminiFeedback(data.feedback);
        } else {
          setGeminiFeedback(`Backend hatası: ${data.error}`);
        }
      } catch (error) {
        console.error("Error fetching pose evaluation:", error);
        setGeminiFeedback('Geri bildirim alınırken bir hata oluştu. Backend sunucusunun çalıştığından emin olun.');
      }
    }, 500);
    return () => clearInterval(evaluationInterval);
  }, [started, calculatePoseSimilarity, currentStep, isLoadingReferenceData, referenceIdealSegments]);

  return (
    <div className="app-container interactive-bg" style={{ position: 'relative' }}>
      <div className="navbar">
        <h2 className="logo">🩰 AI Dans Eğitmeni</h2>
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

      <div className="music-changer-panel">
        <button onClick={playPrevSong}>Önceki Şarkı</button>
        <button onClick={playNextSong}>Sonraki Şarkı</button>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'fixed', bottom: 20, left: 20,
          width: 60, height: 60, borderRadius: '50%',
          backgroundColor: '#00ffff', border: 'none', cursor: 'pointer',
          boxShadow: '0 0 10px #00ffff', zIndex: 10000,
        }}
        aria-label="Chatbot aç/kapa"
      >
        <ChatIcon />
      </button>

      {chatOpen && (
        <div className="chatbot-box">
          <div className="chat-header">
            <ChatIcon /> <span>Chatbot</span>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.sender === 'bot' ? 'left' : 'right' }}>
                <span>{msg.text}</span>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Bir şey sor..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <button onClick={handleSend}>Gönder</button>
          </div>
        </div>
      )}

      {!started ? (
        <div className="start-screen zoom-in">
          <h1 className="title">HipHop Dansına Hazır mısın?</h1>
          <button className="start-button" onClick={startDance}>
            Dansa Başla
          </button>
        </div>
      ) : (
        <>
          {geminiFeedback && (
            <div style={{
              marginTop: '10px', padding: '15px', backgroundColor: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid #00ffff', borderRadius: '10px',
              textAlign: 'center', color: '#fff', fontSize: '16px', lineHeight: '1.5',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)'
            }}>
              <h4>AI Dans Eğitmeni Geri Bildirimi:</h4>
              <p>{geminiFeedback}</p>
            </div>
          )}

          <div className="video-section">
            <div className="video-container-wrapper">
              <h3>Senin Kameran</h3>
              <div style={{ position: 'relative', width: 420, height: 465 }}>
                <video
                  ref={userVideoRef}
                  className="video-active"
                  id="user-video"
                  autoPlay
                  playsInline
                  muted
                  width={420}
                  height={465}
                />
                <canvas ref={userCanvasRef} width={420} height={465} />
              </div>
              <div>Doğruluk: %{accuracy}</div>
            </div>

            <div className="accuracy-bar-container">
              <div className="accuracy-bar-fill" style={{ height: `${accuracy}%` }} />
            </div>

            <div className="video-container-wrapper">
              <h3>Referans Video {currentStep}</h3>
              <div style={{ position: 'relative', width: 420, height: 465 }}>
                <video
                  key={currentStep}
                  ref={refVideoRef}
                  src={videoSources[currentStep - 1]}
                  className="video-active"
                  id="ref-video"
                  autoPlay
                  muted
                  loop
                  width={420}
                  height={465}
                  onLoadedData={(e) => e.target.play()}
                />
                <canvas ref={refCanvasRef} width={420} height={465} />
              </div>
              <div className="video-controls">
                <button onClick={decreaseSpeed}>Yavaşlat</button>
                <button onClick={pauseVideo}>Durdur</button>
                <button onClick={playVideo}>Oynat</button>
                <button onClick={increaseSpeed}>Hızlandır</button>
              </div>
              <div>Hız: {refVideoRate.toFixed(2)}x</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={skipToNext} className="next-dance-button" disabled={isLoadingReferenceData || accuracy < 70}>
              Sonraki Dans Hareketi
            </button>
          </div>
        </>
      )}
    </div>
  );
}
