//############################################################################################
//############################################################################################
//############################################################################################

const char* ssid = "obstlan";
const char* password = "obsunjemoes";

//############################################################################################
//############################################################################################
//############################################################################################




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

  if (WiFi.getMode() & WIFI_AP) {
    WiFi.softAPdisconnect(true);
  }

  WiFiMulti.addAP(ssid, password);

  while (WiFiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }

  Serial.println();

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
  socketIO.setReconnectInterval(1000);

  // event handler
  socketIO.onEvent(socketIOEvent);
}

unsigned long messageTimestamp = 0;

void loop() {
  socketIO.loop();

  uint64_t now = millis();

  if (now - messageTimestamp > 500) {
    messageTimestamp = now;

    // creat JSON message for Socket.IO (event)
    DynamicJsonDocument doc(1024);
    JsonArray array = doc.to<JsonArray>();

    // add evnet name
    array.add("event_name");

    // add payload (parameters) for the event
    JsonObject param1 = array.createNestedObject();
    param1["now"] = (uint32_t)now;

    // JSON to String (serializion)
    String output;
    serializeJson(doc, output);

    // Send event
    socketIO.sendEVENT(output);
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

// void moveMotor(int number) {
//   Serial.println(number);

//   if (number > 0) {
//     digitalWrite(dirPin, HIGH);
//   } else {
//     digitalWrite(dirPin, LOW);
//   }

//   int posNumber = abs(number);

//   unsigned long previousMillis = 0;     // Variable to store the last time the stepPin was toggled
//   const unsigned long interval = 1000;  // Time in microseconds between stepPin toggles

//   for (int x = 0; x < posNumber; x++) {
//     unsigned long currentMillis = micros();  // Get the current time in microseconds

//     if (currentMillis - previousMillis >= interval) {
//       digitalWrite(stepPin, !digitalRead(stepPin));  // Toggle the stepPin
//       previousMillis = currentMillis;                // Save the last time the stepPin was toggled
//     }
//   }
// }

void socketIOEvent(const socketIOmessageType_t& type, uint8_t* payload, const size_t& length) {
  switch (type) {

    case sIOtype_CONNECT:
      socketIO.send(sIOtype_CONNECT, "/");
      digitalWrite(stepPin, HIGH);
      digitalWrite(dirPin, HIGH);

      break;

    case sIOtype_EVENT:
      {
        // Declare variables within a block scope
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, (char*)payload);

        // If the JSON parsing is successful
        if (!error) {
          // Check if the JSON payload is an array
          if (doc.is<JsonArray>() && doc.size() == 2) {
            // Get the first element, which is a string
            String firstElement = doc[0];
            if (firstElement == "data") {
              // Get the second element, which is an object
              JsonObject data = doc[1].as<JsonObject>();
              int currentValue = data["currentValue"];
              int maxValue = data["maxValue"];
              int minValue = data["minValue"];
              int stepSize = data["stepSize"];
              int timeStamp = data["timeStamp"];
              int motorValue = map(currentValue, minValue, maxValue, -stepSize, stepSize);

              unsigned long currentTimestamp = millis();
              if (timeStamp == = currentTime of the Arduino) {
                Serial.println(currentValue);
                moveMotor(motorValue);
              } else {
                break
              }
            }
          }
        }
      }
      break;
    default:
      break;
  }
}
