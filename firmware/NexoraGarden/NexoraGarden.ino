// ═══════════════════════════════════════════════════════════════
//  NexoraGarden — ESP32 Firmware
//  Author : Phan Trọng Khang
//  Server : nexorax.cloud/NexoraGarden/ws
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WebSocketsClient.h>
#include <time.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>

// ─── Bật chế độ calibrate (comment ra khi dùng thực tế) ──────────────────────
// #define CALIBRATE_MODE

// ─── TFT Hardware ─────────────────────────────────────────────────────────────
class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ST7789 _panel_instance;
  lgfx::Bus_SPI      _bus_instance;
public:
  LGFX(void) {
    {
      auto cfg = _bus_instance.config();
      cfg.spi_host  = VSPI_HOST; cfg.spi_mode    = 0;
      cfg.freq_write= 40000000;  cfg.freq_read    = 16000000;
      cfg.pin_sclk  = 18;        cfg.pin_mosi     = 23;
      cfg.pin_miso  = -1;        cfg.pin_dc       = 2;
      _bus_instance.config(cfg); _panel_instance.setBus(&_bus_instance);
    }
    {
      auto cfg = _panel_instance.config();
      cfg.pin_cs    = 5;   cfg.pin_rst  = 4;   cfg.pin_busy   = -1;
      cfg.panel_width = 240; cfg.panel_height = 240;
      cfg.offset_x  = 0;   cfg.offset_y = 0;
      cfg.invert    = true; cfg.rgb_order = false;
      _panel_instance.config(cfg);
    }
    setPanel(&_panel_instance);
  }
};
LGFX tft;

// ─── Màu TFT ─────────────────────────────────────────────────────────────────
#define C_BLACK    tft.color565(0,   0,   0  )
#define C_WHITE    tft.color565(255, 255, 255)
#define C_CYAN     tft.color565(0,   255, 255)
#define C_GREEN    tft.color565(0,   220, 100)
#define C_YELLOW   tft.color565(255, 255, 0  )
#define C_ORANGE   tft.color565(255, 140, 0  )
#define C_RED      tft.color565(255, 50,  50 )
#define C_GRAY     tft.color565(120, 120, 120)
#define C_DIMWHITE tft.color565(180, 180, 180)
#define C_BLUE     tft.color565(80,  150, 255)
#define C_LIME     tft.color565(50,  255, 50 )

// ─── DHT22 ────────────────────────────────────────────────────────────────────
#define DHTPIN   13
#define DHTTYPE  DHT22
DHT dht(DHTPIN, DHTTYPE);
float localTemp = -999.0;
float localHum  = -999.0;

// ─── WiFi ─────────────────────────────────────────────────────────────────────
const char* ssids[]     = {"phantrongkhangg", "Tuan Kha 5G", "Trong Khang", "Vnpt 2022"};
const char* passwords[] = {"26042012khang", "tuankha2015", "khongbiet123", "vnpt270922"};
const int   NUM_WIFI    = 4;

// ─── Server ───────────────────────────────────────────────────────────────────
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";

// ─── Weather API ──────────────────────────────────────────────────────────────
const char* WEATHER_URL =
  "http://api.weatherapi.com/v1/forecast.json"
  "?key=b92581d628b74fda87d123430261103"
  "&q=10.2537,105.9722&days=1&aqi=no&alerts=no";

// ─── GPIO ─────────────────────────────────────────────────────────────────────
#define SOIL_PIN   32
#define WATER_PIN  33
#define FIRE_PIN   34
#define RELAY_PIN  26
#define RAIN_PIN   25

// ─── Hiệu chỉnh cảm biến ─────────────────────────────────────────────────────
#define SOIL_RAW_DRY     3200
#define SOIL_RAW_WET     1200
#define WATER_RAW_EMPTY   100
#define WATER_RAW_FULL   2500

// ─── Lấy mẫu & lọc ───────────────────────────────────────────────────────────
#define SAMPLE_COUNT     10
#define SAMPLE_DELAY_MS   2
#define EMA_ALPHA_SOIL   0.08f
#define EMA_ALPHA_WATER  0.15f

// ─── Hiệu chỉnh đa điểm cảm biến đất (Cách 2) ───────────────────────────────
// Đo giá trị ADC thực tế tại các mức ẩm biết trước, điền vào đây
// raw PHẢI giảm dần (đất khô → raw cao, đất ướt → raw thấp)
struct CalPoint { int raw; int percent; };
const CalPoint SOIL_CAL[] = {
  { 3200,   0 },  // Ngoài không khí / đất khô hoàn toàn
  { 2800,  20 },  // Đất hơi ẩm
  { 2200,  45 },  // Đất ẩm vừa
  { 1700,  70 },  // Đất ẩm tốt
  { 1200, 100 },  // Nhúng vào nước
};
const int CAL_POINTS = sizeof(SOIL_CAL) / sizeof(SOIL_CAL[0]);

// ─── Bù nhiệt độ cảm biến đất (Cách 3) ──────────────────────────────────────
// Nhiệt độ cao → cảm biến đọc thấp hơn thực → cộng bù vào
#define SOIL_TEMP_REF    25.0f  // Nhiệt độ lúc cân chỉnh (°C)
#define SOIL_TEMP_ALPHA   0.30f // Hệ số bù: % độ ẩm / °C lệch

// ─── Ngưỡng bơm ──────────────────────────────────────────────────────────────
#define PUMP_SOIL_ON    30
#define PUMP_SOIL_OFF   70
#define PUMP_MAX_MS     25000

// ─── Ngưỡng gửi dữ liệu ──────────────────────────────────────────────────────
#define SEND_INTERVAL_MAX  4000
#define SOIL_THRESHOLD     2
#define WATER_THRESHOLD    2
#define TEMP_THRESHOLD     0.5f
#define HUM_THRESHOLD      2.0f

// ─── An toàn bơm tự động ─────────────────────────────────────────────────────
#define PUMP_AUTO_COOLDOWN_MS  600000UL   // 10 phút cooldown
#define PUMP_SENSOR_ERR_LOCK   7200000UL  // 2 tiếng lock khi cảm biến lỗi
#define PUMP_MAX_FAIL_COUNT    3

// ─── Timing ───────────────────────────────────────────────────────────────────
#define SOIL_READ_INTERVAL_MS   800
#define WATER_READ_INTERVAL_MS  800
#define WS_WATCHDOG_MS          180000UL

// ═══════════════════════════════════════════════════════════════
//  BIẾN TOÀN CỤC
// ═══════════════════════════════════════════════════════════════

// ─── Sensor State ─────────────────────────────────────────────────────────────
struct SensorState {
  float   emaValue;
  int     displayValue;
  int     prevValue;
  bool    isError;
  int8_t  trend;
  int     trendBuffer[5];
  uint8_t trendIdx;
};

SensorState soilState  = { 0.0f, 0, 0, false, 0, {0,0,0,0,0}, 0 };
SensorState waterState = { 0.0f, 0, 0, false, 0, {0,0,0,0,0}, 0 };
bool soilInitialized  = false;
bool waterInitialized = false;

// ─── Thời tiết (volatile: viết bởi Core 0, đọc bởi Core 1) ──────────────────
volatile float weatherTempC      = 0;
volatile int   weatherHumidity   = 0;
volatile float weatherWind       = 0;
volatile int   weatherRainChance = 0;
float tempC      = 0;
int   humidity   = 0;
float wind       = 0;
int   rainChance = 0;

// ─── Timing counters ──────────────────────────────────────────────────────────
unsigned long lastWeather   = 0;
unsigned long lastSend      = 0;
unsigned long lastDHT       = 0;
unsigned long lastSerial    = 0;
unsigned long lastSoilRead  = 0;
unsigned long lastWaterRead = 0;
unsigned long lastConnected = 0;

// ─── Sensor values ───────────────────────────────────────────────────────────
int  soilPercent  = 0;
int  waterPercent = 0;
bool pumpState    = false;

int   lastSentSoil  = -999;
int   lastSentWater = -999;
float lastSentTemp  = -999.0;
float lastSentHum   = -999.0;
bool  lastSentFire  = false;
bool  lastSentRain  = false;

// ─── Cờ cảnh báo ─────────────────────────────────────────────────────────────
unsigned long fireStartTime   = 0;
bool          fireActive      = false;
bool          fireAlerted     = false;
bool          rainAlerted     = false;
bool          lowWaterAlerted = false;

// ─── Trạng thái bơm ──────────────────────────────────────────────────────────
unsigned long pumpStartTime         = 0;
unsigned long pumpAutoCooldownUntil = 0;
time_t        lastPumpEpoch         = 0;  // epoch lúc bơm lần cuối được bật
uint8_t       pumpAutoFailCount     = 0;
bool          pumpLocked     = false;
bool          pumpAutoActive = false;
bool          manualUnlock   = false;
bool          adminActive    = false;
bool          pumpPending    = false;
unsigned long pumpPendingTime = 0;

// ─── TFT ─────────────────────────────────────────────────────────────────────
bool          tftOn          = true;   // bật/tắt qua server
int8_t        tftPending     = -1;     // -1=không đổi, 0=tắt, 1=bật
bool          tftForceRedraw = false;  // vẽ ngay lập tức
unsigned long tftLastDraw    = 0;
bool          tftWasOn       = true;   // phát hiện lúc tftOn vừa bị tắt
unsigned long tftReinitAt    = 0;      // relay noise delay: reinit TFT sau 150ms

// ─── FreeRTOS / WebSocket ─────────────────────────────────────────────────────
WebSocketsClient webSocket;
volatile bool wsConnected   = false;
volatile bool sendOnConnect = false;

QueueHandle_t wsSendQueue      = NULL;
TaskHandle_t  wsTaskHandle     = NULL;
TaskHandle_t  weatherTaskHandle = NULL;
volatile bool weatherBusy      = false;

bool wifiWasConnected = false;

// Pending commands từ server (viết Core 0, đọc Core 1)
struct PendingCmd {
  volatile bool hasPump;
  volatile bool pumpOn;
  volatile bool hasUnlock;
  volatile bool unlockOn;
  volatile bool hasTft;
  volatile bool tftOn;
  volatile bool hasAdmin;
  volatile bool adminOn;
};
PendingCmd pendingCmd = {};

// ═══════════════════════════════════════════════════════════════
//  FREEERTOS TASKS (Core 0)
// ═══════════════════════════════════════════════════════════════

void weatherTask(void* pvParameters) {
  for (;;) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(WEATHER_URL);
      http.setTimeout(5000);
      int code = http.GET();
      if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        if (!deserializeJson(doc, payload)) {
          weatherTempC      = doc["current"]["temp_c"]    | 0.0f;
          weatherHumidity   = doc["current"]["humidity"]  | 0;
          weatherWind       = doc["current"]["wind_kph"]  | 0.0f;
          weatherRainChance = doc["forecast"]["forecastday"][0]["day"]["daily_chance_of_rain"] | 0;
          Serial.println("[Weather] Cap nhat thanh cong");
        }
      }
      http.end();
    }
    weatherBusy = false;
  }
}

void triggerWeatherUpdate() {
  if (!weatherBusy && weatherTaskHandle != NULL) {
    weatherBusy = true;
    xTaskNotifyGive(weatherTaskHandle);
  }
}

void syncWeatherToMain() {
  if (!weatherBusy) {
    tempC      = weatherTempC;
    humidity   = weatherHumidity;
    wind       = weatherWind;
    rainChance = weatherRainChance;
  }
}

// ─── WebSocket send helper (thread-safe qua queue) ────────────────────────────
void wsSend(JsonDocument& doc) {
  if (!wsConnected || wsSendQueue == NULL) return;
  String out; serializeJson(doc, out);
  char* buf = (char*)malloc(out.length() + 1);
  if (!buf) return;
  memcpy(buf, out.c_str(), out.length() + 1);
  if (xQueueSend(wsSendQueue, &buf, pdMS_TO_TICKS(10)) != pdTRUE) {
    free(buf);
  }
}

void sendNotify(String message) {
  if (!wsConnected) return;
  JsonDocument doc; doc["type"] = "notify"; doc["message"] = message;
  wsSend(doc);
}

void sendPreWater() {
  if (!wsConnected) return;
  JsonDocument doc; doc["type"] = "pre_water";
  wsSend(doc);
  Serial.println("[Bom] Gui tin hieu pre_water");
}

// ─── webSocketEvent chạy trên Core 0 ─────────────────────────────────────────
// KHÔNG gọi GPIO / TFT / setPump ở đây — chỉ set volatile flags
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected   = true;
      sendOnConnect = true;
      Serial.println("[WS] Ket noi thanh cong!");
      break;
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Mat ket noi, dang thu lai...");
      break;
    case WStype_TEXT: {
      JsonDocument doc;
      if (!deserializeJson(doc, payload, length)) {
        String t = doc["type"] | "";
        if (t == "command") {
          if (doc["pump"].is<String>())   { pendingCmd.pumpOn    = (String(doc["pump"]   | "OFF") == "ON"); pendingCmd.hasPump   = true; }
          if (doc["unlock"].is<String>()) { pendingCmd.unlockOn  = (String(doc["unlock"] | "OFF") == "ON"); pendingCmd.hasUnlock = true; }
          if (doc["tft"].is<String>())    { pendingCmd.tftOn     = (String(doc["tft"]    | "ON")  == "ON"); pendingCmd.hasTft   = true; }
          if (doc["admin"].is<String>())  { pendingCmd.adminOn   = (String(doc["admin"]  | "OFF") == "ON"); pendingCmd.hasAdmin = true; }
        }
      }
      break;
    }
    default: break;
  }
}

// ─── wsTask chạy trên Core 0 ─────────────────────────────────────────────────
void wsTask(void* pvParameters) {
  webSocket.beginSSL(SERVER_HOST, SERVER_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(1000);
  webSocket.enableHeartbeat(15000, 8000, 2);  // 2 retry: chiu duoc 1 pong cham, tranh reconnect loop
  Serial.println("[WS] Task khoi tao tren Core 0");
  for (;;) {
    char* buf = nullptr;
    while (xQueueReceive(wsSendQueue, &buf, 0) == pdTRUE) {
      if (buf) { webSocket.sendTXT(buf); free(buf); buf = nullptr; }
    }
    webSocket.loop();
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ═══════════════════════════════════════════════════════════════
//  SENSOR
// ═══════════════════════════════════════════════════════════════

int getMedian(int* arr, int n) {
  if (n < 5) { return arr[n / 2]; }  // an toan: tranh chia cho 0 khi n < 5
  for (int i = 1; i < n; i++) {
    int key = arr[i], j = i - 1;
    while (j >= 0 && arr[j] > key) { arr[j+1] = arr[j]; j--; }
    arr[j+1] = key;
  }
  int sum = 0;
  for (int i = 2; i < n-2; i++) sum += arr[i];
  return sum / (n-4);
}

// ─── Nội suy tuyến tính đa điểm (Cách 2) ─────────────────────────────────────
// raw giảm dần tương ứng percent tăng dần trong SOIL_CAL
int multiPointMap(int raw) {
  if (raw >= SOIL_CAL[0].raw)                    return SOIL_CAL[0].percent;
  if (raw <= SOIL_CAL[CAL_POINTS - 1].raw)       return SOIL_CAL[CAL_POINTS - 1].percent;
  for (int i = 0; i < CAL_POINTS - 1; i++) {
    if (raw <= SOIL_CAL[i].raw && raw >= SOIL_CAL[i + 1].raw) {
      return (int)map(raw, SOIL_CAL[i].raw, SOIL_CAL[i + 1].raw,
                          SOIL_CAL[i].percent, SOIL_CAL[i + 1].percent);
    }
  }
  return 0;
}

void updateTrend(SensorState& s, int newVal) {
  s.trendBuffer[s.trendIdx] = newVal;
  s.trendIdx = (s.trendIdx + 1) % 5;
  int oldAvg = (s.trendBuffer[s.trendIdx % 5] + s.trendBuffer[(s.trendIdx+1) % 5]) / 2;
  int newAvg = (s.trendBuffer[(s.trendIdx+3) % 5] + s.trendBuffer[(s.trendIdx+4) % 5]) / 2;
  if      (newAvg - oldAvg >= 3) s.trend = +1;
  else if (oldAvg - newAvg >= 3) s.trend = -1;
  else                            s.trend =  0;
}

void updateSoil() {
  int samples[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) { samples[i] = analogRead(SOIL_PIN); delay(SAMPLE_DELAY_MS); }
  int raw = getMedian(samples, SAMPLE_COUNT);
  if (raw < 50 || raw > 4090) { soilState.isError = true; soilPercent = 0; return; }
  soilState.isError = false;

  // Cách 2: Nội suy đa điểm thay cho map() tuyến tính đơn giản
  int mapped = constrain(multiPointMap(raw), 0, 100);

  // Cách 3: Bù nhiệt độ dùng DHT22 (nhiệt độ cao → cảm biến đọc thấp hơn thực)
  if (localTemp > -100.0f) {
    float comp = SOIL_TEMP_ALPHA * (localTemp - SOIL_TEMP_REF);
    mapped = constrain((int)(mapped + comp), 0, 100);
  }

  if (!soilInitialized) { soilState.emaValue = (float)mapped; soilInitialized = true; }
  else soilState.emaValue = EMA_ALPHA_SOIL * mapped + (1.0f - EMA_ALPHA_SOIL) * soilState.emaValue;
  soilState.prevValue    = soilState.displayValue;
  soilState.displayValue = (int)round(soilState.emaValue);
  updateTrend(soilState, soilState.displayValue);
  soilPercent = soilState.displayValue;
}

void updateWater() {
  // Bỏ guard pumpState: cảm biến nước dùng pin riêng, không bị ảnh hưởng bởi relay
  int samples[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) { samples[i] = analogRead(WATER_PIN); delay(SAMPLE_DELAY_MS); }
  int raw = getMedian(samples, SAMPLE_COUNT);
  if (raw > 4090) { waterState.isError = true; waterPercent = 0; return; }
  waterState.isError = false;
  int mapped;
  if (raw == 0) {
    // Cảm biến bị thiếu khúc đáy → raw=0 nghĩa là nước đã xuống tới đó
    // → giữ ở 10% để hiển thị cảnh báo thấp (dưới 15%)
    mapped = 10;
  } else if (raw < WATER_RAW_EMPTY) {
    mapped = 0;
  } else {
    mapped = constrain(map(raw, WATER_RAW_EMPTY, WATER_RAW_FULL, 0, 100), 0, 100);
  }
  if (!waterInitialized) { waterState.emaValue = (float)mapped; waterInitialized = true; }
  else waterState.emaValue = EMA_ALPHA_WATER * mapped + (1.0f - EMA_ALPHA_WATER) * waterState.emaValue;
  waterState.prevValue    = waterState.displayValue;
  waterState.displayValue = (int)round(waterState.emaValue);
  updateTrend(waterState, waterState.displayValue);
  waterPercent = waterState.displayValue;
  if (waterPercent <= 15) {
    if (!lowWaterAlerted) { lowWaterAlerted = true; sendNotify("CANH BAO: Muc nuoc trong binh duoi 15%! Can bo sung nuoc."); }
  } else { lowWaterAlerted = false; }
}

void updateDHT() {
  // Không skip khi đang bơm — DHT22 hoàn toàn độc lập với relay
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(t) && !isnan(h)) { localTemp = t; localHum = h; }
}

void handleFire() {
  // Cảm biến lửa luôn hoạt động kể cả khi đang bơm
  bool fireNow = (digitalRead(FIRE_PIN) == LOW);
  if (fireNow) {
    if (!fireActive) { fireActive = true; fireStartTime = millis(); fireAlerted = false; }
    else if (!fireAlerted && millis() - fireStartTime >= 3000) {
      sendNotify("CANH BAO KHAN CAP: Phat hien CHAY lien tuc 3 giay!");
      fireAlerted = true;
    }
  } else { fireActive = false; fireAlerted = false; fireStartTime = 0; }
}

void handleRain() {
  // Khi bơm đang bật: bỏ qua cảm biến mưa (nước bơm bắn vào gây nhiễu)
  if (pumpState) { rainAlerted = false; return; }
  bool rainNow = (digitalRead(RAIN_PIN) == LOW);
  if (rainNow && !rainAlerted) {
    sendNotify("Phat hien co nuoc tren cam bien, co the co mua!");
    rainAlerted = true;
  } else if (!rainNow && rainAlerted) {
    rainAlerted = false;
  }
}

bool shouldSendData() {
  // Khi bơm bật: rain bị force false, bỏ qua thay đổi rain
  bool rainNow = pumpState ? false : (digitalRead(RAIN_PIN) == LOW);
  bool fireNow = fireActive;  // Gui ngay khi phat hien, khong cho 3s debounce (debounce chi danh cho notify Telegram)
  if (abs(soilPercent  - lastSentSoil)  >= SOIL_THRESHOLD)  return true;
  if (abs(waterPercent - lastSentWater) >= WATER_THRESHOLD)  return true;
  if (localTemp != -999.0 && abs(localTemp - lastSentTemp) >= TEMP_THRESHOLD) return true;
  if (localHum  != -999.0 && abs(localHum  - lastSentHum)  >= HUM_THRESHOLD)  return true;
  if (fireNow != lastSentFire) return true;
  if (rainNow != lastSentRain) return true;
  return false;
}

void sendSensorData() {
  if (!wsConnected) return;
  // Khi bơm bật: cảm biến mưa bị nhiễu → gửi false để server không xử lý nhầm
  bool rainNow = pumpState ? false : (digitalRead(RAIN_PIN) == LOW);
  bool fireNow = fireActive;  // Gui ngay khi phat hien lua (debounce 3s chi danh cho notify Telegram)
  JsonDocument doc;
  doc["type"]  = "sensor"; doc["soil"]  = soilPercent;  doc["water"] = waterPercent;
  doc["temp"]  = localTemp; doc["hum"]   = localHum;
  doc["fire"]  = fireNow;   doc["rain"]  = rainNow;      doc["pump"]  = pumpState;
  wsSend(doc);
  lastSentSoil  = soilPercent;  lastSentWater = waterPercent;
  lastSentTemp  = localTemp;    lastSentHum   = localHum;
  lastSentFire  = fireNow;      lastSentRain  = rainNow;
  lastSend      = millis();
}

// ═══════════════════════════════════════════════════════════════
//  BƠM
// ═══════════════════════════════════════════════════════════════

// setPump: KHÔNG gọi tft.fillScreen() ở đây
// TFT manager (manageTFT) sẽ phát hiện thay đổi pumpState và tự xử lý
void setPump(bool on) {
  pumpState = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  if (on) {
    pumpStartTime = millis();
    time(&lastPumpEpoch);  // ghi thời gian NTP khi bơm được bật
    Serial.println("[Bom] BAT");
  } else {
    Serial.println("[Bom] TAT");
  }
  // Relay click gây SPI noise → schedule reinit TFT sau 150ms thay vì force draw ngay
  tftReinitAt = millis() + 150;
}

void handlePump() {
  if (adminActive) return;

  unsigned long now = millis();
  if (pumpState) {
    // Đọc soil trực tiếp khi đang bơm (không qua EMA) để check ngưỡng dừng
    int raw = analogRead(SOIL_PIN);
    int liveSoil = 0;
    if (raw >= 100 && raw <= 4090) {
      // Dung multiPointMap nhu updateSoil() de liveSoil nhat quan voi soilPercent hien thi
      liveSoil = max(1, constrain(multiPointMap(raw), 0, 100));
    }
    bool timeout = (now - pumpStartTime >= PUMP_MAX_MS);
    bool soilOK  = (liveSoil >= PUMP_SOIL_OFF);

    if (timeout || soilOK) {
      setPump(false); pumpLocked = true;
      // Cập nhật soilPercent với giá trị live để TFT pump screen hiển thị đúng
      soilPercent = liveSoil;
      String reason = timeout ? "het 25s" : "dat du am " + String(liveSoil) + "%";
      sendNotify("May bom da dung: " + reason);
      if (pumpAutoActive) {
        if (soilOK) {
          pumpAutoFailCount = 0;
          pumpAutoCooldownUntil = now + PUMP_AUTO_COOLDOWN_MS;
          Serial.println("[Bom] Tu dong thanh cong, cooldown 10 phut");
        } else {
          pumpAutoFailCount++;
          Serial.printf("[Bom] That bai lan %d/%d\n", pumpAutoFailCount, PUMP_MAX_FAIL_COUNT);
          if (pumpAutoFailCount >= PUMP_MAX_FAIL_COUNT) {
            pumpAutoCooldownUntil = now + PUMP_SENSOR_ERR_LOCK;
            pumpAutoFailCount = 0;
            sendNotify("CANH BAO: Cam bien dat co the bi loi! Auto-pump bi khoa 2 tieng.");
          } else {
            pumpAutoCooldownUntil = now + PUMP_AUTO_COOLDOWN_MS;
            sendNotify("Bom tu dong het 25s nhung dat chua du am (" + String(liveSoil) + "%). Cho 10 phut roi thu lai.");
          }
        }
        pumpAutoActive = false;
      }
    } else {
      // Cập nhật soilPercent với giá trị live khi đang bơm
      soilPercent = liveSoil;
    }
    return;
  }

  // Xử lý manualUnlock: reset pumpLocked và cooldown
  if (manualUnlock) { pumpPending = false; pumpLocked = false; manualUnlock = false; pumpAutoFailCount = 0; return; }

  // Tự mở khóa khi đã qua cooldown
  if (pumpLocked && soilPercent < PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    pumpLocked = false;
    Serial.println("[Bom] Mo khoa (het cooldown)");
  }

  // Pre-water pending: chờ 1.5s rồi bật bơm
  if (pumpPending) {
    if (now - pumpPendingTime >= 1500) {
      pumpPending = false;
      setPump(true); pumpAutoActive = true;
      sendNotify("Tu dong bat bom: do am dat " + String(soilPercent) + "%");
    }
    return;
  }

  // Trigger bơm tự động
  if (!pumpLocked && soilPercent >= 1 && soilPercent <= PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    sendPreWater();
    pumpPending     = true;
    pumpPendingTime = now;
    Serial.println("[Bom] Chuan bi tuoi — cho 1.5 giay sau pre_water...");
  }
}

// ═══════════════════════════════════════════════════════════════
//  TFT — MÀN HÌNH DUY NHẤT (luôn vẽ, không chuyển màn)
// ═══════════════════════════════════════════════════════════════
//  - 1 màn duy nhất hiển thị sensor + pump + WS + thời tiết
//  - setTextPadding(240) + bg C_BLACK đảm bảo mỗi dòng tự xóa in-place
//  - Bơm bật/tắt: chỉ cập nhật dòng Bơm, không làm flicker màn
//  - Chỉ dừng khi tftOn=false (nút server) hoặc mất điện
// ─────────────────────────────────────────────────────────────────────────────

void drawMainScreen() {
  tft.setTextSize(2);
  tft.setTextPadding(240);

  // Dòng 1: Tiêu đề + chấm WS
  tft.setTextColor(C_CYAN, C_BLACK);
  tft.setCursor(5, 2); tft.print(" NEXORA GARDEN");
  tft.fillCircle(228, 10, 6, wsConnected ? C_LIME : C_RED);
  tft.drawFastHLine(0, 21, 240, C_GREEN);

  // Dòng 2: Nhiệt độ
  tft.setCursor(5, 26); tft.setTextColor(C_WHITE, C_BLACK);
  if (localTemp == -999.0) tft.print("Nhiet: ---.-C  ");
  else { char b[22]; snprintf(b, sizeof(b), "Nhiet: %5.1f C  ", localTemp); tft.print(b); }

  // Dòng 3: Độ ẩm KK
  tft.setCursor(5, 46); tft.setTextColor(C_WHITE, C_BLACK);
  if (localHum == -999.0) tft.print("Am KK: ---.-%  ");
  else { char b[22]; snprintf(b, sizeof(b), "Am KK: %5.1f %%  ", localHum); tft.print(b); }

  // Dòng 4: Độ ẩm đất
  tft.setCursor(5, 66);
  if (soilState.isError || soilPercent == 0) {
    tft.setTextColor(C_RED, C_BLACK); tft.print("Dat:  KHONG CO  ");
  } else {
    uint16_t col = soilPercent <= PUMP_SOIL_ON ? C_ORANGE : C_GREEN;
    tft.setTextColor(col, C_BLACK);
    const char* tr = soilState.trend == 1 ? "^" : soilState.trend == -1 ? "v" : "-";
    char b[22]; snprintf(b, sizeof(b), "Dat:  %3d %% %s    ", soilPercent, tr);
    tft.print(b);
  }

  // Dòng 5: Mức nước
  tft.setCursor(5, 86);
  if (waterState.isError) {
    tft.setTextColor(C_RED, C_BLACK); tft.print("Nuoc: KHONG CO  ");
  } else if (waterPercent <= 15) {
    tft.setTextColor(C_RED, C_BLACK);
    char b[22]; snprintf(b, sizeof(b), "Nuoc: THAP %2d%%  ", waterPercent); tft.print(b);
  } else {
    tft.setTextColor(C_WHITE, C_BLACK);
    char b[22]; snprintf(b, sizeof(b), "Nuoc: %3d %%      ", waterPercent); tft.print(b);
  }

  // Dòng 6: Gió
  tft.setCursor(5, 106); tft.setTextColor(C_YELLOW, C_BLACK);
  { char b[22]; snprintf(b, sizeof(b), "Gio: %5.1f km/h  ", wind); tft.print(b); }

  // Dòng 7: Trạng thái bơm (inline)
  tft.setCursor(5, 126);
  if (pumpState) {
    if (adminActive)        { tft.setTextColor(C_ORANGE, C_BLACK); tft.print("Bom: BAT [ADMIN] "); }
    else if (pumpAutoActive){ tft.setTextColor(C_LIME,   C_BLACK); tft.print("Bom: BAT [AUTO]  "); }
    else                    { tft.setTextColor(C_CYAN,   C_BLACK); tft.print("Bom: BAT [TAY]   "); }
  } else if (pumpPending) {
    bool bl = (millis() / 400) % 2;
    tft.setTextColor(bl ? C_GREEN : C_LIME, C_BLACK);
    tft.print("Bom: CHO TUOI...");
  } else if (pumpLocked) {
    tft.setTextColor(C_GRAY, C_BLACK); tft.print("Bom: TAT [KHOA]  ");
  } else {
    tft.setTextColor(C_DIMWHITE, C_BLACK); tft.print("Bom: TAT         ");
  }

  // Dòng 8: Giờ thực
  tft.setCursor(5, 146); tft.setTextColor(C_BLUE, C_BLACK);
  struct tm ti;
  if (getLocalTime(&ti, 0)) {
    char b[22]; snprintf(b, sizeof(b), "Gio: %02d:%02d:%02d    ", ti.tm_hour, ti.tm_min, ti.tm_sec);
    tft.print(b);
  } else { tft.print("Gio: --:--:--   "); }

  tft.drawFastHLine(0, 166, 240, C_GRAY);

  // ── Phần dưới size=1 ──────────────────────────────────────────────────────
  tft.setTextSize(1);
  tft.setTextPadding(240);

  // Dòng 9: WS + WiFi
  bool wifiOk = (WiFi.status() == WL_CONNECTED);
  tft.setCursor(5, 170);
  tft.setTextColor(wsConnected ? C_LIME : C_RED, C_BLACK);
  char wsBuf[38]; snprintf(wsBuf, sizeof(wsBuf), "%-18s%-18s",
    wsConnected ? "WS: ONLINE" : "WS: OFFLINE",
    wifiOk      ? "WiFi: OK"   : "WiFi: MAT KET NOI");
  tft.print(wsBuf);

  // Dòng 10: Fire / Rain / Admin / Khóa
  tft.setCursor(5, 182);
  bool rainNow = (digitalRead(RAIN_PIN) == LOW);
  char status[42] = "";
  if (adminActive)              strcat(status, "[ADMIN] ");
  if (pumpLocked && !pumpState) strcat(status, "[KHOA] ");
  if (fireActive)   { strcat(status, "CANH BAO LUA!"); tft.setTextColor(C_RED,  C_BLACK); }
  else if (rainNow) { strcat(status, "CO MUA");         tft.setTextColor(C_BLUE, C_BLACK); }
  else              { tft.setTextColor(C_GRAY, C_BLACK); }
  if (!fireActive && !rainNow && !adminActive && !(pumpLocked && !pumpState))
    strcat(status, "Binh thuong");
  char padded[42]; snprintf(padded, sizeof(padded), "%-37s", status);
  tft.print(padded);

  // Dòng 11: Bơm gần đây
  tft.setCursor(5, 194); tft.setTextColor(C_DIMWHITE, C_BLACK);
  if (lastPumpEpoch == 0) {
    tft.print("Bom gan day: Chua co           ");
  } else {
    struct tm pt; localtime_r(&lastPumpEpoch, &pt);
    char b[36]; snprintf(b, sizeof(b), "Bom gan day: %02d:%02d  %02d/%02d          ",
                         pt.tm_hour, pt.tm_min, pt.tm_mday, pt.tm_mon + 1);
    tft.print(b);
  }

  // Dòng 12: Thời tiết
  tft.setCursor(5, 206); tft.setTextColor(C_GRAY, C_BLACK);
  { char b[38]; snprintf(b, sizeof(b), "TT: %.0fC  Am:%d%%  Mua:%d%%  Gio:%.0fkm/h  ",
                         tempC, humidity, rainChance, wind);
    tft.print(b); }

  // Dòng 13: Progress bơm (khi đang bơm)
  if (pumpState) {
    unsigned long el = min((millis() - pumpStartTime) / 1000UL, 25UL);
    tft.setCursor(5, 218);
    tft.setTextColor(el >= 20 ? C_ORANGE : C_CYAN, C_BLACK);
    char b[38]; snprintf(b, sizeof(b), "Tuoi: %2lus/25s  Muc tieu: dat>=%d%%    ",
                         el, PUMP_SOIL_OFF);
    tft.print(b);
  } else {
    // fillRect đảm bảo xóa sạch — không dùng setTextColor(black,black) tránh lỗi bg ignored
    tft.fillRect(0, 215, 240, 14, C_BLACK);
  }
}

// ─── TFT Manager ─────────────────────────────────────────────────────────────
void manageTFT() {
  // Vừa bị tắt → xóa màn 1 lần rồi dừng
  if (!tftOn) {
    if (tftWasOn) {
      tft.fillScreen(C_BLACK);
      tftWasOn = false;
    }
    tftForceRedraw = false;
    tftReinitAt    = 0;
    return;
  }
  // Vừa bật lại → force redraw
  if (!tftWasOn) {
    tftWasOn       = true;
    tftForceRedraw = true;
  }

  unsigned long now = millis();

  // Relay noise reinit: sau relay click đợi 150ms → fillScreen + redraw
  if (tftReinitAt != 0 && now >= tftReinitAt) {
    tftReinitAt = 0;
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(C_BLACK);
    tftForceRedraw = true;
    tftLastDraw    = now;
    Serial.println("[TFT] Reinit sau relay click");
  }

  // Watchdog: nếu TFT không vẽ > 2s → reinit để phục hồi nếu bị kẹt
  if (tftReinitAt == 0 && (now - tftLastDraw > 2000)) {
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(C_BLACK);
    tftForceRedraw = true;
    tftLastDraw    = now;
    Serial.println("[TFT] Watchdog reinit");
  }

  bool shouldDraw = tftForceRedraw || (now - tftLastDraw >= 500);
  if (!shouldDraw) return;
  tftForceRedraw = false;
  tftLastDraw    = now;
  drawMainScreen();
}

// ═══════════════════════════════════════════════════════════════
//  WIFI
// ═══════════════════════════════════════════════════════════════

void connectWiFi() {
  for (int i = 0; i < NUM_WIFI; i++) {
    Serial.print("[WiFi] Thu: "); Serial.println(ssids[i]);
    WiFi.disconnect(); WiFi.begin(ssids[i], passwords[i]);
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20) { delay(500); Serial.print("."); tries++; }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[WiFi] OK: %s\n", WiFi.localIP().toString().c_str());
      return;
    }
  }
}

void handleWiFi() {
  bool connected = (WiFi.status() == WL_CONNECTED);
  if (!connected) {
    wifiWasConnected = false;
    static unsigned long lastAttempt = 0;
    static int wifiIdx = 0;
    unsigned long now = millis();
    if (now - lastAttempt > 12000) {
      lastAttempt = now;
      Serial.printf("[WiFi] Ket noi lai voi: %s\n", ssids[wifiIdx]);
      WiFi.disconnect(); WiFi.begin(ssids[wifiIdx], passwords[wifiIdx]);
      wifiIdx = (wifiIdx + 1) % NUM_WIFI;
    }
  } else {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.printf("[WiFi] Da ket noi lai: %s\n", WiFi.localIP().toString().c_str());
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  SERIAL DEBUG
// ═══════════════════════════════════════════════════════════════

void printSerial() {
  const char* tr[] = {"v", "-", "^"};
  Serial.println("========= NEXORA GARDEN =========");
  Serial.printf("  [WS]    : %s\n", wsConnected ? "Ket noi" : "Mat ket noi");
  Serial.printf("  [TFT]   : %s\n", tftOn ? "ON" : "OFF");
  Serial.printf("  [Dat]   : %d %% %s %s\n", soilPercent,  tr[soilState.trend+1],  soilState.isError  ? "[LOI]" : "");
  Serial.printf("  [Nuoc]  : %d %% %s %s\n", waterPercent, tr[waterState.trend+1], waterState.isError ? "[LOI]" : "");
  if (localTemp == -999.0) Serial.println("  [Nhiet] : Dang do...");
  else Serial.printf("  [Nhiet] : %.1f C\n", localTemp);
  if (localHum  == -999.0) Serial.println("  [Am]    : Dang do...");
  else Serial.printf("  [Am]    : %.1f %%\n", localHum);
  Serial.printf("  [Gio]   : %.1f km/h | Mua: %d %%\n", wind, rainChance);
  Serial.printf("  [Lua]   : %s | [Mua cb]: %s\n",
    fireActive ? "CO" : "Khong", digitalRead(RAIN_PIN) == LOW ? "CO NUOC" : "Kho");
  Serial.printf("  [Bom]   : %s%s%s%s\n",
    pumpState    ? "BAT" : "TAT",
    pumpLocked   ? " (KHOA)"    : "",
    adminActive  ? " [ADMIN]"   : "",
    pumpPending  ? " [PENDING]" : "");
  Serial.println("=================================");
}

#ifdef CALIBRATE_MODE
void printCalibrate() {
  static unsigned long lastCal = 0;
  if (millis() - lastCal < 500) return;
  lastCal = millis();
  int rawSoil  = analogRead(SOIL_PIN);
  int rawWater = analogRead(WATER_PIN);
  Serial.println("====== CALIBRATE ======");
  Serial.printf("  Dat  raw: %4d  -> %d %%\n", rawSoil,  soilPercent);
  Serial.printf("  Nuoc raw: %4d  -> %d %%\n", rawWater, waterPercent);
  Serial.println("=======================");
}
#endif

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  // Chờ nguồn ổn định — adapter cần lâu hơn pin 18650
  delay(500);

  // Cách 1: Đảm bảo ADC đọc đúng dải 0-3.3V (không bị cắt ở 1.1V)
  analogSetAttenuation(ADC_11db);

  pinMode(SOIL_PIN,  INPUT);
  pinMode(WATER_PIN, INPUT);
  pinMode(FIRE_PIN,  INPUT);
  pinMode(RAIN_PIN,  INPUT);
  pinMode(RELAY_PIN, OUTPUT); digitalWrite(RELAY_PIN, LOW);

  dht.begin();

  // TFT khởi tạo — delay thêm để nguồn adapter ổn định trước khi SPI init
  delay(300);
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(C_BLACK);
  tft.setTextColor(C_WHITE); tft.setTextSize(2);
  tft.setCursor(30, 100); tft.println("Dang ket noi...");

  delay(2000);
  connectWiFi();
  wifiWasConnected = (WiFi.status() == WL_CONNECTED);
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov", "asia.pool.ntp.org");

  // FreeRTOS tasks
  wsSendQueue = xQueueCreate(16, sizeof(char*));
  xTaskCreatePinnedToCore(wsTask,      "wsTask",      16384, NULL, 2, &wsTaskHandle,     0);
  xTaskCreatePinnedToCore(weatherTask, "weatherTask",  8192, NULL, 1, &weatherTaskHandle, 0);
  Serial.println("[WS]      Task khoi tao tren Core 0");
  Serial.println("[Weather] Task khoi tao tren Core 0");

  // Màn hình khởi động OK
  tft.fillScreen(C_BLACK);
  tft.setTextSize(2); tft.setTextColor(C_GREEN);
  tft.setCursor(10, 80);  tft.println("Nexora OK!");
  tft.setTextSize(1); tft.setTextColor(C_WHITE);
  tft.setCursor(10, 110); tft.println(WiFi.localIP().toString());
  delay(1500);

  // Đọc sensor lần đầu trước khi vào loop
  tft.fillScreen(C_BLACK);
  updateSoil(); updateWater(); updateDHT();

  // Khởi tạo TFT
  tftWasOn       = true;
  tftForceRedraw = true;
  tftLastDraw    = millis();  // init để watchdog không trigger ngay lúc đầu

  triggerWeatherUpdate();
  lastWeather = millis();

  Serial.println("[System] San sang! Core 1: sensors+TFT | Core 0: WebSocket+Weather");
}

// ═══════════════════════════════════════════════════════════════
//  LOOP (Core 1)
// ═══════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // Gửi dữ liệu ngay khi WS vừa kết nối
  if (sendOnConnect && wsConnected) {
    sendOnConnect = false;
    sendSensorData();
  }

  // Watchdog: không kết nối WS trong 3 phút → restart
  if (wsConnected) {
    lastConnected = now;
  } else if (lastConnected == 0) {
    lastConnected = now;
  } else if (now - lastConnected > WS_WATCHDOG_MS) {
    Serial.println("[Watchdog] Khong ket noi WS trong 3 phut — dang restart...");
    delay(500);
    esp_restart();
  }

  handleWiFi();

  // ── Xử lý lệnh từ server ──
  if (pendingCmd.hasPump) {
    pendingCmd.hasPump = false;
    bool newState = pendingCmd.pumpOn;
    pumpPending = false;
    if (newState && !pumpState) {
      setPump(true); pumpAutoActive = false;
    } else if (!newState && pumpState) {
      setPump(false); pumpLocked = true;
    }
  }
  if (pendingCmd.hasUnlock) {
    pendingCmd.hasUnlock = false;
    if (pendingCmd.unlockOn) { pumpLocked = false; pumpAutoCooldownUntil = 0; Serial.println("[Unlock] Mo khoa bom tu dong"); }
    else                     { pumpLocked = true;  Serial.println("[Unlock] Khoa bom tu dong"); }
    manualUnlock = pendingCmd.unlockOn;
  }
  if (pendingCmd.hasTft) {
    pendingCmd.hasTft = false;
    tftOn    = pendingCmd.tftOn;
    tftForceRedraw = true;
    Serial.printf("[TFT] Nhan lenh: %s\n", tftOn ? "BAT" : "TAT");
  }
  if (pendingCmd.hasAdmin) {
    pendingCmd.hasAdmin = false;
    if (pendingCmd.adminOn) {
      adminActive = true; pumpLocked = false; manualUnlock = false;
      setPump(true); pumpAutoActive = false;
      Serial.println("[Admin] BAT bom buoc");
    } else {
      adminActive = false;
      setPump(false);
      pumpLocked = true;
      pumpAutoCooldownUntil = millis() + PUMP_AUTO_COOLDOWN_MS;  // cooldown 10 phut tranh auto-pump ngay lap tuc
      Serial.println("[Admin] TAT bom buoc — khoa + cooldown 10 phut");
    }
  }

  // ── Đọc sensor ──
  if (now - lastSoilRead  >= SOIL_READ_INTERVAL_MS)  { updateSoil();  lastSoilRead  = now; }
  if (now - lastWaterRead >= WATER_READ_INTERVAL_MS)  { updateWater(); lastWaterRead = now; }
  if (now - lastDHT       > 2000)                     { updateDHT();   lastDHT       = now; }
  handleFire();
  handleRain();
  handlePump();

  // ── TFT state machine ──
  manageTFT();

  // ── Gửi dữ liệu sensor ──
  if (wsConnected && (now - lastSend >= SEND_INTERVAL_MAX || shouldSendData())) {
    sendSensorData();
  }

  // ── Thời tiết ──
  if (now - lastWeather > 600000) { lastWeather = now; triggerWeatherUpdate(); }
  syncWeatherToMain();

  // ── Serial debug ──
  if (now - lastSerial > 2000) { printSerial(); lastSerial = now; }

#ifdef CALIBRATE_MODE
  printCalibrate();
#endif

  delay(10);
}
