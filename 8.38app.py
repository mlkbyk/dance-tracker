# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import math
from dotenv import load_dotenv  # .env dosyasını yüklemek için

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
CORS(app)  # React uygulamasından gelen istekleri kabul etmek için CORS'u etkinleştirin

# YORUM: Gemini API anahtarını ortam değişkenlerinden al.
# API anahtarınız yoksa aşağıdaki satıra doğrudan ekleyebilirsiniz.
# API anahtarınızı .env dosyasına "API_KEY=your_gemini_api_key_here" şeklinde ekleyin
api_key = os.getenv("API_KEY")

if not api_key:
    # Hata: API anahtarı yoksa bir hata fırlat veya geçici bir anahtar kullan.
    print("HATA: API_KEY ortam değişkeni ayarlanmamış. Lütfen .env dosyasını kontrol edin.")
    genai.configure(api_key="placeholder")
else:
    genai.configure(api_key=api_key)

# Gemini modelini başlat
model = genai.GenerativeModel('models/gemini-1.5-flash')


def calculate_angle(p1, p2, p3):
    """
    Üç eklem noktasının (p1, p2, p3) arasındaki açıyı derece cinsinden hesaplar.
    Hata kontrolü eklenerek eksik verilerde None döndürür.
    """
    if not p1 or not p2 or not p3:
        return None

    try:
        # Landmark koordinatlarını al
        v1 = (p1['x'] - p2['x'], p1['y'] - p2['y'])
        v2 = (p3['x'] - p2['x'], p3['y'] - p2['y'])

        # Vektörler arasındaki açıyı hesapla
        dot_product = v1[0] * v2[0] + v1[1] * v2[1]
        magnitude_v1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2)
        magnitude_v2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2)

        if magnitude_v1 == 0 or magnitude_v2 == 0:
            return None

        # Cosinüs teorisi ile açıyı bul
        angle = math.acos(min(max(dot_product / (magnitude_v1 * magnitude_v2), -1.0), 1.0))

        # Radyanı dereceye çevir
        return math.degrees(angle)
    except (KeyError, TypeError):
        # YORUM: Gelen veride 'x' veya 'y' anahtarları eksikse None döndür.
        return None


@app.route('/')
def home():
    """Sunucunun çalışıp çalışmadığını kontrol etmek için basit bir yanıt."""
    return "Backend sunucusu başarıyla çalışıyor!", 200


@app.route('/chat', methods=['POST'])
def chat():
    """
    Chatbot mesajlarını işler, Gemini API'ye gönderir ve yanıtı döndürür.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    user_message = request.json.get('message')

    if not user_message:
        return jsonify({"error": "Message field is required"}), 400

    try:
        # YORUM: Gemini'ye gönderilecek prompt'u oluştur
        prompt = f"Bir dans eğitmenisin ve bir öğrenciyle konuşuyorsun. Bu öğrencinin mesajı: '{user_message}'. Ona kısa ve motive edici bir şekilde cevap ver. Cevabın çok uzun olmasın."
        response = model.generate_content(prompt)
        bot_response_text = response.text
        return jsonify({"response": bot_response_text})
    except Exception as e:
        print(f"Gemini API hatası (chat): {e}")
        return jsonify({"error": "Chatbot yanıtı alınamadı. API anahtarını kontrol edin veya tekrar deneyin."}), 500


@app.route('/evaluate_pose', methods=['POST'])
def evaluate_pose():
    """
    Kullanıcının dans pozunu referans pozla karşılaştırır ve Gemini API'den detaylı geri bildirim alır.
    Poz verilerinde indeks hatasını önlemek için kapsamlı kontroller yapıldı.
    """
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400

    data = request.json
    user_pose = data.get('user_pose')
    reference_pose = data.get('reference_pose')

    # YORUM: En kritik kontrol! Gelen poz listelerinin yeterli sayıda eleman içerdiğinden emin ol.
    # Mediapipe 33 landmark döndürdüğü için en az 33 eleman bekliyoruz.
    if not user_pose or not reference_pose or len(user_pose) < 33 or len(reference_pose) < 33:
        print("Hata: Gelen poz verisi eksik veya geçersiz. Devam edilemiyor.")
        return jsonify({'error': 'Eksik veya geçersiz poz verisi'}), 400

    print("\n----------------------------------")
    print("Poz Değerlendirme İsteği Alındı.")

    # YORUM: Anahtar açıları hesapla. Artık hata olmayacak çünkü listenin uzunluğunu kontrol ettik.
    user_angles = {
        'right_elbow': calculate_angle(user_pose[11], user_pose[13], user_pose[15]),
        'left_elbow': calculate_angle(user_pose[12], user_pose[14], user_pose[16]),
        'right_shoulder': calculate_angle(user_pose[13], user_pose[11], user_pose[23]),
        'left_shoulder': calculate_angle(user_pose[14], user_pose[12], user_pose[24]),
        'right_knee': calculate_angle(user_pose[23], user_pose[25], user_pose[27]),
        'left_knee': calculate_angle(user_pose[24], user_pose[26], user_pose[28]),
        'right_hip': calculate_angle(user_pose[11], user_pose[23], user_pose[25]),
        'left_hip': calculate_angle(user_pose[12], user_pose[24], user_pose[26])
    }

    reference_angles = {
        'right_elbow': calculate_angle(reference_pose[11], reference_pose[13], reference_pose[15]),
        'left_elbow': calculate_angle(reference_pose[12], reference_pose[14], reference_pose[16]),
        'right_shoulder': calculate_angle(reference_pose[13], reference_pose[11], reference_pose[23]),
        'left_shoulder': calculate_angle(reference_pose[14], reference_pose[12], reference_pose[24]),
        'right_knee': calculate_angle(reference_pose[23], reference_pose[25], reference_pose[27]),
        'left_knee': calculate_angle(reference_pose[24], reference_pose[26], reference_pose[28]),
        'right_hip': calculate_angle(reference_pose[11], reference_pose[23], reference_pose[25]),
        'left_hip': calculate_angle(reference_pose[12], reference_pose[24], reference_pose[26])
    }

    # YORUM: Açısal farkları hesapla
    angle_diffs = {
        key: abs(user_angles[key] - reference_angles[key]) if user_angles.get(key) is not None and reference_angles.get(
            key) is not None else 999
        for key in user_angles.keys()
    }

    # YORUM: Gemini'ye gönderilecek prompt'u oluştur
    prompt = f"""
    Sen, bir dans eğitmenisin ve bir öğrencinin dans performansını değerlendiriyorsun. Öğrenci, referans bir dans pozunu taklit etmeye çalışıyor.
    Aşağıda öğrencinin ve referansın eklem açıları var.

    Sadece en belirgin pozisyon farkını tespit et ve bunu düzeltmek için bir tane net, eyleme geçirilebilir bir öneri sun.
    Yanıtın en fazla 2-3 cümle uzunluğunda, motive edici ve teşvik edici olsun.

    Eğer tüm açılar birbirine çok yakınsa, harika bir iş çıkardığına dair motive edici bir geri bildirim ver.

    Örnek geri bildirim: "Harika gidiyorsun! Sol kolunu referansa göre biraz daha bükük tutmaya çalış. Devam et!"

    Kullanıcı Pozu Açıları:
    Sağ Dirsek: {user_angles['right_elbow'] if user_angles['right_elbow'] is not None else 'verilemedi'} derece
    Sol Dirsek: {user_angles['left_elbow'] if user_angles['left_elbow'] is not None else 'verilemedi'} derece
    Sağ Omuz: {user_angles['right_shoulder'] if user_angles['right_shoulder'] is not None else 'verilemedi'} derece
    Sol Omuz: {user_angles['left_shoulder'] if user_angles['left_shoulder'] is not None else 'verilemedi'} derece
    Sağ Diz: {user_angles['right_knee'] if user_angles['right_knee'] is not None else 'verilemedi'} derece
    Sol Diz: {user_angles['left_knee'] if user_angles['left_knee'] is not None else 'verilemedi'} derece
    Sağ Kalça: {user_angles['right_hip'] if user_angles['right_hip'] is not None else 'verilemedi'} derece
    Sol Kalça: {user_angles['left_hip'] if user_angles['left_hip'] is not None else 'verilemedi'} derece

    Referans Pozu Açıları:
    Sağ Dirsek: {reference_angles['right_elbow'] if reference_angles['right_elbow'] is not None else 'verilemedi'} derece
    Sol Dirsek: {reference_angles['left_elbow'] if reference_angles['left_elbow'] is not None else 'verilemedi'} derece
    Sağ Omuz: {reference_angles['right_shoulder'] if reference_angles['right_shoulder'] is not None else 'verilemedi'} derece
    Sol Omuz: {reference_angles['left_shoulder'] if reference_angles['left_shoulder'] is not None else 'verilemedi'} derece
    Sağ Diz: {reference_angles['right_knee'] if reference_angles['right_knee'] is not None else 'verilemedi'} derece
    Sol Diz: {reference_angles['left_knee'] if reference_angles['left_knee'] is not None else 'verilemedi'} derece
    Sağ Kalça: {reference_angles['right_hip'] if reference_angles['right_hip'] is not None else 'verilemedi'} derece
    Sol Kalça: {reference_angles['left_hip'] if reference_angles['left_hip'] is not None else 'verilemedi'} derece
    """

    print("Gemini'ye gönderilen prompt: \n", prompt)

    try:
        response = model.generate_content(prompt)
        feedback_text = response.text
        print("\n----------------------------------")
        print("Gemini'den Gelen Geri Bildirim:")
        print(feedback_text)
        print("----------------------------------")
        return jsonify({'feedback': feedback_text})
    except Exception as e:
        print(f"Gemini API hatası (evaluate_pose): {e}")
        return jsonify({'error': "Gemini API'den geri bildirim alınırken bir hata oluştu."}), 500


if __name__ == '__main__':
    print("Flask backend sunucusu başlatılıyor...")
    app.run(debug=True, port=5000)
