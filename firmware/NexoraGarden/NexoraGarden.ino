#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WebSocketsClient.h>
#include <time.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>

#define CALIBRATE_MODE

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ST7789 _panel_instance;
  lgfx::Bus_SPI      _bus_instance;
public:
  LGFX(void) {
    { auto cfg = _bus_instance.config(); cfg.spi_host = VSPI_HOST; cfg.spi_mode = 0; cfg.freq_write = 40000000; cfg.freq_read = 16000000; cfg.pin_sclk = 18; cfg.pin_mosi = 23; cfg.pin_miso = -1; cfg.pin_dc = 2; _bus_instance.config(cfg); _panel_instance.setBus(&_bus_instance); }
    { auto cfg = _panel_instance.config(); cfg.pin_cs = 5; cfg.pin_rst = 4; cfg.pin_busy = -1; cfg.panel_width = 240; cfg.panel_height = 240; cfg.offset_x = 0; cfg.offset_y = 0; cfg.invert = true; cfg.rgb_order = false; _panel_instance.config(cfg); }
    setPanel(&_panel_instance);
  }
};
LGFX tft;

#define DHTPIN 13
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);
float localTemp = -999.0;
float localHum  = -999.0;

const char* ssids[]     = {"Tuan Kha 5G", "Trong Khang", "Vnpt 2022"};
const char* passwords[] = {"tuankha2015", "khongbiet123", "vnpt270922"};
const int   NUM_WIFI    = 3;

// FIX: Cập nhật server mới (nexorax.cloud thay vì nexoragarden.onrender.com)
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";

const char* WEATHER_URL =
  "http://api.weatherapi.com/v1/forecast.json"
  "?key=b92581d628b74fda87d123430261103"
  "&q=10.2537,105.9722&days=1&aqi=no&alerts=no";

#define SOIL_PIN   32
#define WATER_PIN  33
#define FIRE_PIN   34
#define RELAY_PIN  26
#define RAIN_PIN   25

#define SOIL_RAW_DRY    3200
#define SOIL_RAW_WET    1200
#define WATER_RAW_EMPTY  100
#define WATER_RAW_FULL  2500

#define SAMPLE_COUNT    10
#define SAMPLE_DELAY_MS  2
#define EMA_ALPHA_SOIL  0.30f   // tăng từ 0.15 → phản ứng nhanh hơn 2x
#define EMA_ALPHA_WATER 0.35f   // tăng từ 0.20 → phản ứng nhanh hơn

#define PUMP_SOIL_ON   30
#define PUMP_SOIL_OFF  70
#define PUMP_MAX_MS    25000

// Event-driven: chỉ gửi khi thay đổi đủ lớn
// Fallback: gửi tối đa mỗi 4s — server timeout 30s, đủ buffer
#define SEND_INTERVAL_MAX  4000
#define SOIL_THRESHOLD     2
#define WATER_THRESHOLD    2
#define TEMP_THRESHOLD     0.5f
#define HUM_THRESHOLD      2.0f

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
bool soilInitialized  = false;  // lần đầu đọc: bypass EMA, lấy thẳng
bool waterInitialized = false;

volatile float weatherTempC      = 0;
volatile int   weatherHumidity   = 0;
volatile float weatherWind       = 0;
volatile int   weatherRainChance = 0;

float tempC      = 0;
int   humidity   = 0;
float wind       = 0;
int   rainChance = 0;

unsigned long lastWeather     = 0;
unsigned long lastSend        = 0;
unsigned long lastDHT         = 0;
unsigned long lastSerial      = 0;
unsigned long lastCal         = 0;
unsigned long lastDraw        = 0;
unsigned long lastConnected   = 0;  // lần cuối wsConnected=true
#define WS_WATCHDOG_MS  180000UL    // 3 phút không kết nối → tự restart

int  soilPercent  = 0;
int  waterPercent = 0;
bool pumpState    = false;

int   lastSentSoil  = -999;
int   lastSentWater = -999;
float lastSentTemp  = -999.0;
float lastSentHum   = -999.0;
bool  lastSentFire  = false;
bool  lastSentRain  = false;

unsigned long fireStartTime = 0;
bool          fireActive    = false;
bool          fireAlerted   = false;
bool          rainAlerted     = false;
bool          lowWaterAlerted = false;
bool          headerDrawn     = false;

unsigned long pumpStartTime        = 0;
unsigned long pumpAutoCooldownUntil = 0;  // thời điểm cho phép bơm tự động lại
uint8_t       pumpAutoFailCount    = 0;   // đếm số lần bơm tự động thất bại liên tiếp
bool          pumpLocked     = false;
bool          pumpAutoActive = false;
bool          manualUnlock   = false;
bool          adminActive    = false;

#define PUMP_AUTO_COOLDOWN_MS  600000UL   // 10 phút cooldown sau mỗi lần bơm tự động
#define PUMP_SENSOR_ERR_LOCK   7200000UL  // 2 tiếng khóa nếu cảm biến bị lỗi (3 lần thất bại liên tiếp)
#define PUMP_MAX_FAIL_COUNT    3          // số lần thất bại trước khi coi cảm biến lỗi
bool          wifiWasConnected = false;
bool          tftOn           = true;
int8_t        tftPending      = -1;
bool          pumpPending     = false;
unsigned long pumpPendingTime = 0;

WebSocketsClient webSocket;

// volatile: viết bởi wsTask (Core 0), đọc bởi main loop (Core 1)
volatile bool wsConnected   = false;
volatile bool sendOnConnect = false;

// ─── FreeRTOS: WebSocket task trên Core 0 ─────────────────────────────────────
// webSocket.loop() block trong SSL handshake → TFT bị đứng nhiều giây
// Giải pháp: tách hoàn toàn ra Core 0, Core 1 chạy TFT/cảm biến liên tục
QueueHandle_t wsSendQueue  = NULL;
TaskHandle_t  wsTaskHandle = NULL;

// Lệnh nhận từ server — được set bởi webSocketEvent callback (Core 0)
// Core 1 đọc và xử lý để tránh đụng độ SPI/GPIO
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

// ─── FreeRTOS: Weather task trên Core 0 ─────────────────────────────────────
TaskHandle_t  weatherTaskHandle = NULL;
volatile bool weatherBusy       = false;

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
// ─────────────────────────────────────────────────────────────────────────────


int getMedian(int* arr, int n) {
  for (int i = 1; i < n; i++) {
    int key = arr[i], j = i - 1;
    while (j >= 0 && arr[j] > key) { arr[j+1] = arr[j]; j--; }
    arr[j+1] = key;
  }
  int sum = 0;
  for (int i = 2; i < n-2; i++) sum += arr[i];
  return sum / (n-4);
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

// wsSend: enqueue message → wsTask (Core 0) sẽ gửi
// Core 1 KHÔNG gọi webSocket.sendTXT() trực tiếp
void wsSend(JsonDocument& doc) {
  if (!wsConnected || wsSendQueue == NULL) return;
  String out; serializeJson(doc, out);
  char* buf = (char*)malloc(out.length() + 1);
  if (!buf) return;
  memcpy(buf, out.c_str(), out.length() + 1);
  if (xQueueSend(wsSendQueue, &buf, pdMS_TO_TICKS(10)) != pdTRUE) {
    free(buf); // queue đầy — bỏ qua
  }
}

void sendNotify(String message) {
  if (!wsConnected) return;
  JsonDocument doc; doc["type"] = "notify"; doc["message"] = message; wsSend(doc);
}

void sendPreWater() {
  if (!wsConnected) return;
  JsonDocument doc; doc["type"] = "pre_water"; wsSend(doc);
  Serial.println("[Bom] Gui tin hieu pre_water");
}

bool shouldSendData() {
  bool rainNow = (digitalRead(RAIN_PIN) == LOW);
  bool fireNow = fireActive && fireAlerted;
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
  bool rainNow = (digitalRead(RAIN_PIN) == LOW);
  bool fireNow = fireActive && fireAlerted;
  JsonDocument doc;
  doc["type"]  = "sensor"; doc["soil"]  = soilPercent; doc["water"] = waterPercent;
  doc["temp"]  = localTemp; doc["hum"]   = localHum;
  doc["fire"]  = fireNow; doc["rain"] = rainNow;
  doc["pump"]  = pumpState;
  wsSend(doc);
  lastSentSoil  = soilPercent;
  lastSentWater = waterPercent;
  lastSentTemp  = localTemp;
  lastSentHum   = localHum;
  lastSentFire  = fireNow;
  lastSentRain  = rainNow;
  lastSend      = millis();
}

void drawTFT();

void setPump(bool on) {
  pumpState = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  if (on) {
    pumpStartTime = millis();
    Serial.println("[Bom] BAT");
  } else {
    Serial.println("[Bom] TAT");
    headerDrawn = false;
    lastDraw = 0;  // FIX 1: reset lastDraw để drawTFT() được gọi ngay khi tắt bơm
    tft.fillScreen(tft.color565(0, 0, 0));
  }
}

// webSocketEvent chạy trên Core 0 (trong wsTask)
// KHÔNG gọi setPump/drawTFT/GPIO ở đây — chỉ set volatile flags
// Core 1 (main loop) sẽ đọc pendingCmd và xử lý an toàn
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      sendOnConnect = true;
      Serial.println("[WS] Ket noi thanh cong!"); break;
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Mat ket noi, dang thu lai..."); break;
    case WStype_TEXT: {
      JsonDocument doc;
      if (!deserializeJson(doc, payload, length)) {
        String t = doc["type"] | "";
        if (t == "command") {
          if (doc["pump"].is<String>()) {
            pendingCmd.pumpOn  = (String(doc["pump"] | "OFF") == "ON");
            pendingCmd.hasPump = true;
          }
          if (doc["unlock"].is<String>()) {
            pendingCmd.unlockOn  = (String(doc["unlock"] | "OFF") == "ON");
            pendingCmd.hasUnlock = true;
          }
          if (doc["tft"].is<String>()) {
            pendingCmd.tftOn  = (String(doc["tft"] | "ON") == "ON");
            pendingCmd.hasTft = true;
          }
          if (doc["admin"].is<String>()) {
            pendingCmd.adminOn  = (String(doc["admin"] | "OFF") == "ON");
            pendingCmd.hasAdmin = true;
          }
        }
      }
      break;
    }
    default: break;
  }
}

// wsTask chạy trên Core 0:
// - Gọi webSocket.loop() (có thể block trong SSL handshake)
// - Gửi messages từ wsSendQueue
// Core 1 (main loop) không bao giờ block vì SSL nữa
void wsTask(void* pvParameters) {
  webSocket.beginSSL(SERVER_HOST, SERVER_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(1000);
  webSocket.enableHeartbeat(15000, 8000, 1);
  Serial.println("[WS] Task khoi tao tren Core 0");

  for (;;) {
    // Gửi messages đang chờ trong queue
    char* buf = nullptr;
    while (xQueueReceive(wsSendQueue, &buf, 0) == pdTRUE) {
      if (buf) { webSocket.sendTXT(buf); free(buf); buf = nullptr; }
    }
    webSocket.loop();          // block khi SSL handshake — OK vì trên Core 0
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void handlePump() {
  if (adminActive) return;

  unsigned long now = millis();
  if (pumpState) {
    int raw = analogRead(SOIL_PIN);
    int liveSoil = 0;
    if (raw >= 100 && raw <= 4090) {
      liveSoil = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
      liveSoil = constrain(liveSoil, 1, 100);
    }
    bool timeout = (now - pumpStartTime >= PUMP_MAX_MS);
    bool soilOK  = (liveSoil >= PUMP_SOIL_OFF);
    if (timeout || soilOK) {
      setPump(false); pumpLocked = true; soilPercent = liveSoil;
      String reason = timeout ? "het 25s" : "dat du am " + String(liveSoil) + "%";
      sendNotify("May bom da dung: " + reason);

      if (pumpAutoActive) {
        if (soilOK) {
          // Bơm thành công → đất đủ ẩm, reset bộ đếm lỗi
          pumpAutoFailCount = 0;
          pumpAutoCooldownUntil = now + PUMP_AUTO_COOLDOWN_MS;
          Serial.println("[Bom] Tu dong thanh cong, cooldown 10 phut");
        } else {
          // Bơm hết 25s mà đất vẫn chưa ẩm → tính là thất bại
          pumpAutoFailCount++;
          Serial.printf("[Bom] That bai lan %d/%d\n", pumpAutoFailCount, PUMP_MAX_FAIL_COUNT);
          if (pumpAutoFailCount >= PUMP_MAX_FAIL_COUNT) {
            // Nghi cảm biến lỗi → khóa auto-pump 2 tiếng
            pumpAutoCooldownUntil = now + PUMP_SENSOR_ERR_LOCK;
            pumpAutoFailCount = 0;
            sendNotify("⚠️ CANH BAO: Cam bien dat co the bi loi! Do am luon thap nhung bom khong cai thien duoc. Auto-pump bi khoa 2 tieng. Kiem tra cam bien.");
            Serial.println("[Bom] CAM BIEN LOI — khoa auto-pump 2 tieng");
          } else {
            pumpAutoCooldownUntil = now + PUMP_AUTO_COOLDOWN_MS;
            sendNotify("⚠️ Bom tu dong het 25s nhung dat chua du am (" + String(liveSoil) + "%). Cho 10 phut roi thu lai.");
          }
        }
        pumpAutoActive = false;
      }
    } else {
      soilPercent = liveSoil;
      tft.fillScreen(tft.color565(0,0,0));
      tft.setTextSize(2);
      tft.setTextColor(tft.color565(0,255,255), tft.color565(0,0,0));
      tft.setCursor(20, 80); tft.println("  Dang tuoi cay");
      tft.setCursor(20, 120);
      tft.setTextColor(tft.color565(255,255,255), tft.color565(0,0,0));
      tft.printf("  Do am: %d %%   ", liveSoil);
      tft.setCursor(20, 155);
      tft.setTextColor(tft.color565(255,255,0), tft.color565(0,0,0));
      tft.printf("  Thoi gian: %lus ", (now - pumpStartTime) / 1000);
    }
    return;
  }

  // FIX 3: thêm manualUnlock = false để clear flag sau khi xử lý
  if (manualUnlock) { pumpPending = false; pumpLocked = false; manualUnlock = false; pumpAutoFailCount = 0; return; }

  // Chỉ mở khóa auto-pump khi đã qua cooldown — fix bug bơm liên tục
  if (pumpLocked && soilPercent < PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    pumpLocked = false;
    Serial.println("[Bom] Mo khoa (het cooldown)");
  }

  if (pumpPending) {
    if (now - pumpPendingTime >= 1500) {
      pumpPending = false;
      setPump(true); pumpAutoActive = true;
      sendNotify("Tu dong bat bom: do am dat " + String(soilPercent) + "%");
    }
    return;
  }

  // Chỉ trigger auto nếu đã qua cooldown
  if (!pumpLocked && soilPercent >= 1 && soilPercent <= PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    sendPreWater();
    pumpPending     = true;
    pumpPendingTime = now;
    Serial.println("[Bom] Chuan bi tuoi — cho 1.5 giay sau pre_water...");
  }
}

void updateSoil() {
  int samples[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) { samples[i] = analogRead(SOIL_PIN); delay(SAMPLE_DELAY_MS); }
  int raw = getMedian(samples, SAMPLE_COUNT);
  if (raw < 50 || raw > 4090) { soilState.isError = true; soilPercent = 0; return; }
  soilState.isError = false;
  int mapped = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  mapped = constrain(mapped, 0, 100);
  // Lần đầu boot: lấy thẳng giá trị thực, không EMA từ 0
  if (!soilInitialized) {
    soilState.emaValue = (float)mapped;
    soilInitialized = true;
  } else {
    soilState.emaValue = EMA_ALPHA_SOIL * mapped + (1.0f - EMA_ALPHA_SOIL) * soilState.emaValue;
  }
  soilState.prevValue    = soilState.displayValue;
  soilState.displayValue = (int)round(soilState.emaValue);
  updateTrend(soilState, soilState.displayValue);
  soilPercent = soilState.displayValue;
}

void updateWater() {
  if (pumpState) return;
  int samples[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) { samples[i] = analogRead(WATER_PIN); delay(SAMPLE_DELAY_MS); }
  int raw = getMedian(samples, SAMPLE_COUNT);
  if (raw > 4090) { waterState.isError = true; waterPercent = 0; return; }
  waterState.isError = false;
  int mapped;
  // Linear mapping từ đầu tới cuối — không có dead zone nữa
  if (raw < WATER_RAW_EMPTY) {
    mapped = 0;
  } else {
    mapped = map(raw, WATER_RAW_EMPTY, WATER_RAW_FULL, 0, 100);
    mapped = constrain(mapped, 0, 100);
  }
  // Lần đầu boot: lấy thẳng giá trị thực, không EMA từ 0
  if (!waterInitialized) {
    waterState.emaValue = (float)mapped;
    waterInitialized = true;
  } else {
    waterState.emaValue = EMA_ALPHA_WATER * mapped + (1.0f - EMA_ALPHA_WATER) * waterState.emaValue;
  }
  waterState.prevValue    = waterState.displayValue;
  waterState.displayValue = (int)round(waterState.emaValue);
  updateTrend(waterState, waterState.displayValue);
  waterPercent = waterState.displayValue;
  if (waterPercent < 10) {  // hạ ngưỡng cảnh báo từ 15% → 10%
    if (!lowWaterAlerted) {
      lowWaterAlerted = true;
      sendNotify("CANH BAO: Muc nuoc trong binh duoi 10%! Can bo sung nuoc.");
    }
  } else { lowWaterAlerted = false; }
}

void updateDHT() {
  if (pumpState) return;
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(t) && !isnan(h)) { localTemp = t; localHum = h; }
}

void handleFire() {
  if (pumpState) { fireActive = false; fireAlerted = false; fireStartTime = 0; return; }
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
  bool rainNow = (digitalRead(RAIN_PIN) == LOW);
  if (rainNow && !rainAlerted) { sendNotify("Phat hien co nuoc tren cam bien, co the co mua!"); rainAlerted = true; }
  else if (!rainNow && rainAlerted) rainAlerted = false;
}

void drawTFT() {
  if (!tftOn)    return;
  if (pumpState) return;

  if (!headerDrawn) {
    tft.fillScreen(tft.color565(0, 0, 0));
    tft.setTextSize(2);
    tft.setTextColor(tft.color565(0, 255, 255), tft.color565(0, 0, 0));
    tft.setCursor(15, 5); tft.println(" NEXORA GARDEN ");
    tft.drawFastHLine(0, 30, 240, tft.color565(0, 255, 0));
    headerDrawn = true;
  }

  tft.setTextSize(2); tft.setTextPadding(230);

  tft.setCursor(5, 45); tft.setTextColor(tft.color565(255, 255, 255), tft.color565(0, 0, 0));
  if (localTemp == -999.0) tft.print("Nhiet: Dang do...");
  else { char buf[24]; snprintf(buf, sizeof(buf), "Nhiet: %.1f C  ", localTemp); tft.print(buf); }

  tft.setCursor(5, 75); tft.setTextColor(tft.color565(255, 255, 255), tft.color565(0, 0, 0));
  if (localHum == -999.0) tft.print("Am kk: Dang do...");
  else { char buf[24]; snprintf(buf, sizeof(buf), "Am kk: %.1f %%  ", localHum); tft.print(buf); }

  tft.setCursor(5, 105);
  if (soilState.isError || soilPercent == 0) {
    tft.setTextColor(tft.color565(255, 0, 0), tft.color565(0, 0, 0));
    tft.print("Dat: KHONG CO   ");
  } else {
    uint16_t soilColor = soilPercent < 30 ? tft.color565(255, 80, 0) : tft.color565(0, 220, 100);
    tft.setTextColor(soilColor, tft.color565(0, 0, 0));
    char buf[24]; snprintf(buf, sizeof(buf), "Dat: %3d %% %s  ", soilPercent,
      soilState.trend == 1 ? "^" : soilState.trend == -1 ? "v" : "-");
    tft.print(buf);
  }

  tft.setCursor(5, 135);
  if (waterPercent < 10) {
    tft.setTextColor(tft.color565(255, 0, 0), tft.color565(0, 0, 0));
    tft.print("Nuoc: THAP <10%");
  } else {
    tft.setTextColor(tft.color565(255, 255, 255), tft.color565(0, 0, 0));
    char buf[20]; snprintf(buf, sizeof(buf), "Nuoc: %3d %%   ", waterPercent); tft.print(buf);
  }

  tft.setCursor(5, 165); tft.setTextColor(tft.color565(255, 255, 0), tft.color565(0, 0, 0));
  char bufGio[24]; snprintf(bufGio, sizeof(bufGio), "Gio: %.1f km/h   ", wind); tft.print(bufGio);

  tft.setCursor(5, 195); tft.setTextColor(tft.color565(100, 220, 255), tft.color565(0, 0, 0));
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 0)) {
    char bufTime[24];
    snprintf(bufTime, sizeof(bufTime), "Gio: %02d:%02d:%02d  ", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    tft.print(bufTime);
  } else { tft.print("Gio: --:--:--  "); }

  tft.setTextPadding(0);
}

void printSerial() {
  const char* tr[] = {"v", "-", "^"};
  Serial.println("========= NEXORA GARDEN =========");
  Serial.printf("  [WS]    : %s\n", wsConnected ? "Ket noi" : "Mat ket noi");
  Serial.printf("  [Dat]   : %d %% %s %s\n", soilPercent,  tr[soilState.trend+1],  soilState.isError  ? "[LOI]" : "");
  Serial.printf("  [Nuoc]  : %d %% %s %s\n", waterPercent, tr[waterState.trend+1], waterState.isError ? "[LOI]" : "");
  if (localTemp == -999.0) Serial.println("  [Nhiet] : Dang do...");
  else Serial.printf("  [Nhiet] : %.1f C\n", localTemp);
  if (localHum == -999.0) Serial.println("  [Am]    : Dang do...");
  else Serial.printf("  [Am]    : %.1f %%\n", localHum);
  Serial.printf("  [Mua]   : %d %%\n",    rainChance);
  Serial.printf("  [Gio]   : %.1f km/h\n", wind);
  Serial.printf("  [Lua]   : %s\n",    fireActive ? "CO" : "Khong");
  Serial.printf("  [Mua cb]: %s\n",    digitalRead(RAIN_PIN) == LOW ? "CO NUOC" : "Kho");
  Serial.printf("  [Bom]   : %s%s%s\n", pumpState ? "BAT" : "TAT",
    pumpLocked ? " (KHOA)" : "", adminActive ? " [ADMIN]" : "");
  Serial.println("=================================");
}

#ifdef CALIBRATE_MODE
void printCalibrate() {
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

void connectWiFi() {
  for (int i = 0; i < NUM_WIFI; i++) {
    Serial.print("[WiFi] Thu: "); Serial.println(ssids[i]);
    WiFi.disconnect(); WiFi.begin(ssids[i], passwords[i]);
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20) { delay(500); Serial.print("."); tries++; }
    if (WiFi.status() == WL_CONNECTED) { Serial.printf("\n[WiFi] OK: %s\n", WiFi.localIP().toString().c_str()); return; }
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
      // Chỉ reinit WebSocket nếu chưa kết nối
      if (!wsConnected && wsTaskHandle != NULL) {
        // Notify wsTask để reinit WebSocket
        // wsTask đang loop() và sẽ tự reconnect qua setReconnectInterval
        Serial.println("[WiFi] WiFi phuc hoi — wsTask tu xu ly reconnect");
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(SOIL_PIN,  INPUT);
  pinMode(WATER_PIN, INPUT);
  pinMode(FIRE_PIN,  INPUT);
  pinMode(RAIN_PIN,  INPUT);
  pinMode(RELAY_PIN, OUTPUT); digitalWrite(RELAY_PIN, LOW);

  dht.begin(); delay(2500);
  tft.init(); tft.setRotation(0); tft.fillScreen(tft.color565(0,0,0));
  tft.setTextColor(tft.color565(255,255,255)); tft.setTextSize(2);
  tft.setCursor(30, 100); tft.println("Dang ket noi...");

  connectWiFi();
  wifiWasConnected = (WiFi.status() == WL_CONNECTED);

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov", "asia.pool.ntp.org");
  Serial.println("[NTP] Dang dong bo gio Viet Nam...");

  // Tạo FreeRTOS queue cho outgoing WebSocket messages
  wsSendQueue = xQueueCreate(16, sizeof(char*));

  // wsTask trên Core 0 — xử lý SSL WebSocket, KHÔNG block Core 1
  xTaskCreatePinnedToCore(wsTask, "wsTask", 16384, NULL, 2, &wsTaskHandle, 0);
  Serial.println("[WS] Task khoi tao tren Core 0");

  // weatherTask trên Core 0 — HTTP non-blocking
  xTaskCreatePinnedToCore(weatherTask, "weatherTask", 8192, NULL, 1, &weatherTaskHandle, 0);
  Serial.println("[Weather] Task khoi tao tren Core 0");

  tft.fillScreen(tft.color565(0,0,0));
  tft.setCursor(10, 80); tft.println("Nexora OK!");
  tft.setCursor(10, 110); tft.setTextSize(1); tft.println(WiFi.localIP().toString());
  delay(1500);

  tft.fillScreen(tft.color565(0,0,0));
  updateSoil(); updateWater(); updateDHT(); drawTFT();

  triggerWeatherUpdate();
  lastWeather = millis();

#ifdef CALIBRATE_MODE
  Serial.println("[CALIBRATE MODE] Bat dau do raw...");
#endif
  Serial.println("[System] San sang! Core 1: sensors+TFT | Core 0: WebSocket+Weather");
}

void loop() {
  unsigned long now = millis();
  // webSocket.loop() đã được chuyển sang wsTask (Core 0)
  // Core 1 chạy tự do — TFT không bao giờ bị đứng vì SSL nữa

  if (sendOnConnect && wsConnected) {
    sendOnConnect = false;
    sendSensorData();
  }

  // WebSocket watchdog: nếu không kết nối được trong WS_WATCHDOG_MS → restart
  if (wsConnected) {
    lastConnected = now;
  } else if (lastConnected == 0) {
    lastConnected = now; // khởi tạo lần đầu
  } else if (now - lastConnected > WS_WATCHDOG_MS) {
    Serial.println("[Watchdog] Khong ket noi WS trong 3 phut — dang restart...");
    delay(500);
    esp_restart();
  }

  handleWiFi();

  // Xử lý lệnh từ server (set bởi webSocketEvent trên Core 0)
  if (pendingCmd.hasPump) {
    pendingCmd.hasPump = false;
    bool newState = pendingCmd.pumpOn;
    pumpPending = false;
    // FIX 2: bỏ điều kiện soilPercent <= PUMP_SOIL_ON && !pumpLocked
    // để lệnh thủ công từ dashboard luôn được thực thi
    if (newState && !pumpState) {
      setPump(true); pumpAutoActive = false;
    } else if (!newState && pumpState) {
      setPump(false); pumpLocked = true;
    }
  }
  if (pendingCmd.hasUnlock) {
    pendingCmd.hasUnlock = false;
    // FIX 5: thêm pumpAutoCooldownUntil = 0 khi unlock để xóa cooldown
    if (pendingCmd.unlockOn) { pumpLocked = false; pumpAutoCooldownUntil = 0; Serial.println("[Unlock] Mo khoa bom tu dong"); }
    else                     { pumpLocked = true;  Serial.println("[Unlock] Khoa bom tu dong"); }
  }
  if (pendingCmd.hasTft) {
    pendingCmd.hasTft = false;
    tftOn     = pendingCmd.tftOn;
    tftPending = tftOn ? 1 : 0;
    Serial.printf("[TFT] Nhan lenh: %s\n", tftOn ? "BAT" : "TAT");
  }
  if (pendingCmd.hasAdmin) {
    pendingCmd.hasAdmin = false;
    if (pendingCmd.adminOn) {
      adminActive = true; pumpLocked = false; manualUnlock = false;
      setPump(true); pumpAutoActive = false;
      Serial.println("[Admin] BAT bom buoc");
    } else {
      adminActive = false; setPump(false); pumpLocked = false;
      Serial.println("[Admin] TAT bom buoc");
    }
  }

  updateSoil();
  updateWater();
  handleFire();
  handleRain();
  handlePump();

  if (tftPending != -1) {
    if (tftPending == 0) { tft.fillScreen(tft.color565(0, 0, 0)); Serial.println("[TFT] Tat"); }
    // FIX 4: thêm lastDraw = 0 để drawTFT() được gọi ngay sau khi bật TFT
    else                 { headerDrawn = false; lastDraw = 0; Serial.println("[TFT] Bat"); }
    tftPending = -1;
  }

  if (!pumpState && now - lastDraw > 500) { drawTFT(); lastDraw = now; }

#ifdef CALIBRATE_MODE
  printCalibrate();
#endif

  if (wsConnected && (now - lastSend >= SEND_INTERVAL_MAX || shouldSendData())) {
    sendSensorData();
  }

  if (now - lastDHT    > 2000) { updateDHT();   lastDHT    = now; }
  if (now - lastSerial > 2000) { printSerial();  lastSerial = now; }

  if (now - lastWeather > 600000) {
    lastWeather = now;
    triggerWeatherUpdate();
  }
  syncWeatherToMain();

  delay(10);
}
