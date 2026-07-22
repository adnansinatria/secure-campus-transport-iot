import socket
import ssl

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="server.crt", keyfile="server.key")

bindsocket = socket.socket()
# Fitur SO_REUSEADDR agar tidak error "Address already in use" saat skrip direstart
bindsocket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
bindsocket.bind(('0.0.0.0', 8883))
bindsocket.listen(5)

print("[SISTEM] Rogue TLS Server aktif di port 8883.")
print("[SISTEM] Menunggu koneksi masuk dari node IoT...")

while True:
    newsocket, fromaddr = bindsocket.accept()
    print(f"\n[INFO] Koneksi TCP dari {fromaddr} diterima.")
    print("[INFO] Mengirimkan Server Hello dan Sertifikat (Palsu)...")
    try:
        connstream = context.wrap_socket(newsocket, server_side=True)
        print("[GAGAL] Node IoT menerima sertifikat yang tidak sah!")
    except (ssl.SSLError, ConnectionResetError, OSError) as e:
        # Menangkap juga event putus koneksi TCP RST dari ESP32
        print(f"[SUKSES] Koneksi TLS ditolak oleh klien (Fail-Secure).")
        print(f"[ALASAN] {e}")