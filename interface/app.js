/* ===================================================================
   KINETIC TRANSIT — Application Logic
   Telemetri Simulation, Encryption Demo, MITM Attack Simulation
   =================================================================== */

// ===== TAB NAVIGATION =====
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Initialize
  initTelemetri();
  initEncryption();
  initMITM();
});


// ===================================================================
// TAB 1: PROSES TELEMETRI DATA
// ===================================================================

let telemetriInterval = null;
let telemetriPacketCount = 0;
let telemetriStartTime = 0;
let uptimeInterval = null;
let mqttClient = null;

function initTelemetri() {
  const btnStart = document.getElementById('btn-start-telemetri');
  const btnReset = document.getElementById('btn-reset-telemetri');

  btnStart.addEventListener('click', startTelemetri);
  btnReset.addEventListener('click', resetTelemetri);
}

async function startTelemetri() {
  const btnStart = document.getElementById('btn-start-telemetri');
  const btnReset = document.getElementById('btn-reset-telemetri');
  btnStart.disabled = true;
  btnReset.disabled = false;
  btnStart.innerHTML = '<div class="spinner"></div> Menghubungkan ke Broker...';

  // Show data panels
  document.getElementById('telemetri-data').style.display = 'grid';
  telemetriStartTime = Date.now();
  telemetriPacketCount = 0;

  // Phase 1: Internet Connection Check (Real)
  setStatus('wifi', 'Memeriksa...', 'wait', '📶');
  addSerialLog('Memeriksa koneksi antarmuka jaringan...');
  await delay(400);

  const waitForConnection = () => {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
      } else {
        addSerialLog('<span class="t-error">[!] Tidak ada koneksi internet. Menunggu jaringan...</span>');
        const onlineHandler = () => {
          window.removeEventListener('online', onlineHandler);
          resolve();
        };
        window.addEventListener('online', onlineHandler);
      }
    });
  };

  await waitForConnection();
  setStatus('wifi', 'Terhubung', 'ok', '📶');
  addSerialLog('<span class="t-success">Koneksi Internet (Wi-Fi/LAN) Terhubung!</span>');

  // Phase 2: NTP Sync (simulated)
  await delay(500);
  addSerialLog('Sinkronisasi waktu satelit (NTP) untuk TLS...');
  await delay(800);
  setStatus('ntp', 'Sinkron', 'ok', '🕐');
  addSerialLog('<span class="t-success">WAKTU UPDATE!</span>');

  // Phase 3: TLS Handshake & Real MQTT connection
  await delay(500);
  addSerialLog('Koneksi MQTT (MQTTS over WebSocket) ke private broker...');
  activateArrows([1, 2]);

  const clientId = 'kinetic_transit_' + Math.random().toString(16).substr(2, 8);
  const host = 'wss://a6457ec5ca784641b552f0ac342e913e.s1.eu.hivemq.cloud:8884/mqtt';
  const topic = 'kinetic-transit/gps';
  
  const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    username: 'odongproject',
    password: 'Saikou123455',
  };

  addSerialLog('<span class="t-dim">Host: ' + host + '</span>');
  addSerialLog('<span class="t-dim">Topic: ' + topic + '</span>');

  if (typeof mqtt === 'undefined') {
    addSerialLog('<span class="t-error">Library MQTT.js tidak ditemukan! Cek koneksi internet.</span>');
    btnStart.innerHTML = 'Gagal';
    return;
  }

  mqttClient = mqtt.connect(host, options);

  mqttClient.on('error', (err) => {
    addSerialLog('<span class="t-error">Gagal terhubung ke MQTT: ' + err + '</span>');
    mqttClient.end();
  });

  mqttClient.on('connect', () => {
    setStatus('mqtt', 'Terhubung', 'ok', '🔌');
    const handshakeTime = Date.now() - telemetriStartTime;
    document.getElementById('metric-handshake').textContent = handshakeTime;
    
    addSerialLog('<span class="t-success">BERHASIL TERHUBUNG KE HIVEMQ!</span>');
    addSerialLog('<span class="t-system">=== SISTEM KINETIC TRANSIT (REAL MQTT) AKTIF ===</span>');
    
    // Subscribe to the topic
    mqttClient.subscribe(topic, { qos: 0 }, (err) => {
      if (!err) {
        addSerialLog('<span class="t-info">Subscribed to: ' + topic + '</span>');
      }
    });

    // Phase 4: GPS Fix & Data Sending
    setTimeout(() => {
      setStatus('gps', 'Fix (7 Sat)', 'ok', '🛰️');
      activateArrows([1, 2, 3]);

      // Activate node pulse animations
      ['node-esp32', 'node-wifi', 'node-tls', 'node-broker'].forEach(id => {
        document.getElementById(id).classList.add('node-active');
      });

      // Start uptime counter
      uptimeInterval = setInterval(updateUptime, 1000);
      
      btnStart.innerHTML = '▶ Simulasi Berjalan (Live MQTT)';

      // Start sending data
      sendTelemetriData(topic);
      telemetriInterval = setInterval(() => sendTelemetriData(topic), 2500);
    }, 600);
  });

  mqttClient.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic) {
      try {
        const payload = JSON.parse(message.toString());
        
        // Update JSON display with syntax highlighting
        const jsonHtml = formatJsonHighlight(payload);
        document.getElementById('json-payload').innerHTML = jsonHtml;
        
        // Update metrics
        telemetriPacketCount++;
        document.getElementById('metric-packets').textContent = telemetriPacketCount;
        
        const publishDelay = randomBetween(12, 85);
        document.getElementById('metric-publish').textContent = publishDelay;
        
        // Serial log
        addSerialLog(`<span class="t-success">[MQTTS DITERIMA]</span> Data dari broker: <span class="t-dim">${message.toString()}</span>`);
        
      } catch (e) {
        console.error("Invalid JSON received", e);
      }
    }
  });
}

function sendTelemetriData(topic) {
  if (!mqttClient || !mqttClient.connected) return;

  // Generate slightly varying GPS coordinates (simulating movement)
  const baseLat = -6.927233;
  const baseLng = 107.773827;
  const lat = baseLat + (Math.random() - 0.5) * 0.001;
  const lng = baseLng + (Math.random() - 0.5) * 0.001;
  const speed = (10 + Math.random() * 25).toFixed(2);

  const payload = {
    license_plate: "D 1234 AB",
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    speed: parseFloat(speed)
  };

  const payloadString = JSON.stringify(payload);

  // Publish
  mqttClient.publish(topic, payloadString, { qos: 0 });
  addSerialLog(`<span class="t-info">[LIVE MQTTS]</span> Publish data: <span class="t-dim">${payloadString}</span>`);
}

function updateUptime() {
  const seconds = Math.floor((Date.now() - telemetriStartTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  document.getElementById('metric-uptime').textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function resetTelemetri() {
  // Clear intervals
  if (telemetriInterval) clearInterval(telemetriInterval);
  if (uptimeInterval) clearInterval(uptimeInterval);
  telemetriInterval = null;
  uptimeInterval = null;
  telemetriPacketCount = 0;
  
  if (mqttClient) {
    mqttClient.end(true); // Force close
    mqttClient = null;
  }

  // Reset button
  const btnStart = document.getElementById('btn-start-telemetri');
  const btnReset = document.getElementById('btn-reset-telemetri');
  btnStart.disabled = false;
  btnReset.disabled = true;
  btnStart.innerHTML = '▶ Mulai Simulasi Telemetri';

  // Hide data panel
  document.getElementById('telemetri-data').style.display = 'none';

  // Reset status cards
  ['wifi', 'ntp', 'mqtt', 'gps'].forEach(key => {
    setStatus(key, 'Menunggu...', 'wait', getDefaultIcon(key));
  });

  // Reset metrics
  document.getElementById('metric-handshake').textContent = '—';
  document.getElementById('metric-publish').textContent = '—';
  document.getElementById('metric-packets').textContent = '0';
  document.getElementById('metric-uptime').textContent = '0s';

  // Clear serial log
  document.getElementById('serial-log').innerHTML = '';

  // Reset arrows
  deactivateArrows();

  // Remove node pulse
  ['node-esp32', 'node-wifi', 'node-tls', 'node-broker'].forEach(id => {
    document.getElementById(id).classList.remove('node-active');
  });
}


// ===================================================================
// TAB 2: PLAINTEXT → CIPHERTEXT
// ===================================================================

function initEncryption() {
  document.getElementById('btn-encrypt').addEventListener('click', startEncryption);
  document.getElementById('btn-send-plaintext').addEventListener('click', startPlaintext);
  document.getElementById('btn-reset-encrypt').addEventListener('click', resetEncryption);
}

async function startEncryption() {
  const btnEncrypt = document.getElementById('btn-encrypt');
  const btnPlaintext = document.getElementById('btn-send-plaintext');
  const btnReset = document.getElementById('btn-reset-encrypt');
  btnEncrypt.disabled = true;
  btnEncrypt.innerHTML = '<div class="spinner"></div> Mengenkripsi...';
  btnPlaintext.style.display = 'none';
  btnReset.style.display = 'none';

  const plaintext = document.getElementById('plaintext-input').value;
  const outputEl = document.getElementById('ciphertext-output');
  outputEl.innerHTML = '<span class="t-dim">Memulai TLS 1.2 Handshake...</span>';

  // Step 1: Client Hello
  await delay(600);
  activateEncStep(1);
  outputEl.innerHTML = '<span class="t-dim">→ Client Hello: Mengirim supported cipher suites...</span>';

  // Step 2: Server Hello
  await delay(700);
  completeEncStep(1);
  activateEncStep(2);
  outputEl.innerHTML += '<br><span class="t-dim">← Server Hello: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 dipilih</span>';

  // Step 3: Key Exchange
  await delay(800);
  completeEncStep(2);
  activateEncStep(3);
  outputEl.innerHTML += '<br><span class="t-dim">↔ ECDHE Key Exchange: Generating shared secret...</span>';

  // Step 4: Certificate Verify
  await delay(700);
  completeEncStep(3);
  activateEncStep(4);
  outputEl.innerHTML += '<br><span class="t-dim">✓ Sertifikat CA terverifikasi (ISRG Root X1)</span>';

  // Step 5: AES-256-GCM Encryption
  await delay(600);
  completeEncStep(4);
  activateEncStep(5);
  outputEl.innerHTML = '<span class="t-dim">⚡ Mengenkripsi data dengan AES-256-GCM...</span>';

  // Actually encrypt using Web Crypto API
  const ciphertextBytes = await encryptAESGCM(plaintext);

  await delay(800);
  completeEncStep(5);
  activateEncStep(6);

  // Step 6: Display ciphertext as hex dump
  const hexDump = formatHexDump(ciphertextBytes);
  outputEl.innerHTML = hexDump;

  await delay(300);
  completeEncStep(6);

  btnEncrypt.innerHTML = '✅ Enkripsi Selesai';
  btnReset.style.display = 'inline-flex';
}

async function startPlaintext() {
  const btnEncrypt = document.getElementById('btn-encrypt');
  const btnPlaintext = document.getElementById('btn-send-plaintext');
  const btnReset = document.getElementById('btn-reset-encrypt');
  btnPlaintext.disabled = true;
  btnPlaintext.innerHTML = '<div class="spinner"></div> Mengirim Plaintext...';
  btnEncrypt.style.display = 'none';
  btnReset.style.display = 'none';

  const plaintext = document.getElementById('plaintext-input').value;
  const outputEl = document.getElementById('ciphertext-output');
  outputEl.innerHTML = '<span class="t-dim">Memulai pengiriman tanpa TLS...</span>';

  // Override step labels
  document.getElementById('enc-step-1').querySelector('span').textContent = 'TCP Connect';
  document.getElementById('enc-step-2').querySelector('span').textContent = 'MQTT Connect';
  document.getElementById('enc-step-3').querySelector('span').textContent = 'MQTT Publish (Plaintext)';
  
  // Hide unused steps
  for (let i = 4; i <= 6; i++) {
    document.getElementById(`enc-step-${i}`).style.display = 'none';
    document.getElementById(`enc-step-${i}`).previousElementSibling.style.display = 'none'; // hide arrow
  }

  // Step 1: TCP Connect
  await delay(600);
  activateEncStep(1);
  outputEl.innerHTML = '<span class="t-dim">→ TCP Handshake (Port 1883)</span>';

  // Step 2: MQTT Connect
  await delay(700);
  completeEncStep(1);
  activateEncStep(2);
  outputEl.innerHTML += '<br><span class="t-dim">↔ MQTT CONNECT & CONNACK</span>';

  // Step 3: Publish Plaintext
  await delay(800);
  completeEncStep(2);
  activateEncStep(3);
  outputEl.innerHTML = '<span class="t-error">⚠️ MENGIRIM DATA TANPA ENKRIPSI (PLAINTEXT)</span><br><br>';

  await delay(500);
  
  // Output JSON as plaintext syntax highlighted
  try {
    outputEl.innerHTML += formatJsonHighlight(JSON.parse(plaintext));
  } catch(e) {
    outputEl.innerHTML += plaintext;
  }

  await delay(300);
  completeEncStep(3);

  btnPlaintext.innerHTML = '❌ Pengiriman Selesai (Bocor)';
  btnReset.style.display = 'inline-flex';
}

function resetEncryption() {
  const btnEncrypt = document.getElementById('btn-encrypt');
  const btnPlaintext = document.getElementById('btn-send-plaintext');
  const btnReset = document.getElementById('btn-reset-encrypt');
  btnEncrypt.disabled = false;
  btnEncrypt.innerHTML = '🔐 Kirim via TLS 1.2 (Port 8883)';
  btnEncrypt.style.display = 'inline-flex';
  btnPlaintext.disabled = false;
  btnPlaintext.innerHTML = '⚠️ Kirim Tanpa TLS (Port 1883)';
  btnPlaintext.style.display = 'inline-flex';
  btnReset.style.display = 'none';

  // Restore step labels
  const originalSteps = [
    'Client Hello', 'Server Hello', 'Key Exchange (ECDHE)', 
    'Sertifikat Verifikasi', 'AES-256-GCM Encrypt', 'Application Data ✓'
  ];

  // Reset all steps
  for (let i = 1; i <= 6; i++) {
    const step = document.getElementById(`enc-step-${i}`);
    step.classList.remove('step-active', 'step-done');
    step.style.display = 'flex';
    if(i > 1) {
      step.previousElementSibling.style.display = 'block'; // show arrow
    }
    step.querySelector('span').textContent = originalSteps[i-1];
  }

  // Reset output
  document.getElementById('ciphertext-output').innerHTML =
    '<span class="t-dim">Tekan salah satu tombol untuk memulai proses...</span>';
}

function activateEncStep(num) {
  const step = document.getElementById(`enc-step-${num}`);
  step.classList.add('step-active');
  step.classList.remove('step-done');
}

function completeEncStep(num) {
  const step = document.getElementById(`enc-step-${num}`);
  step.classList.remove('step-active');
  step.classList.add('step-done');
}

async function encryptAESGCM(plaintext) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random AES-256 key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    // Generate IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      key,
      data
    );

    // Combine IV + Ciphertext (mimicking TLS record)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Prepend a TLS record header (Content Type 23=Application Data, Version 0x0303=TLS 1.2 record layer, length)
    const tlsHeader = new Uint8Array([0x17, 0x03, 0x03, (combined.length >> 8) & 0xff, combined.length & 0xff]);
    const fullRecord = new Uint8Array(tlsHeader.length + combined.length);
    fullRecord.set(tlsHeader, 0);
    fullRecord.set(combined, tlsHeader.length);

    return fullRecord;
  } catch (e) {
    // Fallback: generate random bytes for display
    const fakeBytes = new Uint8Array(128);
    crypto.getRandomValues(fakeBytes);
    // Set TLS Application Data header
    fakeBytes[0] = 0x17;
    fakeBytes[1] = 0x03;
    fakeBytes[2] = 0x03;
    fakeBytes[3] = 0x00;
    fakeBytes[4] = 0x7b;
    return fakeBytes;
  }
}

function formatHexDump(bytes) {
  let html = '';
  const lineWidth = 16;

  for (let i = 0; i < bytes.length; i += lineWidth) {
    // Offset
    const offset = i.toString(16).padStart(8, '0');
    html += `<span class="hex-offset">${offset}</span>  `;

    // Hex bytes
    let hexPart = '';
    let asciiPart = '';

    for (let j = 0; j < lineWidth; j++) {
      if (i + j < bytes.length) {
        const byte = bytes[i + j];
        hexPart += `<span class="hex-byte">${byte.toString(16).padStart(2, '0')}</span> `;
        asciiPart += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
      } else {
        hexPart += '   ';
        asciiPart += ' ';
      }

      // Extra space between 8th and 9th byte
      if (j === 7) {
        hexPart += ' ';
      }
    }

    html += hexPart + ` <span class="hex-ascii">|${asciiPart}|</span>\n`;
  }

  return html;
}


// ===================================================================
// TAB 3: SIMULASI MITM
// ===================================================================

let mitmRunning = false;

function initMITM() {
  document.getElementById('btn-start-mitm').addEventListener('click', startMITM);
  document.getElementById('btn-reset-mitm').addEventListener('click', resetMITM);
}

async function startMITM() {
  if (mitmRunning) return;
  mitmRunning = true;

  const btnStart = document.getElementById('btn-start-mitm');
  const btnReset = document.getElementById('btn-reset-mitm');
  btnStart.disabled = true;
  btnReset.disabled = false;
  btnStart.innerHTML = '<div class="spinner"></div> Serangan Berlangsung...';

  // Clear previous logs
  document.getElementById('dns-log').innerHTML = '';
  document.getElementById('rogue-log').innerHTML = '';
  document.getElementById('result-secure').classList.remove('visible');
  document.getElementById('mitm-blocked-x').classList.remove('visible');

  // === DNS Spoofer Boot ===
  await delay(500);
  addDnsLog('<span class="t-system">[DNS SPOOFER]</span> Berjalan di port 53.');
  await delay(300);
  addDnsLog('<span class="t-system">[DNS SPOOFER]</span> Mengalihkan trafik <span class="t-info">maroonhoney-9a9267a5.a03.euc1.aws.hivemq.cloud</span> ke <span class="t-error">10.211.119.98</span>...');

  // === Rogue Server Boot ===
  await delay(400);
  addRogueLog('<span class="t-system">[SISTEM]</span> Rogue TLS Server aktif di port 8883.');
  await delay(300);
  addRogueLog('<span class="t-system">[SISTEM]</span> Menunggu koneksi masuk dari node IoT...');

  // === Step 1: DNS Query ===
  await delay(800);
  setMitmStep(1, 'active');
  addDnsLog('');
  addDnsLog('<span class="t-error">[!] MENCEGAT REQUEST DNS dari 192.168.1.105 untuk maroonhoney-9a9267a5.a03.euc1.aws.hivemq.cloud</span>');
  await delay(500);
  addDnsLog('<span class="t-error">[!] Mengirimkan jawaban beracun (Poisoned IP): 10.211.119.98</span>');

  // Activate first arrow animation
  document.getElementById('mitm-arrow-1').classList.add('packet-active');

  // === Step 2: TCP Connect ===
  await delay(1000);
  setMitmStep(1, 'done');
  setMitmStep(2, 'active');
  addRogueLog('');
  addRogueLog('<span class="t-info">[INFO]</span> Koneksi TCP dari <span class="t-warn">(\'192.168.1.105\', 49832)</span> diterima.');
  await delay(500);
  addRogueLog('<span class="t-info">[INFO]</span> Mengirimkan Server Hello dan Sertifikat (Palsu)...');

  // === Step 3: Fake Certificate ===
  await delay(1000);
  setMitmStep(2, 'done');
  setMitmStep(3, 'active');
  addRogueLog('');
  addRogueLog('<span class="t-dim">        Sertifikat yang dikirim:</span>');
  addRogueLog('<span class="t-dim">        CN = <span class="t-error">Fake-HiveMQ</span></span>');
  addRogueLog('<span class="t-dim">        Issuer = Self-Signed</span>');
  addRogueLog('<span class="t-dim">        Key = RSA 2048-bit</span>');

  // === Step 4: FAIL-SECURE ===
  await delay(1200);
  setMitmStep(3, 'done');
  setMitmStep(4, 'fail');

  // Stop packet animation
  document.getElementById('mitm-arrow-1').classList.remove('packet-active');

  // Show blocked X
  document.getElementById('mitm-blocked-x').classList.add('visible');

  addRogueLog('');
  addRogueLog('<span class="t-success">[SUKSES] Koneksi TLS ditolak oleh klien (Fail-Secure).</span>');
  await delay(400);
  addRogueLog('<span class="t-success">[ALASAN] [SSL: TLSV1_ALERT_UNKNOWN_CA] tlsv1 alert unknown ca (_ssl.c:1000)</span>');

  // Show result banner
  await delay(600);
  document.getElementById('result-secure').classList.add('visible');

  // Finalize
  btnStart.innerHTML = '✅ Simulasi Selesai';
  mitmRunning = false;
}

function resetMITM() {
  mitmRunning = false;

  const btnStart = document.getElementById('btn-start-mitm');
  const btnReset = document.getElementById('btn-reset-mitm');
  btnStart.disabled = false;
  btnReset.disabled = true;
  btnStart.innerHTML = '💀 Mulai Simulasi Serangan';

  // Clear logs
  document.getElementById('dns-log').innerHTML = '';
  document.getElementById('rogue-log').innerHTML = '';

  // Reset steps
  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById(`mitm-step-${i}`);
    step.classList.remove('step-active', 'step-done', 'step-fail');
  }

  // Hide result
  document.getElementById('result-secure').classList.remove('visible');

  // Reset arrows
  document.getElementById('mitm-arrow-1').classList.remove('packet-active');
  document.getElementById('mitm-blocked-x').classList.remove('visible');
}

function setMitmStep(num, state) {
  const step = document.getElementById(`mitm-step-${num}`);
  step.classList.remove('step-active', 'step-done', 'step-fail');
  if (state === 'active') step.classList.add('step-active');
  if (state === 'done') step.classList.add('step-done');
  if (state === 'fail') step.classList.add('step-fail');
}


// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setStatus(key, text, state, icon) {
  const el = document.getElementById(`status-${key}`);
  const iconEl = document.getElementById(`status-${key}-icon`);
  el.textContent = text;
  iconEl.className = `status-indicator status-${state}`;
  iconEl.textContent = icon;
}

function getDefaultIcon(key) {
  const icons = { wifi: '📶', ntp: '🕐', mqtt: '🔌', gps: '🛰️' };
  return icons[key] || '⚪';
}

function activateArrows(ids) {
  ids.forEach(id => {
    document.getElementById(`arrow-${id}`).classList.add('arrow-active');
  });
}

function deactivateArrows() {
  [1, 2, 3].forEach(id => {
    const el = document.getElementById(`arrow-${id}`);
    if (el) el.classList.remove('arrow-active');
  });
}

function formatJsonHighlight(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/([{}])/g, '<span class="json-brace">$1</span>')
    .replace(/\n/g, '<br>');
}

function addSerialLog(text) {
  const log = document.getElementById('serial-log');
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.innerHTML = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function addDnsLog(text) {
  const log = document.getElementById('dns-log');
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.innerHTML = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function addRogueLog(text) {
  const log = document.getElementById('rogue-log');
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.innerHTML = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
