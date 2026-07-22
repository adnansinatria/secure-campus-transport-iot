import paho.mqtt.client as mqtt
import ssl
import time
import json

# --- KONFIGURASI BROKER ---
MQTT_BROKER = "maroonhoney-9a9267a5.a03.euc1.aws.hivemq.cloud" 
MQTT_PORT = 8883
MQTT_TOPIC = "kinetic-transit/gps"
MQTT_USERNAME = "odongproject"
MQTT_PASSWORD = "Saikou123455"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[INFO] Berhasil terhubung ke HiveMQ menggunakan TLS 1.3!")
        
        # Payload dummy persis seperti output GPS NEO-6M ESP32
        payload = {
            "license_plate": "D 1234 AB",
            "latitude": -6.927233,
            "longitude": 107.773827,
            "speed": 15.2
        }
        
        print(f"[INFO] Mengirim koordinat: {json.dumps(payload)}")
        client.publish(MQTT_TOPIC, json.dumps(payload))
    else:
        print(f"[ERROR] Gagal terhubung, return code: {rc}")

def on_publish(client, userdata, mid):
    print(f"[INFO] Pesan berhasil dikirim! Silakan periksa Wireshark.")
    print("[INFO] Tekan Ctrl+C untuk keluar.")

# Inisialisasi MQTT Client
client = mqtt.Client(client_id="Python_TLS13_Tester")
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.on_connect = on_connect
client.on_publish = on_publish

# --- KONFIGURASI INTI: MEMAKSA TLS 1.3 ---
context = ssl.create_default_context()
context.minimum_version = ssl.TLSVersion.TLSv1_3 
context.maximum_version = ssl.TLSVersion.TLSv1_3 

client.tls_set_context(context)

print("[INFO] Memulai proses TLS Handshake dengan server...")
try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
except Exception as e:
    print(f"[ERROR] Koneksi gagal: {e}")