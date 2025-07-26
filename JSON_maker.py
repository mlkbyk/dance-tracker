import cv2
import mediapipe as mp
import numpy as np
import json
import os

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# Açı hesaplama fonksiyonu
def calculateAngle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return 360 - angle if angle > 180 else angle

# Video dosyasının yolu
video_path = "path_x"

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Video açılamadı!")
    exit()

frame_angles = []

with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = pose.process(image)
        image.flags.writeable = True

        try:
            landmarks = results.pose_landmarks.landmark

            # Sol taraf koordinatları
            left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                             landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            left_waist = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            left_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                         landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            left_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            left_ear = [landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].y]
            left_mouth = [landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].x,
                          landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].y]

            # Sağ taraf koordinatları
            right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                              landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                           landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x,
                           landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
            right_waist = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                           landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            right_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                          landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            right_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                           landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            right_ear = [landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].y]
            right_mouth = [landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].x,
                           landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].y]

            # Açılar
            angles = {
                "left_inner_arm_angle": calculateAngle(left_shoulder, left_elbow, left_wrist),
                "left_armpit_angle": calculateAngle(left_elbow, left_shoulder, left_waist),
                "left_waist_angle": calculateAngle(left_shoulder, left_waist, left_knee),
                "left_leg_angle": calculateAngle(left_waist, left_knee, left_ankle),
                "left_neck_angle": calculateAngle(left_ear, left_mouth, left_shoulder),

                "right_inner_arm_angle": calculateAngle(right_shoulder, right_elbow, right_wrist),
                "right_armpit_angle": calculateAngle(right_elbow, right_shoulder, right_waist),
                "right_waist_angle": calculateAngle(right_shoulder, right_waist, right_knee),
                "right_leg_angle": calculateAngle(right_waist, right_knee, right_ankle),
                "right_neck_angle": calculateAngle(right_ear, right_mouth, right_shoulder)
            }

            frame_angles.append(angles)

        except:
            continue

cap.release()

# JSON'a yaz
output_path = r"C:\Users\MS\dance-tracker\src\zeybek_angle.json"
with open(output_path, 'w') as f:
    json.dump(frame_angles, f, indent=4)

print("Açı verileri başarıyla kaydedildi:", output_path)
