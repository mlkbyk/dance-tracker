# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv # .env dosyasını yüklemek için
import VoiceChat from './VoiceChat';
import React from 'react';


function App() {
  return (
    <div>
      <VoiceChat />
    </div>
  );
}

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
CORS(app) # React uygulamasından gelen istekleri kabul etmek için CORS'u etkinleştirin

# Gemini API anahtarını ortam değişkenlerinden al
# API anahtarınızı .env dosyasına "API_KEY=your_gemini_api_key_here" şeklinde ekleyin
api_key = os.getenv("API_KEY")

if not api_key:
    raise ValueError("API_KEY ortam değişkeni ayarlanmamış. Lütfen .env dosyasını kontrol edin.")

genai.configure(api_key=api_key)

# Gemini modelini başlat (Her iki endpoint için de Gemini 1.5 Flash kullanıldı)
model = genai.GenerativeModel('models/gemini-1.5-flash')

@app.route('/chat', methods=['POST'])
def chat():
    """
    Chatbot mesajlarını işler, Gemini API'ye gönderir ve yanıtı döndürür.
    """
    # Gelen isteğin JSON formatında olup olmadığını kontrol et
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    # İstekten 'message' alanını al
    user_message = request.json.get('message')

    # Mesajın boş olup olmadığını kontrol et
    if not user_message:
        return jsonify({"error": "Message field is required"}), 400

    try:
        # Gemini API'yi çağırarak sohbet yanıtı al
        response = model.generate_content(user_message)
        bot_response_text = response.text
        return jsonify({"response": bot_response_text})
    except Exception as e:
        # API çağrısında hata oluşursa konsola yazdır ve hata mesajı döndür
        print(f"Gemini API hatası (chat): {e}")
        return jsonify({"error": "Chatbot yanıtı alınamadı."}), 500

@app.route('/evaluate_pose', methods=['POST'])
def evaluate_pose():
    """
    Kullanıcının dans pozunu referans pozla karşılaştırır ve Gemini API'den detaylı geri bildirim alır.
    """
    # Gelen isteğin JSON formatında olup olmadığını kontrol et
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400

    data = request.json
    user_pose = data.get('user_pose')      # Kullanıcının pozu (MediaPipe landmark verileri)
    reference_pose = data.get('reference_pose') # Referans pozu (MediaPipe landmark verileri)
    # İsteğe bağlı olarak, eğer React tarafında açılar hesaplanıyorsa, onları da alabiliriz:
    # user_angles = data.get('user_angles')
    # reference_angles = data.get('reference_angles')

    # Gerekli poz verilerinin eksik olup olmadığını kontrol et
    if not user_pose or not reference_pose:
        return jsonify({'error': 'Kullanıcı veya referans poz verisi eksik'}), 400

    # Gemini modeline gönderilecek detaylı prompt (istek metni)
    # Prompt, modelden daha spesifik ve eyleme geçirilebilir geri bildirimler ister.
    prompt = f"""
    Aşağıda iki insan vücudunun çeşitli eklem noktalarını temsil eden koordinat verileri yer alıyor.
    Birinci poz 'Kullanıcı Pozu', ikinci poz ise 'Referans Pozu'dur.
    Lütfen 'Kullanıcı Pozu'nu 'Referans Pozu' ile karşılaştırarak dans performansı için detaylı ve yapıcı geri bildirim ver.
    Geri bildiriminde şu noktalara odaklan:

    1.  **Genel Duruş ve Enerji:** Kullanıcının genel duruşu referans poza ne kadar benziyor? Enerji ve akış nasıl?
    2.  **Vücut Bölgesi Bazında Farklar:**
        * **Kollar ve Eller:** Kol pozisyonları (dirsek açısı, bilek duruşu), el hareketleri referansa göre nasıl?
        * **Bacaklar ve Ayaklar:** Bacakların duruşu (diz bükülmeleri, kalça pozisyonu), ayak yerleşimi ve yönü referansa göre nasıl?
        * **Gövde ve Omuzlar:** Gövde rotasyonu, omuz hizalaması referansa göre nasıl?
        * **Baş ve Boyun:** Başın yönü ve boyun duruşu referansa göre nasıl?
    3.  **Düzeltme Önerileri:** Kullanıcının pozunu referans poza yaklaştırmak için spesifik, eyleme geçirilebilir ve anlaşılır öneriler sun. Örneğin: "Sol dirseğinizi 10 derece daha bükün", "Sağ bacağınızı biraz daha geriye uzatın ve topuğunuzu kaldırın", "Omuzlarınızı biraz daha aşağı indirin."
    4.  **Motivasyon ve Destek:** Geri bildirimi motive edici ve teşvik edici bir dille yaz.

    Lütfen sadece niteliksel geri bildirim metnini ver, sayısal bir doğruluk yüzdesi veya başka bir format kullanma.

    Kullanıcı Pozu (JSON):
    {user_pose}

    Referans Pozu (JSON):
    {reference_pose}
    """

    try:
        # Gemini API'yi çağırarak poz değerlendirme geri bildirimi al
        response = model.generate_content(prompt)
        # Yanıttan sadece metin kısmını al
        feedback_text = response.text
        return jsonify({'feedback': feedback_text})
    except Exception as e:
        # API çağrısında hata oluşursa konsola yazdır ve hata mesajı döndür
        print(f"Gemini API hata oluştu (evaluate_pose): {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Flask uygulamasını çalıştır
    # Üretim ortamında gunicorn gibi bir WSGI sunucusu kullanın
    app.run(debug=True, port=5000) # Geliştirme için debug=True, port 5000
