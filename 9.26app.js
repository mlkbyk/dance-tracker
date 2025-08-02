import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

// YORUM: Video ve şarkı kaynakları için sabit listeler
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
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  const [referenceIdealSegments, setReferenceIdealSegments] = useState({});

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

  const lastFeedbackTime = useRef(0);

  // YORUM: Uygulama başlangıcında sohbet mesajlarını ayarla ve referans verilerini yükle
  useEffect(() => {
    setChatMessages((prev) => [...prev, {
      sender: 'bot',
      text: 'Uygulama hazır! Dansa başlamak için "Dansa Başla" butonuna tıkla.'
    }]);

    // YORUM: Referans verilerini bir kez yükle
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReferenceData = async () => {
    setIsLoadingReferenceData(true);
    const dataToLoad = {};
    for (let i = 0; i < videoSources.length; i++) {
      const videoName = videoSources[i].split('/').pop().split('.')[0];
      try {
        const response = await fetch(`/datas/${videoName}.json`);
        if (!response.ok) {
          throw new Error(`Dosya bulunamadı: /datas/${videoName}.json`);
        }
        const data = await response.json();
        dataToLoad[videoName] = data;
      } catch (error) {
        console.error(`Referans verisi yüklenirken hata oluştu (${videoName}):`, error);
        setGeminiFeedback(`Hata: ${videoName}.json dosyası yüklenemedi. Lütfen public/datas klasörünü kontrol edin.`);
        setIsLoadingReferenceData(false);
        return;
      }
    }
    setReferenceIdealSegments(dataToLoad);
    setIsLoadingReferenceData(false);
    setAppInitialized(true);
    console.log("Tüm referans verileri başarıyla yüklendi.");
  };

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
      const chatHistory = [{ role: "user", parts: [{ text: userMessage }] }];
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        const botResponse = result.candidates[0].content.parts[0].text;
        setChatMessages((prev) => [...prev.slice(0, -1), { sender: 'bot', text: botResponse }]);
      } else {
        throw new Error('Yanıt alınamadı.');
      }
    } catch (error) {
      console.error("Chatbot API hatası:", error);
      setChatMessages((prev) => [...prev.slice(0, -1), { sender: 'bot', text: 'Üzgünüm, şu an yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.' }]);
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
        userPoseInstance.current = createPoseModel((results) => {
          latestUserPose.current = results.poseLandmarks;
          const canvasCtx = userCanvasRef.current.getContext('2d');
          canvasCtx.clearRect(0, 0, userCanvasRef.current.width, userCanvasRef.current.height);
          // YORUM: Kullanıcı pozunu canvas'a çizme işlemi kaldırıldı.
          // if (results.poseLandmarks) {
          //   drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
          //   drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
          // }
        });
        userCameraInstance.current = new Camera(userVideoRef.current, {
          onFrame: async () => {
            if (userVideoRef.current?.readyState >= 2) {
              await userPoseInstance.current.send({ image: userVideoRef.current });
            }
          },
          width: 420,
          height: 465,
        });
        userCameraInstance.current.start().catch((err) => console.error("Kullanıcı kamerası başlatma hatası:", err));
      }

      if (!refPoseInstance.current) {
        refPoseInstance.current = createPoseModel((results) => {
          latestRefPose.current = results.poseLandmarks;
          const canvasCtx = refCanvasRef.current.getContext('2d');
          canvasCtx.clearRect(0, 0, refCanvasRef.current.width, refCanvasRef.current.height);
          // YORUM: Referans pozunu canvas'a çizme işlemi kaldırıldı.
          // if (results.poseLandmarks) {
          //   drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00C9FF', lineWidth: 4 });
          //   drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FFD700', lineWidth: 2 });
          // }
        });
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

  const getAngle = useCallback((p1, p2, p3) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }, []);
  
  const calculatePoseSimilarity = useCallback((userLandmarks, refLandmarks) => {
    if (!userLandmarks || !refLandmarks) return 0;
  
    const getAngles = (landmarks) => ({
      leftElbow: getAngle(landmarks[11], landmarks[13], landmarks[15]),
      rightElbow: getAngle(landmarks[12], landmarks[14], landmarks[16]),
      leftShoulder: getAngle(landmarks[13], landmarks[11], landmarks[23]),
      rightShoulder: getAngle(landmarks[14], landmarks[12], landmarks[24]),
      leftKnee: getAngle(landmarks[23], landmarks[25], landmarks[27]),
      rightKnee: getAngle(landmarks[24], landmarks[26], landmarks[28]),
      leftHip: getAngle(landmarks[11], landmarks[23], landmarks[25]),
      rightHip: getAngle(landmarks[12], landmarks[24], landmarks[26]),
    });
  
    const userAngles = getAngles(userLandmarks);
    const refAngles = getAngles(refLandmarks);
  
    let angleDifferenceSum = 0;
    const angleKeys = Object.keys(userAngles);
    angleKeys.forEach(key => {
      angleDifferenceSum += Math.abs(userAngles[key] - refAngles[key]);
    });
  
    const maxAngleDifference = angleKeys.length * 180;
    const angleSimilarity = 1 - (angleDifferenceSum / maxAngleDifference);
  
    return Math.floor(Math.max(0, Math.min(1, angleSimilarity)) * 100);
  }, [getAngle]);

  const evaluateAndGetFeedback = useCallback(async (userPose, refPose) => {
    const now = Date.now();
    // YORUM: Eğer yapay zeka meşgulse veya 3 saniyeden kısa süre önce istek gönderildiyse yeni istek gönderme
    if (geminiLoading || (now - lastFeedbackTime.current) < 3000) {
      return;
    }
    
    // YORUM: Kullanıcı pozisyonu yoksa geri bildirim ver
    if (!userPose) {
      setGeminiFeedback('Kamerada görünmüyorsunuz. Lütfen doğru şekilde pozisyon alın.');
      setAccuracy(0);
      return;
    }

    try {
      setGeminiLoading(true);
      lastFeedbackTime.current = now;

      const prompt = `
        Aşağıda bir kullanıcının ve bir referans dansçının vücut pozisyonu verileri (pose landmarks) bulunmaktadır.
        Verileri karşılaştır ve kullanıcıya, referans dansçının pozisyonuna daha yakın olması için ne yapması gerektiği hakkında kısa, eyleme dönük ve eğitici bir geri bildirim ver.
        Örnek geri bildirim formatı: "Sol kolunu biraz daha yukarı kaldır", "Sağ dizini daha fazla bük", "Vücudunu sağa doğru eğ."
        Sadece geri bildirimi ver, ek açıklama yapma.
        
        Kullanıcı Pozu: ${JSON.stringify(userPose)}
        Referans Pozu: ${JSON.stringify(refPose)}
      `;

      // YORUM: Doğrudan Gemini API'ye istek gönderme
      const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        const feedbackText = result.candidates[0].content.parts[0].text;
        setGeminiFeedback(feedbackText);
      } else {
        throw new Error('Yanıt alınamadı.');
      }

    } catch (error) {
      console.error("Poz değerlendirme API hatası:", error);
      setGeminiFeedback('Geri bildirim için API\'ye bağlanılamadı.');
    } finally {
      setGeminiLoading(false);
    }
  }, [geminiLoading]);

  // YORUM: Ana değerlendirme döngüsü
  useEffect(() => {
    if (!started || isLoadingReferenceData) return;

    const evaluationInterval = setInterval(() => {
      const currentVideoName = videoSources[currentStep - 1].split('/').pop().split('.')[0];
      const refIdealSegmentFrames = referenceIdealSegments[currentVideoName];
      const currentRefTime = refVideoRef.current?.currentTime;
      const videoFps = 30;

      if (!latestUserPose.current || !refIdealSegmentFrames || refIdealSegmentFrames.length === 0 || currentRefTime === undefined) {
        setAccuracy(0);
        return;
      }
      
      const currentRefFrameNumber = Math.floor(currentRefTime * videoFps);
      if (currentRefFrameNumber >= refIdealSegmentFrames.length) {
          setAccuracy(0);
          return;
      }
      
      const relevantReferencePose = refIdealSegmentFrames[currentRefFrameNumber]?.landmarks;
      if (!relevantReferencePose) {
        setAccuracy(0);
        return;
      }
      
      // YORUM: Anlık doğruluk puanını hesapla (sadece görsel geri bildirim için)
      const currentAccuracy = calculatePoseSimilarity(latestUserPose.current, relevantReferencePose);
      setAccuracy(currentAccuracy);
      
      // YORUM: Eğer doğruluk puanı düşükse ve API'ye son 3 saniyede istek gönderilmediyse backend'e gönder
      if (currentAccuracy < 70) {
        evaluateAndGetFeedback(latestUserPose.current, relevantReferencePose);
      } else if (currentAccuracy >= 70) {
        // YORUM: Yüksek puan için olumlu geri bildirim
        setGeminiFeedback('Harika gidiyorsun! Aynı ritimle devam et.');
      }

    }, 500); // Yorum: 500ms'de bir değerlendirme yap
    return () => clearInterval(evaluationInterval);
  }, [started, currentStep, isLoadingReferenceData, calculatePoseSimilarity, evaluateAndGetFeedback, referenceIdealSegments]);

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

      {!appInitialized ? (
        <div className="start-screen zoom-in">
          <h1 className="title">Uygulama Yükleniyor...</h1>
          <p>Lütfen bekleyin, dans verileri yükleniyor.</p>
        </div>
      ) : !started ? (
        <div className="start-screen zoom-in">
          <h1 className="title">HipHop Dansına Hazır mısın?</h1>
          <button className="start-button" onClick={startDance}>
            Dansa Başla
          </button>
        </div>
      ) : (
        <>
          {isLoadingReferenceData && (
            <div style={{ padding: '15px', backgroundColor: 'rgba(255, 255, 0, 0.1)', border: '1px solid #ffff00', borderRadius: '10px', textAlign: 'center', color: '#fff' }}>
              <p>Referans verileri yükleniyor, lütfen bekleyin...</p>
            </div>
          )}
          {geminiLoading && (
            <div style={{
              marginTop: '10px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid #ffffff', borderRadius: '10px',
              textAlign: 'center', color: '#fff', fontSize: '16px', lineHeight: '1.5',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
            }}>
              <h4>AI Dans Eğitmeni Geri Bildirimi:</h4>
              <p>Yapay zeka geri bildirimi hazırlanıyor...</p>
            </div>
          )}
          {!geminiLoading && geminiFeedback && (
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
                <canvas ref={userCanvasRef} width={420} height={465} style={{ position: 'absolute', top: 0, left: 0 }} />
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
                <canvas ref={refCanvasRef} width={420} height={465} style={{ position: 'absolute', top: 0, left: 0 }} />
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
            <button onClick={skipToNext} className="next-dance-button">
              Sonraki Dans Hareketi
            </button>
          </div>
        </>
      )}
    </div>
  );
}
