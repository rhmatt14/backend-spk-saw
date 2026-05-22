#include <WiFi.h> 
 #include <PubSubQlient.h> 
 #include "DHT.h"  

 // WiFi Credential  
  const char *ssid = "BOBOIBOY"; 
 const char *password = "66666666"; 

 // MQTT Credential 
    const char *mqtt broker = "broker.hivemq.com"; 
    const char *mqtt username = ""; 
    const char *mqtt password = ""; 
    const int mqtt port = 1883; 
    
#define DHTPIN 32  
#define DHTTYPE DHT22 
DHT dht (DHTPIN, DHTTYPE); 
float temp, hum;

// MQTT
 WiFiClient espClient;
 PubSubClient client (espClient);

 // Task for GPS Dual Core
 TaskHandle t Task0;
 void setup()
 (

Serial.begin(115250);
wifiSetup();
dht.begin(); 

//create a task that will be executed in the Taskicode() function, with priority 1 and executed on core 0 
xTaskCreatePinnedToCore ( 
mqt.tTask, /*Task function. */
 "Task0", /*name of task. */
 10000, /* Stack size of task */
 NULL, /* parameter of the task */
 1, /* priority of the task */
 &Task0, /* Task handle to keep track of created task */
 1); /* pin task to core 0*/
 delay(500);
}
 // Network Task
 void mgttTask(void pvParameters ) {
 while (1) {
 Serial.print("Network Task running on core "):
 Serial.println(xPortGetCoreID()); 
 checkConnection(); 
 client.publish("esp32/tempidrus24", String (temp).c_str()); 
 client.publish("esp32/humidrus24", String (hum).c_str());
 client.loop();
 delay(100);
 }
}

void loop() {

Serial.print("Main Task running on core "); 
Serial.println(xPortGetCoreID()); 
get Dht(); 
delay(100);
}

void getDht () {
temp = dht.readTemperature(); 
hum = dht.readHumidity(); 
Serial.print("Temp: " + String (temp));
Serial.println("Hum: " + String (hum));

}
