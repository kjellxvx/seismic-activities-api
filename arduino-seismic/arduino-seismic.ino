#if !defined(ESP8266)
#error This code is intended to run only on the ESP8266 boards ! Please check your Tools->Board setting.
#endif

#define _WEBSOCKETS_LOGLEVEL_ 2

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <ArduinoJson.h>

#include <WebSocketsClient_Generic.h>
#include <SocketIOclient_Generic.h>

#include <Hash.h>

ESP8266WiFiMulti WiFiMulti;
SocketIOclient socketIO;

const int dirPin = 0;
const int stepPin = 2;

// Select the IP address according to your local network
const char* serverHostname = "wistoff.de";
uint16_t serverPort = 3002;

void setup() {
  // Serial.begin(921600);
  Serial.begin(115200);

  pinMode(stepPin, OUTPUT);
  pinMode(dirPin, OUTPUT);

  while (!Serial)
    ;

  Serial.print("\nStart ESP8266_WebSocketClientSocketIO on ");
  Serial.println(ARDUINO_BOARD);
  Serial.println(WEBSOCKETS_GENERIC_VERSION);

  //Serial.setDebugOutput(true);

  // disable AP
  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  WiFiMulti.addAP("FRITZ!WLAN Repeater 1750E", "00000000");
  // WiFiMulti.addAP("unknown", "kjellwistoff");

  //WiFi.disconnect();
  while (WiFiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }

  Serial.println();

  // Client address
  Serial.print("WebSockets Client started @ IP address: ");
  Serial.println(WiFi.localIP());

  IPAddress resolvedIP;
  if (WiFi.hostByName(serverHostname, resolvedIP)) {
    Serial.print("Resolved IP address for ");
    Serial.print(serverHostname);
    Serial.print(": ");
    Serial.println(resolvedIP);
    socketIO.begin(resolvedIP, serverPort);
  } else {
    Serial.println("Failed to resolve the hostname.");
  }

  // setReconnectInterval to 10s, new from v2.5.1 to avoid flooding server. Default is 0.5s
  socketIO.setReconnectInterval(10000);

  // socketIO.setExtraHeaders("Authorization: 1234567890");

  // server address, port and URL
  // void begin(IPAddress host, uint16_t port, String url = "/socket.io/?EIO=4", String protocol = "arduino");
  // To use default EIO=4 fron v2.5.1
  // socketIO.begin(serverIP, serverPort);

  // event handler
  socketIO.onEvent(socketIOEvent);
}

unsigned long messageTimestamp = 0;

void loop() {
  socketIO.loop();

  uint64_t now = millis();

  if (now - messageTimestamp > 30000) {
    messageTimestamp = now;

    // creat JSON message for Socket.IO (event)
    DynamicJsonDocument doc(1024);
    JsonArray array = doc.to<JsonArray>();

    // add evnet name
    // Hint: socket.on('event_name', ....
    array.add("event_name");

    // add payload (parameters) for the event
    JsonObject param1 = array.createNestedObject();
    param1["now"] = (uint32_t)now;

    // JSON to String (serializion)
    String output;
    serializeJson(doc, output);

    // Send event
    socketIO.sendEVENT(output);

    // Print JSON for debugging
    // Serial.println(output);
  }
}

void moveMotor(int number) {
  Serial.println(number);

  if (number > 0) {
    digitalWrite(dirPin, HIGH);
  } else {
    digitalWrite(dirPin, LOW);
  }

  int posNumber = abs(number);

  for (int x = 0; x < posNumber; x++) {
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(1000);
    digitalWrite(stepPin, LOW);
    delayMicroseconds(1000);
  }
}

void socketIOEvent(const socketIOmessageType_t& type, uint8_t* payload, const size_t& length) {
  switch (type) {
    case sIOtype_DISCONNECT:
      // Serial.println("[IOc] Disconnected");
      break;

    case sIOtype_CONNECT:
      // Serial.print("[IOc] Connected to url: ");
      // Serial.println((char*) payload);

      // join default namespace (no auto join in Socket.IO V3)
      socketIO.send(sIOtype_CONNECT, "/");

      break;

    case sIOtype_EVENT:
      {
        // Declare variables within a block scope
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, (char*)payload);

        // If the JSON parsing is successful
        if (!error) {
          // Check if the JSON payload is an array
          if (doc.is<JsonArray>()) {
            // Extract the number from the JSON array
            JsonArray jsonArray = doc.as<JsonArray>();
            serializeJsonPretty(jsonArray, Serial);
            JsonObject obj = doc.as<JsonObject>();
            if (obj.containsKey("currentValue") && obj["currentValue"].is<int>()) {
              int currentValue = obj["currentValue"];
              int motorValue = map(currentValue, obj["minValue"], obj["maxValue"], -3, 3);
              // Print the JSON object to the serial monitor
              serializeJsonPretty(obj, Serial);
              moveMotor(motorValue);
            }
          }
        }
      }
      break;

    case sIOtype_ACK:
      // Serial.print("[IOc] Get ack: ");
      // Serial.println(length);

      hexdump(payload, length);
      break;

    case sIOtype_ERROR:
      // Serial.print("[IOc] Get error: ");
      // Serial.println(length);

      hexdump(payload, length);
      break;

    case sIOtype_BINARY_EVENT:
      // Serial.print("[IOc] Get binary: ");
      // Serial.println(length);

      hexdump(payload, length);
      break;

    case sIOtype_BINARY_ACK:
      // Serial.print("[IOc] Get binary ack: ");
      // Serial.println(length);

      hexdump(payload, length);
      break;

    case sIOtype_PING:
      // Serial.println("[IOc] Get PING");

      break;

    case sIOtype_PONG:
      // Serial.println("[IOc] Get PONG");

      break;

    default:
      break;
  }
}