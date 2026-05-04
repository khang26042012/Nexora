// ===============================================================
//  NexoraGarden -- ESP32 Firmware
//  Author : Phan Trong Khang
//  Server : nexorax.cloud/NexoraGarden/ws
// ===============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WebSocketsClient.h>
#include <WebServer.h>
#include <time.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>

// --- Bat che do calibrate (comment ra khi dung thuc te) ----------------------
// #define CALIBRATE_MODE

// --- TFT Hardware -------------------------------------------------------------
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

// --- Mau TFT -----------------------------------------------------------------
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

// --- DHT22 --------------------------------------------------------------------
#define DHTPIN   13
#define DHTTYPE  DHT22
DHT dht(DHTPIN, DHTTYPE);
float localTemp = -999.0;
float localHum  = -999.0;

// --- WiFi ---------------------------------------------------------------------
const char* ssids[]     = {"phantrongkhangg", "Tuan Kha 5G", "Trong Khang", "Vnpt 2022"};
const char* passwords[] = {"26042012khang", "tuankha2015", "khongbiet123", "vnpt270922"};
const int   NUM_WIFI    = 4;

// --- Server -------------------------------------------------------------------
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";

// --- Weather API --------------------------------------------------------------
const char* WEATHER_URL =
  "http://api.weatherapi.com/v1/forecast.json"
  "?key=b92581d628b74fda87d123430261103"
  "&q=10.2537,105.9722&days=1&aqi=no&alerts=no";

// --- GPIO ---------------------------------------------------------------------
#define SOIL_PIN   32
#define WATER_PIN  33
#define FIRE_PIN   34
#define RELAY_PIN  26
#define RAIN_PIN   25

// --- Hieu chinh cam bien -----------------------------------------------------
#define SOIL_RAW_DRY     3200
#define SOIL_RAW_WET     1200
#define WATER_RAW_EMPTY   100
#define WATER_RAW_FULL   2500

// --- Lay mau & loc -----------------------------------------------------------
#define SAMPLE_COUNT     10
#define SAMPLE_DELAY_MS   2
#define EMA_ALPHA_SOIL   0.08f
#define EMA_ALPHA_WATER  0.15f

// --- Hieu chinh da diem cam bien dat (Cach 2) -------------------------------
// Do gia tri ADC thuc te tai cac muc am biet truoc, dien vao day
// raw PHAI giam dan (dat kho -> raw cao, dat uot -> raw thap)
struct CalPoint { int raw; int percent; };
const CalPoint SOIL_CAL[] = {
  { 3200,   0 },  // Ngoai khong khi / dat kho hoan toan
  { 2800,  20 },  // Dat hoi am
  { 2200,  45 },  // Dat am vua
  { 1700,  70 },  // Dat am tot
  { 1200, 100 },  // Nhung vao nuoc
};
const int CAL_POINTS = sizeof(SOIL_CAL) / sizeof(SOIL_CAL[0]);

// --- Bu nhiet do cam bien dat (Cach 3) --------------------------------------
// Nhiet do cao -> cam bien doc thap hon thuc -> cong bu vao
#define SOIL_TEMP_REF    25.0f  // Nhiet do luc can chinh (degC)
#define SOIL_TEMP_ALPHA   0.30f // He so bu: % do am / degC lech

// --- Nguong bom --------------------------------------------------------------
#define PUMP_SOIL_ON    30
#define PUMP_SOIL_OFF   70
#define PUMP_MAX_MS     25000

// --- Nguong gui du lieu ------------------------------------------------------
#define SEND_INTERVAL_MAX  4000
#define SOIL_THRESHOLD     2
#define WATER_THRESHOLD    2
#define TEMP_THRESHOLD     0.5f
#define HUM_THRESHOLD      2.0f

// --- An toan bom tu dong -----------------------------------------------------
#define PUMP_AUTO_COOLDOWN_MS  600000UL   // 10 phut cooldown
#define PUMP_SENSOR_ERR_LOCK   7200000UL  // 2 tieng lock khi cam bien loi
#define PUMP_MAX_FAIL_COUNT    3

// --- Timing -------------------------------------------------------------------
#define SOIL_READ_INTERVAL_MS   800
#define WATER_READ_INTERVAL_MS  800
#define WS_WATCHDOG_MS          180000UL

// ===============================================================
//  BIEN TOAN CUC
// ===============================================================

// --- Sensor State -------------------------------------------------------------
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

// --- Thoi tiet (volatile: viet boi Core 0, doc boi Core 1) ------------------
volatile float weatherTempC      = 0;
volatile int   weatherHumidity   = 0;
volatile float weatherWind       = 0;
volatile int   weatherRainChance = 0;
float tempC      = 0;
int   humidity   = 0;
float wind       = 0;
int   rainChance = 0;

// --- Timing counters ----------------------------------------------------------
unsigned long lastWeather   = 0;
unsigned long lastSend      = 0;
unsigned long lastDHT       = 0;
unsigned long lastSerial    = 0;
unsigned long lastSoilRead  = 0;
unsigned long lastWaterRead = 0;
unsigned long lastConnected = 0;

// --- Sensor values -----------------------------------------------------------
int  soilPercent  = 0;
int  waterPercent = 0;
bool pumpState    = false;

int   lastSentSoil  = -999;
int   lastSentWater = -999;
float lastSentTemp  = -999.0;
float lastSentHum   = -999.0;
bool  lastSentFire  = false;
bool  lastSentRain  = false;

// --- Co canh bao -------------------------------------------------------------
unsigned long fireStartTime   = 0;
bool          fireActive      = false;
bool          fireAlerted     = false;
bool          rainAlerted     = false;
bool          lowWaterAlerted = false;

// --- Trang thai bom ----------------------------------------------------------
unsigned long pumpStartTime         = 0;
unsigned long pumpAutoCooldownUntil = 0;
time_t        lastPumpEpoch         = 0;  // epoch luc bom lan cuoi duoc bat
uint8_t       pumpAutoFailCount     = 0;
bool          pumpLocked     = false;
bool          pumpAutoActive = false;
bool          manualUnlock   = false;
bool          adminActive    = false;
bool          pumpPending    = false;
unsigned long pumpPendingTime = 0;

// --- TFT ---------------------------------------------------------------------
bool          tftOn          = true;   // bat/tat qua server
int8_t        tftPending     = -1;     // -1=khong doi, 0=tat, 1=bat
bool          tftForceRedraw = false;  // ve ngay lap tuc
unsigned long tftLastDraw    = 0;
bool          tftWasOn       = true;   // phat hien luc tftOn vua bi tat
unsigned long tftReinitAt    = 0;      // relay noise delay: reinit TFT sau 150ms

// --- FreeRTOS / WebSocket -----------------------------------------------------
WebSocketsClient webSocket;
volatile bool wsConnected   = false;
volatile bool sendOnConnect = false;

QueueHandle_t wsSendQueue      = NULL;
TaskHandle_t  wsTaskHandle     = NULL;
TaskHandle_t  weatherTaskHandle = NULL;
volatile bool weatherBusy      = false;

bool wifiWasConnected    = false;
int  wifiRuntimeFailCount = 0;   // dem so lan that bai runtime, sau NUM_WIFI -> AP mode

// --- AP Mode -----------------------------------------------------------------
bool apMode = false;
WebServer localServer(80);

const char AP_HTML[] = R"rawhtml(<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexoraGarden</title><style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:rgb(10,22,40);color:white;padding:16px;max-width:420px;margin:0 auto}
h1{color:rgb(0,255,204);font-size:1.5em;text-align:center;margin-bottom:2px}
.sub{color:rgb(102,119,153);text-align:center;font-size:.8em;margin-bottom:16px}
.card{background:rgb(26,39,64);border-radius:12px;padding:14px;margin:10px 0}
.row{display:flex;justify-content:space-between;align-items:center;margin:7px 0;font-size:.95em}
.lbl{color:rgb(136,170,204)}.val{font-weight:bold;color:rgb(0,255,204)}
.val-warn{color:rgb(255,136,0)}.val-err{color:rgb(255,68,68)}
.btns{display:flex;gap:8px;margin-top:10px}
.btn{flex:1;padding:14px 8px;border:none;border-radius:10px;font-size:.95em;font-weight:bold;cursor:pointer}
.btn:active{opacity:.7}
.bon{background:rgb(0,170,85);color:white}.boff{background:rgb(204,34,0);color:white}
.bunlock{background:rgb(17,85,204);color:white;width:100%;margin-top:8px;padding:12px;border:none;border-radius:10px;font-size:.9em;font-weight:bold;cursor:pointer}
.bunlock:active{opacity:.7}
.ps{text-align:center;padding:10px;border-radius:8px;font-size:.95em;margin-bottom:8px;font-weight:bold}
.pon{background:rgb(0,51,34);color:rgb(0,255,136)}.poff{background:rgb(17,24,39);color:rgb(136,153,170)}.plck{background:rgb(42,21,0);color:rgb(255,153,68)}
.msgbox{text-align:center;min-height:20px;font-size:.85em;margin-top:8px;padding:6px;border-radius:8px}
.ok{color:rgb(0,255,136)}.err{color:rgb(255,68,68)}.info{color:rgb(255,204,68)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.dot-ap{background:rgb(255,136,0)}.dot-ok{background:rgb(0,255,136)}
</style></head><body>
<h1>* NEXORA GARDEN *</h1>
<p class="sub"><span class="dot dot-ap"></span>Che do AP cuc bo &nbsp;|&nbsp; 192.168.4.1</p>
<div class="card">
  <div class="row"><span class="lbl">Do am dat</span><span class="val" id="soil">--</span></div>
  <div class="row"><span class="lbl">Muc nuoc</span><span class="val" id="water">--</span></div>
  <div class="row"><span class="lbl">Nhiet do</span><span class="val" id="temp">--</span></div>
  <div class="row"><span class="lbl">Do am KK</span><span class="val" id="hum">--</span></div>
  <div class="row"><span class="lbl">Lua</span><span class="val" id="fire">--</span></div>
  <div class="row"><span class="lbl">Mua</span><span class="val" id="rain">--</span></div>
</div>
<div class="card">
  <div id="ps" class="ps poff">Bom: --</div>
  <div class="btns">
    <button class="btn bon" onclick="doPump('ON')">BAT BOM</button>
    <button class="btn boff" onclick="doPump('OFF')">TAT BOM</button>
  </div>
  <button class="bunlock" onclick="doUnlock()">Mo khoa bom tu dong</button>
</div>
<div id="msgbox" class="msgbox info"></div>
<script>
var tid=0;
function upd(){
  fetch('/status').then(function(r){return r.json();}).then(function(d){
    document.getElementById('soil').textContent=d.soil+'%';
    document.getElementById('water').textContent=d.water+'%';
    document.getElementById('temp').textContent=d.temp<-100?'---':d.temp.toFixed(1)+'C';
    document.getElementById('hum').textContent=d.hum<-100?'---':d.hum.toFixed(1)+'%';
    var fe=document.getElementById('fire');
    fe.textContent=d.fire?'CO LUA!':'Khong';
    fe.className='val'+(d.fire?' val-err':'');
    document.getElementById('rain').textContent=d.rain?'Co':'Khong';
    var ps=document.getElementById('ps');
    if(d.pump){ps.textContent='Bom: DANG CHAY';ps.className='ps pon';}
    else if(d.locked){ps.textContent='Bom: TAT (da khoa)';ps.className='ps plck';}
    else{ps.textContent='Bom: TAT';ps.className='ps poff';}
  }).catch(function(){setMsg('Mat ket noi ESP32','err');});
}
function setMsg(t,cls){
  var el=document.getElementById('msgbox');
  el.textContent=t;el.className='msgbox '+(cls||'info');
  clearTimeout(tid);tid=setTimeout(function(){el.textContent='';},3500);
}
function doPump(a){
  setMsg(a==='ON'?'Dang bat bom...':'Dang tat bom...','info');
  fetch('/pump?a='+a).then(function(r){return r.json();}).then(function(d){
    setMsg((d.ok?'OK: ':'LOI: ')+d.msg,d.ok?'ok':'err');
  }).catch(function(){setMsg('Loi ket noi','err');});
}
function doUnlock(){
  setMsg('Dang mo khoa...','info');
  fetch('/unlock').then(function(r){return r.json();}).then(function(d){
    setMsg((d.ok?'OK: ':'LOI: ')+d.msg,d.ok?'ok':'err');
  }).catch(function(){setMsg('Loi ket noi','err');});
}
upd();setInterval(upd,2000);
</script></body></html>
)rawhtml";

// Pending commands tu server (viet Core 0, doc Core 1)
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

// ===============================================================
//  FREEERTOS TASKS (Core 0)
// ===============================================================

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

// --- WebSocket send helper (thread-safe qua queue) ----------------------------
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

// --- webSocketEvent chay tren Core 0 -----------------------------------------
// KHONG goi GPIO / TFT / setPump o day -- chi set volatile flags
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

// --- wsTask chay tren Core 0 -------------------------------------------------
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

// ===============================================================
//  SENSOR
// ===============================================================

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

// --- Noi suy tuyen tinh da diem (Cach 2) -------------------------------------
// raw giam dan tuong ung percent tang dan trong SOIL_CAL
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

  // Cach 2: Noi suy da diem thay cho map() tuyen tinh don gian
  int mapped = constrain(multiPointMap(raw), 0, 100);

  // Cach 3: Bu nhiet do dung DHT22 (nhiet do cao -> cam bien doc thap hon thuc)
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
  // Bo guard pumpState: cam bien nuoc dung pin rieng, khong bi anh huong boi relay
  int samples[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) { samples[i] = analogRead(WATER_PIN); delay(SAMPLE_DELAY_MS); }
  int raw = getMedian(samples, SAMPLE_COUNT);
  if (raw > 4090) { waterState.isError = true; waterPercent = 0; return; }
  waterState.isError = false;
  int mapped;
  if (raw == 0) {
    // Cam bien bi thieu khuc day -> raw=0 nghia la nuoc da xuong toi do
    // -> giu o 10% de hien thi canh bao thap (duoi 15%)
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
  // Khong skip khi dang bom -- DHT22 hoan toan doc lap voi relay
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(t) && !isnan(h)) { localTemp = t; localHum = h; }
}

void handleFire() {
  // Cam bien lua luon hoat dong ke ca khi dang bom
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
  // Khi bom dang bat: bo qua cam bien mua (nuoc bom ban vao gay nhieu)
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
  // Khi bom bat: rain bi force false, bo qua thay doi rain
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
  // Khi bom bat: cam bien mua bi nhieu -> gui false de server khong xu ly nham
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

// ===============================================================
//  BOM
// ===============================================================

// setPump: KHONG goi tft.fillScreen() o day
// TFT manager (manageTFT) se phat hien thay doi pumpState va tu xu ly
void setPump(bool on) {
  pumpState = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  if (on) {
    pumpStartTime = millis();
    time(&lastPumpEpoch);  // ghi thoi gian NTP khi bom duoc bat
    Serial.println("[Bom] BAT");
  } else {
    Serial.println("[Bom] TAT");
  }
  // Relay click gay SPI noise -> schedule reinit TFT sau 150ms thay vi force draw ngay
  tftReinitAt = millis() + 150;
}

void handlePump() {
  if (adminActive) return;

  unsigned long now = millis();
  if (pumpState) {
    // Doc soil truc tiep khi dang bom (khong qua EMA) de check nguong dung
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
      // Cap nhat soilPercent voi gia tri live de TFT pump screen hien thi dung
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
      // Cap nhat soilPercent voi gia tri live khi dang bom
      soilPercent = liveSoil;
    }
    return;
  }

  // Xu ly manualUnlock: reset pumpLocked va cooldown
  if (manualUnlock) { pumpPending = false; pumpLocked = false; manualUnlock = false; pumpAutoFailCount = 0; return; }

  // Tu mo khoa khi da qua cooldown
  if (pumpLocked && soilPercent < PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    pumpLocked = false;
    Serial.println("[Bom] Mo khoa (het cooldown)");
  }

  // Pre-water pending: cho 1.5s roi bat bom
  if (pumpPending) {
    if (now - pumpPendingTime >= 1500) {
      pumpPending = false;
      setPump(true); pumpAutoActive = true;
      sendNotify("Tu dong bat bom: do am dat " + String(soilPercent) + "%");
    }
    return;
  }

  // Trigger bom tu dong
  if (!pumpLocked && soilPercent >= 1 && soilPercent <= PUMP_SOIL_ON && now >= pumpAutoCooldownUntil) {
    sendPreWater();
    pumpPending     = true;
    pumpPendingTime = now;
    Serial.println("[Bom] Chuan bi tuoi -- cho 1.5 giay sau pre_water...");
  }
}

// ===============================================================
//  TFT -- MAN HINH DUY NHAT (luon ve, khong chuyen man)
// ===============================================================
//  - 1 man duy nhat hien thi sensor + pump + WS + thoi tiet
//  - setTextPadding(240) + bg C_BLACK dam bao moi dong tu xoa in-place
//  - Bom bat/tat: chi cap nhat dong Bom, khong lam flicker man
//  - Chi dung khi tftOn=false (nut server) hoac mat dien
// -----------------------------------------------------------------------------

void drawMainScreen() {
  tft.setTextSize(2);
  tft.setTextPadding(240);

  // Dong 1: Tieu de + cham WS
  tft.setTextColor(C_CYAN, C_BLACK);
  tft.setCursor(5, 2); tft.print(" NEXORA GARDEN");
  tft.fillCircle(228, 10, 6, wsConnected ? C_LIME : C_RED);
  tft.drawFastHLine(0, 21, 240, C_GREEN);

  // Dong 2: Nhiet do
  tft.setCursor(5, 26); tft.setTextColor(C_WHITE, C_BLACK);
  if (localTemp == -999.0) tft.print("Nhiet: ---.-C  ");
  else { char b[22]; snprintf(b, sizeof(b), "Nhiet: %5.1f C  ", localTemp); tft.print(b); }

  // Dong 3: Do am KK
  tft.setCursor(5, 46); tft.setTextColor(C_WHITE, C_BLACK);
  if (localHum == -999.0) tft.print("Am KK: ---.-%  ");
  else { char b[22]; snprintf(b, sizeof(b), "Am KK: %5.1f %%  ", localHum); tft.print(b); }

  // Dong 4: Do am dat
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

  // Dong 5: Muc nuoc
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

  // Dong 6: Gio
  tft.setCursor(5, 106); tft.setTextColor(C_YELLOW, C_BLACK);
  { char b[22]; snprintf(b, sizeof(b), "Gio: %5.1f km/h  ", wind); tft.print(b); }

  // Dong 7: Trang thai bom (inline)
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

  // Dong 8: Gio thuc
  tft.setCursor(5, 146); tft.setTextColor(C_BLUE, C_BLACK);
  struct tm ti;
  if (getLocalTime(&ti, 0)) {
    char b[22]; snprintf(b, sizeof(b), "Gio: %02d:%02d:%02d    ", ti.tm_hour, ti.tm_min, ti.tm_sec);
    tft.print(b);
  } else { tft.print("Gio: --:--:--   "); }

  tft.drawFastHLine(0, 166, 240, C_GRAY);

  // -- Phan duoi size=1 ------------------------------------------------------
  tft.setTextSize(1);
  tft.setTextPadding(240);

  // Dong 9: WS + WiFi (hoac AP mode info)
  tft.setCursor(5, 170);
  if (apMode) {
    tft.setTextColor(C_ORANGE, C_BLACK);
    tft.print("AP: NexoraGarden  192.168.4.1 ");
  } else {
    bool wifiOk = (WiFi.status() == WL_CONNECTED);
    tft.setTextColor(wsConnected ? C_LIME : C_RED, C_BLACK);
    char wsBuf[38]; snprintf(wsBuf, sizeof(wsBuf), "%-18s%-18s",
      wsConnected ? "WS: ONLINE" : "WS: OFFLINE",
      wifiOk      ? "WiFi: OK"   : "WiFi: MAT KET NOI");
    tft.print(wsBuf);
  }

  // Dong 10: Fire / Rain / Admin / Khoa
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

  // Dong 11: Bom gan day
  tft.setCursor(5, 194); tft.setTextColor(C_DIMWHITE, C_BLACK);
  if (lastPumpEpoch == 0) {
    tft.print("Bom gan day: Chua co           ");
  } else {
    struct tm pt; localtime_r(&lastPumpEpoch, &pt);
    char b[36]; snprintf(b, sizeof(b), "Bom gan day: %02d:%02d  %02d/%02d          ",
                         pt.tm_hour, pt.tm_min, pt.tm_mday, pt.tm_mon + 1);
    tft.print(b);
  }

  // Dong 12: Thoi tiet
  tft.setCursor(5, 206); tft.setTextColor(C_GRAY, C_BLACK);
  { char b[38]; snprintf(b, sizeof(b), "TT: %.0fC  Am:%d%%  Mua:%d%%  Gio:%.0fkm/h  ",
                         tempC, humidity, rainChance, wind);
    tft.print(b); }

  // Dong 13: Progress bom (khi dang bom)
  if (pumpState) {
    unsigned long el = min((millis() - pumpStartTime) / 1000UL, 25UL);
    tft.setCursor(5, 218);
    tft.setTextColor(el >= 20 ? C_ORANGE : C_CYAN, C_BLACK);
    char b[38]; snprintf(b, sizeof(b), "Tuoi: %2lus/25s  Muc tieu: dat>=%d%%    ",
                         el, PUMP_SOIL_OFF);
    tft.print(b);
  } else {
    // fillRect dam bao xoa sach -- khong dung setTextColor(black,black) tranh loi bg ignored
    tft.fillRect(0, 215, 240, 14, C_BLACK);
  }
}

// --- TFT Manager -------------------------------------------------------------
void manageTFT() {
  // Vua bi tat -> xoa man 1 lan roi dung
  if (!tftOn) {
    if (tftWasOn) {
      tft.fillScreen(C_BLACK);
      tftWasOn = false;
    }
    tftForceRedraw = false;
    tftReinitAt    = 0;
    return;
  }
  // Vua bat lai -> force redraw
  if (!tftWasOn) {
    tftWasOn       = true;
    tftForceRedraw = true;
  }

  unsigned long now = millis();

  // Relay noise reinit: sau relay click doi 150ms -> init + fillScreen, return de loop tiep theo moi draw
  if (tftReinitAt != 0 && now >= tftReinitAt) {
    tftReinitAt = 0;
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(C_BLACK);
    tftForceRedraw = true;
    tftLastDraw    = now;
    Serial.println("[TFT] Reinit sau relay click");
    return;  // Cho LCD on dinh truoc khi ve lai (loop tiep theo se draw)
  }

  // Watchdog: neu TFT khong ve > 5s -> force fillScreen + redraw (KHONG reinit -- tranh SPI glitch)
  if (tftReinitAt == 0 && (now - tftLastDraw > 5000)) {
    tft.fillScreen(C_BLACK);
    tftForceRedraw = true;
    tftLastDraw    = now;
    Serial.println("[TFT] Watchdog force redraw");
    return;  // Cho LCD on dinh, loop tiep theo ve lai
  }

  bool shouldDraw = tftForceRedraw || (now - tftLastDraw >= 500);
  if (!shouldDraw) return;
  tftForceRedraw = false;
  tftLastDraw    = now;
  drawMainScreen();
}

// ===============================================================
//  AP MODE -- Web server cuc bo (khong can WiFi ngoai)
// ===============================================================

// Man hinh AP: hien WiFi + pass de user ket noi (goi khi vua vao AP mode)
void showAPScreen() {
  tft.fillScreen(C_BLACK);
  tft.setTextSize(2); tft.setTextColor(C_ORANGE);
  tft.setCursor(5, 15); tft.println("** AP MODE **");
  tft.drawFastHLine(0, 38, 240, C_ORANGE);
  tft.setTextSize(1); tft.setTextColor(C_CYAN);
  tft.setCursor(5, 48); tft.println("Ket noi WiFi vao may tinh/dien thoai:");
  tft.setTextColor(C_WHITE);
  tft.setCursor(5, 65); tft.print("WiFi : "); tft.setTextColor(C_LIME);   tft.println("NexoraGarden");
  tft.setTextColor(C_WHITE);
  tft.setCursor(5, 80); tft.print("Pass : "); tft.setTextColor(C_YELLOW); tft.println("26042012khang");
  tft.setTextColor(C_WHITE);
  tft.setCursor(5, 98); tft.print("Web  : "); tft.setTextColor(C_CYAN);   tft.println("192.168.4.1");
  tft.drawFastHLine(0, 113, 240, C_GRAY);
  tft.setTextColor(C_GRAY);
  tft.setCursor(5, 120); tft.println("(Sau khi ket noi WiFi tren,");
  tft.setCursor(5, 132); tft.println(" mo trinh duyet va nhap IP)");
  tft.setTextColor(C_DIMWHITE);
  tft.setCursor(5, 150); tft.println("Sensor van hoat dong binh thuong.");
}

void handleAPRoot() {
  localServer.send(200, "text/html", AP_HTML);
}

void handleAPStatus() {
  bool rainNow = pumpState ? false : (digitalRead(RAIN_PIN) == LOW);
  JsonDocument doc;
  doc["soil"]   = soilPercent;
  doc["water"]  = waterPercent;
  doc["temp"]   = localTemp;
  doc["hum"]    = localHum;
  doc["fire"]   = fireActive;
  doc["rain"]   = rainNow;
  doc["pump"]   = pumpState;
  doc["locked"] = pumpLocked;
  doc["admin"]  = adminActive;
  doc["pending"]= pumpPending;
  String out; serializeJson(doc, out);
  localServer.send(200, "application/json", out);
}

void handleAPPump() {
  if (!localServer.hasArg("a")) {
    localServer.send(400, "application/json", "{\"ok\":false,\"msg\":\"Thieu tham so action\"}");
    return;
  }
  String action = localServer.arg("a");
  if (action == "ON") {
    if (pumpState) {
      localServer.send(200, "application/json", "{\"ok\":false,\"msg\":\"Bom dang chay roi\"}");
      return;
    }
    pendingCmd.pumpOn  = true;
    pendingCmd.hasPump = true;
    localServer.send(200, "application/json", "{\"ok\":true,\"msg\":\"Da bat bom\"}");
  } else if (action == "OFF") {
    pendingCmd.pumpOn  = false;
    pendingCmd.hasPump = true;
    localServer.send(200, "application/json", "{\"ok\":true,\"msg\":\"Da tat bom\"}");
  } else {
    localServer.send(400, "application/json", "{\"ok\":false,\"msg\":\"Action khong hop le\"}");
  }
}

void handleAPUnlock() {
  pendingCmd.unlockOn  = true;
  pendingCmd.hasUnlock = true;
  localServer.send(200, "application/json", "{\"ok\":true,\"msg\":\"Da mo khoa bom tu dong\"}");
}

void startAPMode() {
  apMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("NexoraGarden", "26042012khang");
  IPAddress ip = WiFi.softAPIP();
  Serial.printf("[AP] Hotspot: NexoraGarden | Pass: 26042012khang | IP: %s\n", ip.toString().c_str());
  localServer.on("/",       HTTP_GET, handleAPRoot);
  localServer.on("/status", HTTP_GET, handleAPStatus);
  localServer.on("/pump",   HTTP_GET, handleAPPump);
  localServer.on("/unlock", HTTP_GET, handleAPUnlock);
  localServer.begin();
  Serial.println("[AP] Web server bat dau tai port 80 -- Mo trinh duyet: 192.168.4.1");
}

// ===============================================================
//  WIFI
// ===============================================================

bool connectWiFi() {
  for (int i = 0; i < NUM_WIFI; i++) {
    // Hien thi SSID dang thu tren TFT
    tft.fillScreen(C_BLACK);
    tft.setTextSize(1); tft.setTextColor(C_YELLOW);
    tft.setCursor(5, 80);
    char buf[32]; snprintf(buf, sizeof(buf), "Thu WiFi %d/%d:", i + 1, NUM_WIFI);
    tft.println(buf);
    tft.setTextColor(C_WHITE);
    tft.setCursor(5, 94);  tft.println(ssids[i]);
    tft.setTextColor(C_GRAY);
    tft.setCursor(5, 108); tft.println("Dang ket noi...");

    Serial.print("[WiFi] Thu: "); Serial.println(ssids[i]);
    WiFi.disconnect(); WiFi.begin(ssids[i], passwords[i]);
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20) {
      delay(500); Serial.print(".");
      // Hien thi dot dong bo tren TFT
      tft.setTextColor(C_CYAN);
      tft.setCursor(5 + tries * 7, 122);
      tft.print(".");
      tries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[WiFi] OK: %s\n", WiFi.localIP().toString().c_str());
      return true;
    }
    tft.setTextColor(C_RED);
    tft.setCursor(5, 137); tft.println("That bai.");
    delay(300);
  }
  Serial.println("\n[WiFi] Tat ca SSID that bai -- chuyen sang AP mode");
  return false;
}

void handleWiFi() {
  if (apMode) return;
  bool connected = (WiFi.status() == WL_CONNECTED);
  if (!connected) {
    wifiWasConnected = false;
    static unsigned long lastAttempt = 0;
    static int wifiIdx = 0;
    unsigned long now = millis();
    if (now - lastAttempt > 10000) {
      lastAttempt = now;

      // Hien thi dang thu ket noi WiFi tren TFT
      tft.fillScreen(C_BLACK);
      tft.setTextSize(1); tft.setTextColor(C_YELLOW);
      tft.setCursor(5, 80);
      char buf[40]; snprintf(buf, sizeof(buf), "Mat WiFi. Thu lai %d/%d:", wifiRuntimeFailCount + 1, NUM_WIFI);
      tft.println(buf);
      tft.setTextColor(C_WHITE);
      tft.setCursor(5, 94); tft.println(ssids[wifiIdx]);
      tft.setTextColor(C_GRAY);
      tft.setCursor(5, 108); tft.println("Dang ket noi...");

      Serial.printf("[WiFi] Ket noi lai voi: %s\n", ssids[wifiIdx]);
      WiFi.disconnect(); WiFi.begin(ssids[wifiIdx], passwords[wifiIdx]);
      wifiIdx = (wifiIdx + 1) % NUM_WIFI;
      wifiRuntimeFailCount++;

      // Da thu het NUM_WIFI SSID ma van that bai -> chuyen AP mode ngay
      if (wifiRuntimeFailCount >= NUM_WIFI) {
        Serial.println("[WiFi] Tat ca SSID that bai -> chuyen AP mode");
        startAPMode();
        showAPScreen();
        // Delay ngan de man hinh AP hien ro truoc khi manageTFT ghi de
        // (manageTFT se tiep tuc hien AP info o dong 9 cua drawMainScreen)
        unsigned long apShowUntil = millis() + 5000;
        while (millis() < apShowUntil) {
          localServer.handleClient();
          delay(10);
        }
        tft.fillScreen(C_BLACK);
        tftForceRedraw = true;
      }
    }
  } else {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      wifiRuntimeFailCount = 0;  // reset khi ket noi thanh cong
      Serial.printf("[WiFi] Da ket noi lai: %s\n", WiFi.localIP().toString().c_str());
    }
  }
}

// ===============================================================
//  SERIAL DEBUG
// ===============================================================

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

// ===============================================================
//  SETUP
// ===============================================================

void setup() {
  Serial.begin(115200);
  // Cho nguon on dinh -- adapter can lau hon pin 18650
  delay(500);

  // Cach 1: Dam bao ADC doc dung dai 0-3.3V (khong bi cat o 1.1V)
  analogSetAttenuation(ADC_11db);

  pinMode(SOIL_PIN,  INPUT);
  pinMode(WATER_PIN, INPUT);
  pinMode(FIRE_PIN,  INPUT);
  pinMode(RAIN_PIN,  INPUT);
  pinMode(RELAY_PIN, OUTPUT); digitalWrite(RELAY_PIN, LOW);

  dht.begin();

  // TFT khoi tao -- delay them de nguon adapter on dinh truoc khi SPI init
  delay(300);
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(C_BLACK);
  tft.setTextColor(C_WHITE); tft.setTextSize(2);
  tft.setCursor(30, 100); tft.println("Dang ket noi...");

  delay(2000);
  bool wifiOk = connectWiFi();
  wifiWasConnected = wifiOk;
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov", "asia.pool.ntp.org");

  if (wifiOk) {
    // Ket noi WiFi thanh cong -> khoi dong WebSocket + Weather tasks
    wsSendQueue = xQueueCreate(16, sizeof(char*));
    xTaskCreatePinnedToCore(wsTask,      "wsTask",      16384, NULL, 2, &wsTaskHandle,     0);
    xTaskCreatePinnedToCore(weatherTask, "weatherTask",  8192, NULL, 1, &weatherTaskHandle, 0);
    Serial.println("[WS]      Task khoi tao tren Core 0");
    Serial.println("[Weather] Task khoi tao tren Core 0");

    // Man hinh khoi dong OK
    tft.fillScreen(C_BLACK);
    tft.setTextSize(2); tft.setTextColor(C_GREEN);
    tft.setCursor(10, 80);  tft.println("Nexora OK!");
    tft.setTextSize(1); tft.setTextColor(C_WHITE);
    tft.setCursor(10, 110); tft.println(WiFi.localIP().toString());
    delay(1500);

    triggerWeatherUpdate();
    lastWeather = millis();
    Serial.println("[System] San sang! Core 1: sensors+TFT | Core 0: WebSocket+Weather");
  } else {
    // Khong co WiFi -> AP mode
    startAPMode();
    showAPScreen();   // man hinh den voi WiFi + pass
    delay(3000);      // cho user doc thong tin
    Serial.println("[System] San sang! AP mode -- Khong co WiFi ngoai");
  }

  // Doc sensor lan dau truoc khi vao loop
  tft.fillScreen(C_BLACK);
  updateSoil(); updateWater(); updateDHT();

  // Khoi tao TFT state machine
  tftWasOn       = true;
  tftForceRedraw = true;
  tftLastDraw    = millis();
}

// ===============================================================
//  LOOP (Core 1)
// ===============================================================

void loop() {
  unsigned long now = millis();

  // AP mode: phuc vu web client cuc bo, bo qua moi logic WS/Weather
  if (apMode) {
    localServer.handleClient();
    updateSoil(); updateWater(); updateDHT();
    handlePump();
    manageTFT();
    delay(10);
    return;
  }

  // Gui du lieu ngay khi WS vua ket noi
  if (sendOnConnect && wsConnected) {
    sendOnConnect = false;
    sendSensorData();
  }

  // Watchdog: khong ket noi WS trong 3 phut -> restart
  if (wsConnected) {
    lastConnected = now;
  } else if (lastConnected == 0) {
    lastConnected = now;
  } else if (now - lastConnected > WS_WATCHDOG_MS) {
    Serial.println("[Watchdog] Khong ket noi WS trong 3 phut -- dang restart...");
    delay(500);
    esp_restart();
  }

  handleWiFi();

  // -- Xu ly lenh tu server --
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
      Serial.println("[Admin] TAT bom buoc -- khoa + cooldown 10 phut");
    }
  }

  // -- Doc sensor --
  if (now - lastSoilRead  >= SOIL_READ_INTERVAL_MS)  { updateSoil();  lastSoilRead  = now; }
  if (now - lastWaterRead >= WATER_READ_INTERVAL_MS)  { updateWater(); lastWaterRead = now; }
  if (now - lastDHT       > 2000)                     { updateDHT();   lastDHT       = now; }
  handleFire();
  handleRain();
  handlePump();

  // -- TFT state machine --
  manageTFT();

  // -- Gui du lieu sensor --
  if (wsConnected && (now - lastSend >= SEND_INTERVAL_MAX || shouldSendData())) {
    sendSensorData();
  }

  // -- Thoi tiet --
  if (now - lastWeather > 600000) { lastWeather = now; triggerWeatherUpdate(); }
  syncWeatherToMain();

  // -- Serial debug --
  if (now - lastSerial > 2000) { printSerial(); lastSerial = now; }

#ifdef CALIBRATE_MODE
  printCalibrate();
#endif

  delay(10);
}
