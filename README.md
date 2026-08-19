# Secure Campus Transport IoT

Implementasi dan pengujian keamanan komunikasi pada sistem pelacakan transportasi kampus berbasis Internet of Things (IoT) menggunakan ESP32, GPS, MQTT, dan Transport Layer Security (TLS).

## Overview

Proyek ini merupakan implementasi sistem pelacakan transportasi kampus berbasis IoT yang menggunakan ESP32 sebagai perangkat pengirim data lokasi kendaraan.

Data posisi diperoleh dari modul GPS, kemudian diproses oleh ESP32 dan dikemas dalam format JSON. Data tersebut dikirimkan menggunakan protokol MQTT menuju MQTT broker.

Untuk meningkatkan keamanan komunikasi, MQTT dijalankan melalui koneksi TLS menggunakan `WiFiClientSecure`. Implementasi juga mencakup pengujian keamanan terhadap skenario Man-in-the-Middle (MITM) serta pengujian penggunaan TLS 1.3 menggunakan perangkat lunak Python.

## System Architecture

```text
GPS Module
    │
    ▼
  ESP32
    │
    │ JSON Telemetry
    │ MQTT over TLS
    ▼
HiveMQ Cloud
    │
    ▼
Tracking System / Web Interface
```

## Security Architecture

Komunikasi antara ESP32 dan MQTT broker diamankan menggunakan TLS.

```text
ESP32
  │
  ▼
WiFiClientSecure
  │ TLS
  ▼
PubSubClient
  │ MQTT
  ▼
HiveMQ Cloud
```

ESP32 menggunakan CA certificate untuk memvalidasi sertifikat server sebelum komunikasi dilanjutkan.

Apabila koneksi diarahkan ke server palsu dengan sertifikat yang tidak dipercaya, koneksi TLS akan ditolak sehingga data tidak diteruskan ke server tersebut.

## Features

- GPS-based vehicle tracking
- ESP32-based IoT device
- GPS data parsing menggunakan TinyGPS++
- JSON telemetry payload
- MQTT communication
- MQTT over TLS (MQTTS)
- CA certificate validation
- MQTT authentication
- Connection timing measurement
- MQTT publish timing measurement
- Man-in-the-Middle (MITM) security testing
- DNS spoofing simulation
- Rogue server simulation
- TLS 1.3 compatibility testing

## Hardware

- ESP32
- GPS module
- Wi-Fi network
- Computer/laptop for testing and monitoring

## Software & Libraries

### ESP32

- Arduino IDE
- `WiFi.h`
- `WiFiClientSecure.h`
- `PubSubClient.h`
- `TinyGPS++.h`

### Python Security Testing
- Python 3
- Paho MQTT
- dnslib

### Network Analysis
- Wireshark

## Telemetry Data

ESP32 menerima informasi dari GPS dan mengambil parameter yang digunakan dalam sistem, seperti:

- Latitude
- Longitude
- Speed

Parameter tersebut kemudian dikemas menjadi payload JSON.

Contoh:

```json
{
  "license_plate": "D 1234 AB",
  "latitude": -6.927233,
  "longitude": 107.773827,
  "speed": 15.2
}
```

Payload kemudian dipublish melalui MQTT ke topic yang dikonfigurasi pada sistem.

## TLS Configuration

ESP32 menggunakan `WiFiClientSecure` untuk membangun koneksi yang diamankan TLS.

Server certificate divalidasi menggunakan CA certificate yang dikonfigurasi pada ESP32.

MQTT over TLS menggunakan port:

```text
8883
```

## Security Testing

### MITM / DNS Spoofing

Pengujian MITM dilakukan dengan mensimulasikan DNS spoofing yang mengarahkan ESP32 menuju rogue server.

```text
ESP32
  │
  ▼
DNS Spoofer
  │
  ▼
Rogue TLS Server
```

Rogue server memberikan sertifikat yang tidak dipercaya oleh ESP32.

Karena ESP32 melakukan validasi sertifikat, koneksi TLS ditolak.

### TLS 1.3 Compatibility Test

File `uji_tls13.py` digunakan untuk menguji dukungan TLS 1.3 secara terpisah menggunakan Python.

Konfigurasi TLS 1.3 dilakukan dengan membatasi versi TLS:

```python
context.minimum_version = ssl.TLSVersion.TLSv1_3
context.maximum_version = ssl.TLSVersion.TLSv1_3
```

## Performance Testing

Pengujian performa membandingkan komunikasi MQTT tanpa TLS dengan MQTT over TLS.

Parameter yang diamati antara lain:

- Connection/initialization time
- Publish delay
- Message transmission performance
- MQTT vs MQTTS performance

Pengujian beban menggunakan JMeter untuk mensimulasikan beberapa perangkat IoT yang berkomunikasi dengan broker.

## Experimental Configuration

| Parameter | Configuration |
|---|---|
| Number of Threads | 100 |
| Loop Count | 10 |
| Total Samples | 1000 |
| Payload Size | ~100 bytes |
| MQTT QoS | 0 |
| MQTT Port | 1883 |
| MQTTS Port | 8883 |

## Security Objective

Penelitian berfokus pada perlindungan data telemetri selama proses transmisi antara perangkat IoT dan MQTT broker.

Aspek keamanan yang diperhatikan:

1. **Confidentiality** — mencegah pihak tidak berwenang membaca data.
2. **Integrity** — mencegah perubahan data tanpa izin.
3. **Server Authentication** — memastikan ESP32 berkomunikasi dengan server yang dipercaya.

## Security Notice

Repository ini ditujukan untuk keperluan akademik dan penelitian.

Jangan menyimpan atau mempublikasikan kredensial Wi-Fi, kredensial MQTT, private key, atau informasi sensitif lainnya pada repository publik.

## Research Context

Repository ini mendukung penelitian mengenai keamanan komunikasi pada sistem pelacakan transportasi kampus berbasis IoT dengan menggunakan MQTT yang diamankan melalui TLS.
