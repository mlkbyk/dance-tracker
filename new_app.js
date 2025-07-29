import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import VoiceChat from "./VoiceChat";
import './App.css';

//sesli komut
function App() {
  return (
    <div>
      <h1>Gemini Sesli Asistan</h1>
      <VoiceChat />
    </div>
  );
}


// ChatIcon bileşeni
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
  const userVideoRef = useRef(null); // Kullanıcı kamerası için video referansı
  const refVideoRef = useRef(null);  // Referans video için video referansı

  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [accuracy, setAccuracy] = useState(0); // Sayısal doğruluk (0-100)
  const [geminiFeedback, setGeminiFeedback] = useState(''); // Gemini'den gelen niteliksel geri bildirim

  const latestUserPose = useRef(null); // Kullanıcının en son poz verisi (MediaPipe landmarkları)
  const latestRefPose = useRef(null);  // Referans videonun en son poz verisi (MediaPipe landmarkları)

  // MediaPipe Pose ve Camera örneklerini tutacak yeni useRef'ler
  const userPoseInstance = useRef(null);
  const userCameraInstance = useRef(null);
  const refPoseInstance = useRef(null);
  const refVideoPoseInstance = useRef(null);


  // Müzik kaynakları ve mevcut şarkı indeksi
  const songSources = [
    'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
    'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3',
    'https://www.bensound.com/bensound-music/bensound-funkyelement.mp3',
  ];
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [music] = useState(new Audio(songSources[currentSongIndex]));

  const [musicMuted, setMusicMuted] = useState(true);
  const [refVideoRate, setRefVideoRate] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{
    sender: 'bot', text: 'Hoş geldin! Sana HipHop dansında yardımcı olacağım.'
  }]);
  const [userInput, setUserInput] = useState('');

  const videoSources = [
    '/videos/dance1.mp4',
    '/videos/dance2.mp4',
    '/videos/dance3.mp4',
    '/videos/dance4.mp4',
    '/videos/dance5.mp4',
    '/videos/dance6.mp4',
    '/videos/dance7.mp4',
  ];

  // Referans ideal segment verilerini tutacak state
  const [referenceIdealSegments, setReferenceIdealSegments] = useState({});

  // Video kaynaklarınızla eşleşen JSON dosyalarının yolları
  // Örnek: '/videos/dance1.mp4' -> '/reference_data/dance1_ideal_segment.json'
  const idealSegmentJsonPaths = videoSources.map(videoPath => {
    const videoName = videoPath.split('/').pop().split('.')[0];
    return `/reference_data/${videoName}_ideal_segment.json`;
  });

  // Uygulama yüklendiğinde ideal segment JSON'larını yükle
  useEffect(() => {
    const loadIdealSegments = async () => {
      const loadedSegments = {};
      for (const path of idealSegmentJsonPaths) {
        try {
          const response = await fetch(path);
          if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.statusText}`);
          }
          const data = await response.json();
          const videoName = path.split('/').pop().split('_ideal_segment.json')[0];
          loadedSegments[videoName] = data;
        } catch (error) {
          console.error(`Error loading ideal segment JSON from ${path}:`, error);
        }
      }
      setReferenceIdealSegments(loadedSegments);
    };

    loadIdealSegments();
  }, []); // Sadece bir kez yüklensin

  const startDance = () => {
    setStarted(true);
    setCurrentStep(1);
    setMusicMuted(false);
    setGeminiFeedback(''); // Yeni başlangıçta geri bildirimi temizle
  };

  const skipToNext = () => {
    if (currentStep < videoSources.length) {
      setCurrentStep(currentStep + 1);
      setAccuracy(0);
      setGeminiFeedback(''); // Yeni adıma geçince geri bildirimi temizle
    } else {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Tebrikler! Tüm dans adımlarını tamamladınız. Başa dönülüyor.' }]);
      setCurrentStep(1);
      setStarted(false);
    }
  };

  const pauseVideo = () => {
    if (refVideoRef.current) refVideoRef.current.pause();
  };

  const playVideo = () => {
    if (refVideoRef.current) refVideoRef.current.play();
  };

  const increaseSpeed = () => {
    if (refVideoRef.current) {
      let newRate = Math.min(refVideoRef.current.playbackRate + 0.25, 3);
      refVideoRef.current.playbackRate = newRate;
      refVideoRef.current.play();
      setRefVideoRate(newRate);
    }
  };

  const decreaseSpeed = () => {
    if (refVideoRef.current) {
      let newRate = Math.max(refVideoRef.current.playbackRate - 0.25, 0.25);
      refVideoRef.current.playbackRate = newRate;
      refVideoRef.current.play();
      setRefVideoRate(newRate);
    }
  };

  const playNextSong = () => {
    const nextIndex = (currentSongIndex + 1) % songSources.length;
    setCurrentSongIndex(nextIndex);
    music.src = songSources[nextIndex];
    if (!musicMuted) {
      music.play().catch(() => console.log("Sonraki şarkı otomatik oynatılamadı."));
    }
  };

  const playPrevSong = () => {
    const prevIndex = (currentSongIndex - 1 + songSources.length) % songSources.length;
    setCurrentSongIndex(prevIndex);
    music.src = songSources[prevIndex];
    if (!musicMuted) {
      music.play().catch(() => console.log("Önceki şarkı otomatik oynatılamadı."));
    }
  };

  // Chatbot mesajı gönderme fonksiyonu (Gemini API ile entegre edildi)
  const handleSend = async () => {
    if (!userInput.trim()) return;

    const userMessage = userInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setUserInput('');

    setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Cevap bekleniyor...' }]);

    try {
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP hatası! Durum: ${response.status}`);
      }

      const data = await response.json();
      const botResponseText = data.response;

      setChatMessages((prev) => {
        const newMessages = prev.slice(0, -1);
        return [...newMessages, { sender: 'bot', text: botResponseText }];
      });

    } catch (error) {
      console.error("Chatbot API hatası:", error);
      setChatMessages((prev) => {
        const newMessages = prev.slice(0, -1);
        return [...newMessages, { sender: 'bot', text: 'Üzgünüm, şu an yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.' }];
      });
    }
  };

  // Müzik kontrolü useEffect
  useEffect(() => {
    music.loop = true;
    music.volume = 0.5;
    if (started && !musicMuted) {
      music.play().catch(() => console.log("Otomatik müzik oynatılamadı. Kullanıcı etkileşimi gerekebilir."));
    } else {
      music.pause();
    }
    music.src = songSources[currentSongIndex];
    if (started && !musicMuted) {
      music.play().catch(() => console.log("Şarkı değiştirildi, otomatik oynatılamadı."));
    }
    return () => music.pause();
  }, [started, musicMuted, music, currentSongIndex, songSources]);

  // MediaPipe için yardımcı fonksiyon
  // Bu fonksiyon MediaPipe Pose ve Camera instance'larını oluşturur.
  const createMediaPipePipeline = (videoElement, onResultsCallback) => {
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

    pose.onResults(onResultsCallback);

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (videoElement) {
          await pose.send({ image: videoElement });
        }
      },
      width: 420,
      height: 465,
    });

    return { pose, camera };
  };

  // MediaPipe instance'larını SADECE BİR KEZ başlat
  useEffect(() => {
    // Kullanıcı kamerası için MediaPipe pipeline'ını oluştur
    // Sadece userVideoRef.current var VE userCameraInstance.current henüz oluşturulmamışsa
    if (userVideoRef.current && !userCameraInstance.current) {
      const { pose: userPose, camera: userCam } = createMediaPipePipeline(userVideoRef.current, (results) => {
        latestUserPose.current = results.poseLandmarks;
      });
      userPoseInstance.current = userPose;
      userCameraInstance.current = userCam;
    }

    // Referans video için MediaPipe pipeline'ını oluştur
    // Sadece refVideoRef.current var VE refVideoPoseInstance.current henüz oluşturulmamışsa
    if (refVideoRef.current && !refVideoPoseInstance.current) {
      const { pose: refPose, camera: refCam } = createMediaPipePipeline(refVideoRef.current, (results) => {
        latestRefPose.current = results.poseLandmarks;
      });
      refPoseInstance.current = refPose;
      refVideoPoseInstance.current = refCam;
    }

    // Cleanup: Bileşen kaldırıldığında kameraları durdur
    return () => {
      if (userCameraInstance.current) {
        userCameraInstance.current.stop();
        userCameraInstance.current = null;
      }
      if (refVideoPoseInstance.current) {
        refVideoPoseInstance.current.stop();
        refVideoPoseInstance.current = null;
      }
      // MediaPipe Pose instance'larının doğrudan bir dispose/close metodu genellikle yoktur.
      // Camera instance'ları akışı yönetir.
    };
  }, []); // Boş bağımlılık dizisi: SADECE BİR KEZ çalışır

  // 'started' state'ine göre kamera akışlarını başlat/durdur
  // Bu useEffect, video elementlerinin hazır olmasını beklemelidir.
  useEffect(() => {
    const startCameraStream = (cameraInstanceRef, videoElementRef, cameraName) => {
      if (cameraInstanceRef.current && videoElementRef.current) {
        // Video elementinin hazır olmasını beklemek için onloadeddata kullan
        if (videoElementRef.current.readyState >= 2) { // HAVE_CURRENT_DATA veya daha fazlası
          cameraInstanceRef.current.start().catch((err) => console.error(`Kamera başlatılamadı (${cameraName}):`, err));
        } else {
          // Eğer video henüz hazır değilse, yüklendiğinde başlatmayı dene
          videoElementRef.current.onloadeddata = () => {
            if (cameraInstanceRef.current) { // onloadeddata tetiklendiğinde instance hala var mı kontrol et
              cameraInstanceRef.current.start().catch((err) => console.error(`Kamera başlatılamadı (${cameraName} - onloadeddata):`, err));
            }
          };
        }
      }
    };

    const stopCameraStream = (cameraInstanceRef) => {
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
      }
    };

    if (started) {
      // Kullanıcı kamerası akışını başlat
      startCameraStream(userCameraInstance, userVideoRef, 'kullanıcı');
      // Referans video akışını başlat
      startCameraStream(refVideoPoseInstance, refVideoRef, 'referans');
    } else {
      // Akışları durdur
      stopCameraStream(userCameraInstance);
      stopCameraStream(refVideoPoseInstance);
    }

    // Cleanup for this effect: onloadeddata event listener'larını kaldır
    return () => {
      if (userVideoRef.current) userVideoRef.current.onloadeddata = null;
      if (refVideoRef.current) refVideoRef.current.onloadeddata = null;
      // Bileşen unmount edildiğinde veya 'started' false olduğunda kameraları durdur
      stopCameraStream(userCameraInstance);
      stopCameraStream(refVideoPoseInstance);
    };
  }, [started]); // 'started' state'i değiştiğinde çalışır


  // Poz karşılaştırma fonksiyonu (basit Euclidean mesafe)
  // Bu fonksiyon, kullanıcının anlık pozu ile referans ideal segmentin ilgili karesini karşılaştırır.
  const calculatePoseSimilarity = useCallback((userLandmarks, refLandmarks) => {
    if (!userLandmarks || !refLandmarks || userLandmarks.length !== refLandmarks.length) {
      return 0; // Geçersiz veri
    }

    let totalDistance = 0;
    const importantLandmarkIndices = [
      0, // nose
      11, 12, // shoulders
      13, 14, // elbows
      15, 16, // wrists
      23, 24, // hips
      25, 26, // knees
      27, 28  // ankles
    ];

    let validLandmarkCount = 0;
    for (const index of importantLandmarkIndices) {
      const userL = userLandmarks[index];
      const refL = refLandmarks[index];

      // Görünürlük kontrolü: Eğer bir landmark çok az görünürse, karşılaştırmaya dahil etmeyebiliriz.
      // Eşik değeri 0.7 olarak ayarlandı, bu değer ayarlanabilir.
      if (userL && refL && userL.visibility > 0.7 && refL.visibility > 0.7) {
        // 3D mesafeyi hesapla (x, y, z koordinatları)
        const dx = userL.x - refL.x;
        const dy = userL.y - refL.y;
        const dz = userL.z ? (userL.z - refL.z) : 0; // Z koordinatı olmayabilir
        totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        validLandmarkCount++;
      }
    }

    if (validLandmarkCount === 0) return 0; // Hiç geçerli landmark yoksa 0 döndür

    // Mesafeyi bir benzerlik skoruna dönüştür
    // Bu dönüşüm, uygulamanızın hassasiyetine göre ayarlanmalıdır.
    // Küçük totalDistance yüksek doğruluk anlamına gelir.
    // Normalize edilmiş koordinatlar (0-1) olduğu için maksimum olası mesafe:
    // Her eksen için 1 birim fark (max), 3 eksen (x,y,z), karekök içinde toplam.
    // Önemli landmark sayısı * sqrt(1^2 + 1^2 + 1^2) = önemli landmark sayısı * sqrt(3)
    const maxPossibleDistancePerLandmark = Math.sqrt(3); // Max mesafe 3D uzayda
    const maxTotalPossibleDistance = validLandmarkCount * maxPossibleDistancePerLandmark;

    let similarity = 1 - (totalDistance / maxTotalPossibleDistance); // 0-1 arası değer
    similarity = Math.max(0, Math.min(1, similarity)); // 0 ile 1 arasında tut

    return Math.floor(similarity * 100); // 0-100 arası yüzde
  }, []);

  // Poz değerlendirme için Flask API'ye veri gönderme ve doğruluk güncelleme
  useEffect(() => {
    if (!started) return;

    const sendPoseForEvaluation = async () => {
      const currentVideoName = videoSources[currentStep - 1].split('/').pop().split('.')[0];
      const refIdealSegmentFrames = referenceIdealSegments[currentVideoName];

      // Referans videonun mevcut oynatma zamanı
      const currentRefTime = refVideoRef.current ? refVideoRef.current.currentTime : 0;
      // Referans videonun FPS'ini varsayalım (örn: 30 FPS). Gerçek FPS'i bilmek daha iyi olur.
      const videoFps = 30;
      const currentRefFrameNumber = Math.floor(currentRefTime * videoFps);

      if (!latestUserPose.current || !refIdealSegmentFrames || refIdealSegmentFrames.length === 0) {
        console.log("Kullanıcı pozu veya referans ideal segment verisi mevcut değil, değerlendirme atlandı.");
        setAccuracy(0);
        setGeminiFeedback('');
        return;
      }

      // İdeal segmentin toplam kare sayısı
      const idealSegmentLength = refIdealSegmentFrames.length;
      // Referans videonun mevcut karesine karşılık gelen ideal segment karesini bul
      // Modulo operatörü ile döngüyü sağlıyoruz.
      const idealFrameIndex = (currentRefFrameNumber % idealSegmentLength);
      const relevantReferencePose = refIdealSegmentFrames[idealFrameIndex]?.landmarks;

      if (!relevantReferencePose) {
        console.log("İdeal segmentten ilgili referans poz bulunamadı, değerlendirme atlandı.");
        setAccuracy(0);
        setGeminiFeedback('');
        return;
      }

      // Sayısal doğruluğu hesapla ve güncelle
      const currentAccuracy = calculatePoseSimilarity(
        latestUserPose.current,
        relevantReferencePose
      );
      setAccuracy(currentAccuracy);

      try {
        const response = await fetch('http://127.0.0.1:5000/evaluate_pose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_pose: latestUserPose.current,
            reference_pose: relevantReferencePose // İdeal segmentten gelen ilgili referans poz
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP hatası! Durum: ${response.status}`);
        }

        const data = await response.json();
        const feedback = data.feedback;
        console.log("Poz Değerlendirme Geri Bildirimi (Gemini):", feedback);

        setGeminiFeedback(feedback);
        // İsteğe bağlı olarak, tam geri bildirimi chatbota ekle
        // Chatbot'a eklenen mesajı daha kısa tutabiliriz veya sadece önemli geri bildirimleri ekleyebiliriz.
        // Örneğin: setChatMessages((prev) => [...prev, { sender: 'bot', text: `AI Geribildirimi: ${feedback.substring(0, 150)}...` }]);

      } catch (error) {
        console.error("Poz değerlendirme API hatası:", error);
        setGeminiFeedback('Poz değerlendirilirken bir hata oluştu.');
        setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Poz değerlendirilirken bir hata oluştu.' }]);
      }
    };

    // Fonksiyonu belirli aralıklarla çağır (örn: her 500ms'de bir)
    // Daha sık çağrı, daha gerçek zamanlı geri bildirim sağlar ancak API limitlerini etkileyebilir.
    const evaluationInterval = setInterval(sendPoseForEvaluation, 500); // Daha sık kontrol için 500ms

    return () => clearInterval(evaluationInterval); // Bileşen kaldırıldığında interval'i temizle
  }, [started, calculatePoseSimilarity, referenceIdealSegments, currentStep]); // Bağımlılıkları güncelledik

  return (
    <div className="app-container interactive-bg" style={{ position: 'relative' }}>
      {/* MouseTrail bileşeni kaldırıldı */}

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

      {/* Müzik Değiştirme Paneli */}
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
        <div className="chatbot-box" style={{
          position: 'fixed', bottom: '80px', right: '20px',
          width: '320px', maxHeight: '400px', overflowY: 'auto',
          backgroundColor: '#222', color: '#0ff', borderRadius: '10px', padding: '10px', zIndex: 10001,
        }}>
          <div className="chat-header" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <ChatIcon /> <span style={{ marginLeft: '8px' }}>Chatbot</span>
          </div>
          <div className="chat-messages" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{
                marginBottom: '6px', textAlign: msg.sender === 'bot' ? 'left' : 'right',
              }}>
                <span style={{
                  display: 'inline-block', padding: '8px 12px', borderRadius: '12px',
                  backgroundColor: msg.sender === 'bot' ? '#004d4d' : '#00cccc',
                  color: msg.sender === 'bot' ? '#fff' : '#000', maxWidth: '80%', wordWrap: 'break-word', fontSize: '14px',
                }}>{msg.text}</span>
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
              style={{ padding: '6px 12px', borderRadius: '0 6px 6px 0', border: 'none', backgroundColor: '#00cccc', color: '#000', cursor: 'pointer' }}>
              Gönder
            </button>
          </div>
        </div>
      )}

      {!started ? (
        <div className="start-screen zoom-in" style={{ textAlign: 'center', marginTop: '150px' }}>
          <h1 className="title">HipHop Dansına Hazır mısın?</h1>
          <button className="start-button" onClick={startDance}>Dansa Başla</button>
        </div>
      ) : (
        <>
          <div className="video-section">
            <div className="video-container-wrapper">
              <h3 style={{ color: '#0ff' }}>Senin Kameran</h3>
              <video
                ref={userVideoRef} // Kullanıcı kamerası
                className="video-active"
                id="user-video" // ID eklendi
                autoPlay
                playsInline
                muted
                width={420}
                height={465}
                style={{ border: '3px solid #00ffff', borderRadius: '10px' }}
              />
              <div style={{ marginTop: '10px', color: '#0ff' }}>Doğruluk: %{accuracy}</div>
            </div>

            {/* Doğruluk Çubuğu */}
            <div className="accuracy-bar-container">
              <div
                className="accuracy-bar-fill"
                style={{ height: `${accuracy}%` }}
              ></div>
            </div>

            <div className="video-container-wrapper">
              <h3 style={{ color: '#0ff' }}>Referans Video {currentStep}</h3>
              <video
                key={currentStep}
                ref={refVideoRef} // Referans video
                src={videoSources[currentStep - 1]}
                className="video-active" // Sınıf eklendi
                id="ref-video" // ID eklendi
                autoPlay
                muted
                loop
                width={420}
                height={465}
                style={{ border: '3px solid #00ffff', borderRadius: '10px' }}
                onLoadedData={(e) => e.target.play()}
              />
              <div className="video-controls">
                <button onClick={decreaseSpeed}>Yavaşlat</button>
                <button onClick={pauseVideo}>Durdur</button>
                <button onClick={playVideo}>Oynat</button>
                <button onClick={increaseSpeed}>Hızlandır</button>
              </div>
              <div style={{ marginTop: '6px', color: '#0ff' }}>Hız: {refVideoRate.toFixed(2)}x</div>
            </div>
          </div>

          {/* Gemini'den gelen niteliksel geri bildirim */}
          {geminiFeedback && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid #00ffff',
              borderRadius: '10px',
              maxWidth: '800px',
              textAlign: 'center',
              color: '#fff',
              fontSize: '16px',
              lineHeight: '1.5',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)'
            }}>
              <h4>AI Dans Eğitmeni Geri Bildirimi:</h4>
              <p>{geminiFeedback}</p>
            </div>
          )}

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
