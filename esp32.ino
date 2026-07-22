#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <TinyGPS++.h>
#include "cert.h"
#include "secrets.h"

// --- KONFIGURASI WIFI ---
const char* ssid = "KAIORYO"; 
const char* password = "rioriorio89";

// --- KONFIGURASI MQTT ---
const char* mqtt_server = "maroonhoney-9a9267a5.a03.euc1.aws.hivemq.cloud"; 
const int mqtt_port = 8883; 
const char* mqtt_topic = "kinetic-transit/gps";

// --- IDENTITAS ODONG-ODONG ---
const char* plat_nomor = "D 1234 AB"; 

// --- PIN & OBJEK GPS ---
#define RXD2 16
#define TXD2 17
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long timerTerakhir = 0;

void setup_wifi() {
  Serial.println();
  Serial.print("Menghubungkan ke Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Terhubung!");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Koneksi MQTT (TLS)... ");
    String clientId = "ESP32-ShuttleA-";
    clientId += String(random(0xffff), HEX);

    // --- STOPWATCH HANDSHAKE ---
    unsigned long waktuMulai = millis();

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      // --- MATIKAN STOPWATCH HANDSHAKE ---
      unsigned long waktuSelesai = millis(); 
      unsigned long delayHandshake = waktuSelesai - waktuMulai;
      
      // CETAK KE SERIAL MONITOR DALAM FORMAT CSV
      // Format: EVENT,WaktuMulai_ms,WaktuSelesai_ms,Delay_ms
      Serial.println();
      Serial.print("HANDSHAKE_TLS,");
      Serial.print(waktuMulai);
      Serial.print(",");
      Serial.print(waktuSelesai);
      Serial.print(",");
      Serial.println(delayHandshake);
      Serial.println("BERHASIL LOGIN KE PRIVATE BROKER!");
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}

void setClock() {
  // Ambil waktu dari server NTP (Waktu UTC)
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.print("Sinkronisasi waktu satelit (NTP) untuk TLS...");
  time_t now = time(nullptr);
  
  // Tunggu sampai tahun berubah dari 1970 ke tahun sekarang
  while (now < 24 * 3600) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println(" WAKTU UPDATE!");
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  
  setup_wifi();
  setClock();
  
  espClient.setCACert(root_ca);
  client.setServer(mqtt_server, mqtt_port);
  
  Serial.println("=== SISTEM KINETIC TRANSIT (REAL GPS) AKTIF ===");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  unsigned long waktuSekarang = millis();
  if (waktuSekarang - timerTerakhir > 2000) {
    timerTerakhir = waktuSekarang;

    // Cek apakah satelit sudah terkunci (Fix)
    if (gps.location.isValid() && gps.location.isUpdated()) {  
      // Ambil data real dari satelit
      double lat = gps.location.lat();
      double lng = gps.location.lng();
      double speed = gps.speed.kmph();
      
      // Susun JSON sesuai skema database teman Anda
      String payload = "{\"license_plate\":\"" + String(plat_nomor) + 
                       "\", \"latitude\":" + String(lat, 6) + 
                       ", \"longitude\":" + String(lng, 6) + 
                       ", \"speed\":" + String(speed, 2) + "}";
      
      Serial.print("[LIVE MQTTS] Mengirim kordinat: ");
      Serial.println(payload);
      
      // --- NYALAKAN STOPWATCH PUBLISH ---
      unsigned long waktuMulaiPublish = millis();
      
      // Tembakkan ke Broker HiveMQ
      if (client.publish(mqtt_topic, payload.c_str())) {
        // --- MATIKAN STOPWATCH PUBLISH ---
        unsigned long waktuSelesaiPublish = millis();
        unsigned long delayPublish = waktuSelesaiPublish - waktuMulaiPublish;
        
        // CETAK KE SERIAL MONITOR DALAM FORMAT CSV
        Serial.print("PUBLISH_DATA,");
        Serial.print(waktuMulaiPublish);
        Serial.print(",");
        Serial.print(waktuSelesaiPublish);
        Serial.print(",");
        Serial.println(delayPublish);
      } else {
        // Jika gagal terkirim (hilang sinyal di jalan)
        Serial.println("GAGAL_KIRIM,0,0,0");
      }
      
    } else {
      Serial.print("[MENUNGGU SATELIT] Jumlah satelit terpantau: ");
      Serial.println(gps.satellites.value());
    }
  }
}