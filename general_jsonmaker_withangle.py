import cv2
import mediapipe as mp
import numpy as np
import json
import os

# MediaPipe çizim ve poz çözümlerini başlat
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# Açı hesaplama fonksiyonu (2D düzlemde)
# Bu fonksiyon MediaPipe'ın verdiği x,y koordinatlarını kullanır.
# 3D açılar için daha karmaşık bir hesaplama gerekir.
def calculateAngle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c) # Noktaları NumPy dizilerine dönüştür

    # Vektörleri oluştur
    vec1 = b - a
    vec2 = b - c

    # Nokta çarpımı ve büyüklükleri kullanarak açıyı hesapla
    # Güvenlik için sıfıra bölme hatasını önle
    dot_product = np.dot(vec1, vec2)
    magnitude1 = np.linalg.norm(vec1)
    magnitude2 = np.linalg.norm(vec2)

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0 # Sıfır büyüklükte vektörler için açı tanımsız, 0 döndür

    radians = np.arccos(dot_product / (magnitude1 * magnitude2))
    angle = np.degrees(radians) # Radyanı dereceye çevir

    # Açının 0-180 derece arasında olmasını sağla
    return angle

# Videoların bulunduğu ana dizin
# ÖNEMLİ: Kendi video dizininizin yolunu buraya yazın
video_directory = r"C:\Users\MS\Desktop\videos"

# JSON dosyalarının kaydedileceği çıktı dizini
# Bu dizin yoksa otomatik olarak oluşturulacaktır.
output_directory = r"C:\Users\MS\dance-tracker\src\reference_data"
os.makedirs(output_directory, exist_ok=True) # Dizin yoksa oluştur

# Desteklenen video uzantıları
video_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.flv')

# Video dizinindeki tüm dosyaları listele
for filename in os.listdir(video_directory):
    # Dosyanın bir video olup olmadığını kontrol et
    if filename.lower().endswith(video_extensions):
        video_path = os.path.join(video_directory, filename)
        print(f"\n--- Video işleniyor: {filename} ---")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Hata: Video açılamadı! Yol: {video_path}")
            continue # Sonraki videoya geç

        frame_data = [] # Her video için yeni bir liste başlat

        # MediaPipe Pose modelini başlat
        with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            frame_count = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break # Kare okunamadıysa (video bittiyse) döngüden çık

                frame_count += 1
                # Görüntüyü BGR'den RGB'ye dönüştür (MediaPipe RGB bekler)
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image.flags.writeable = False # Görüntüyü salt okunur yap (performans için)
                results = pose.process(image) # Poz algılama işlemini yap
                image.flags.writeable = True # Görüntüyü tekrar yazılabilir yap

                try:
                    # Algılanan poz landmark'larını al
                    landmarks = results.pose_landmarks.landmark

                    # --- Belirli eklem noktalarının koordinatlarını çıkar ---
                    # MediaPipe'ın landmark indekslerini kullanarak koordinatları alıyoruz.
                    # x, y, z değerleri 0 ile 1 arasında normalize edilmiş değerlerdir.
                    # visibility değeri, landmark'ın ne kadar güvenilir bir şekilde algılandığını gösterir.

                    # Sol taraf koordinatları
                    left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                                     landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
                    left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                                  landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
                    left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                                  landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
                    left_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                                landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
                    left_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                                 landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
                    left_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                                  landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
                    left_ear = [landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].x,
                                landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].y]
                    left_mouth = [landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].x,
                                  landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].y]
                    left_nose = [landmarks[mp_pose.PoseLandmark.NOSE.value].x,
                                 landmarks[mp_pose.PoseLandmark.NOSE.value].y]


                    # Sağ taraf koordinatları
                    right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                                      landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
                    right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                                   landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
                    right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x,
                                   landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
                    right_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                                   landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
                    right_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                                  landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
                    right_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                                   landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
                    right_ear = [landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].x,
                                 landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].y]
                    right_mouth = [landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].x,
                                   landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].y]
                    right_nose = [landmarks[mp_pose.PoseLandmark.NOSE.value].x,
                                  landmarks[mp_pose.PoseLandmark.NOSE.value].y]

                    # --- Hesaplanan Açılar ---
                    angles = {
                        "left_elbow_angle": calculateAngle(left_shoulder, left_elbow, left_wrist),
                        "left_shoulder_angle": calculateAngle(left_elbow, left_shoulder, left_hip),
                        "left_hip_angle": calculateAngle(left_shoulder, left_hip, left_knee),
                        "left_knee_angle": calculateAngle(left_hip, left_knee, left_ankle),
                        "left_neck_angle": calculateAngle(left_shoulder, left_nose, left_ear),

                        "right_elbow_angle": calculateAngle(right_shoulder, right_elbow, right_wrist),
                        "right_shoulder_angle": calculateAngle(right_elbow, right_shoulder, right_hip),
                        "right_hip_angle": calculateAngle(right_shoulder, right_hip, right_knee),
                        "right_knee_angle": calculateAngle(right_hip, right_knee, right_ankle),
                        "right_neck_angle": calculateAngle(right_shoulder, right_nose, right_ear)
                    }

                    # --- Tüm Landmark Koordinatlarını Kaydet ---
                    # Her landmark için x, y, z ve visibility değerlerini içeren bir liste oluştur
                    landmark_list = []
                    for lm_id, lm in enumerate(landmarks):
                        landmark_list.append({
                            'id': lm_id,
                            'x': lm.x,
                            'y': lm.y,
                            'z': lm.z,
                            'visibility': lm.visibility
                        })

                    # Her kare için hem açıları hem de landmarkları kaydet
                    frame_data.append({
                        "frame_number": frame_count, # cap.get(cv2.CAP_PROP_POS_FRAMES) yerine frame_count kullanıldı
                        "timestamp_ms": cap.get(cv2.CAP_PROP_POS_MSEC),
                        "angles": angles,
                        "landmarks": landmark_list
                    })

                except Exception as e:
                    # Poz algılanamazsa veya bir hata oluşursa devam et
                    print(f"Kare {frame_count} işlenirken hata oluştu veya poz algılanamadı: {e}")
                    continue

        cap.release() # Mevcut videoyu serbest bırak

        # JSON dosyasının adı (video adından türetilir)
        json_filename = os.path.splitext(filename)[0] + "_pose_data.json"
        output_path = os.path.join(output_directory, json_filename)

        # Toplanan verileri JSON dosyasına yaz
        with open(output_path, 'w') as f:
            json.dump(frame_data, f, indent=4) # Okunabilir olması için indent kullan

        print(f"Poz verileri başarıyla kaydedildi: {output_path}")

print("\nTüm videoların işlenmesi tamamlandı!")
