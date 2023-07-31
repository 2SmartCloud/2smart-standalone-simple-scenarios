# simple scripts

## Local development

To install extensions locally, you need to run the crypt [extensionsManager.js](extensionsManager.js)

## Linux

### **Installation:**
```
$ sudo MQTT_PASS=12344321 SOURCE=lighting-control npm start
```

### **Delete:**
```
$ sudo MQTT_PASS=12344321 ACTION=uninstall SOURCE=lighting-control npm start
```

## MACOS
*Note: due to file system peculiarities, folders created by docker are created under user*

### **Installation:**
```
$ MQTT_PASS=12344321 SOURCE=lighting-control npm start
```

### **Delete:**
```
$ MQTT_PASS=12344321 ACTION=uninstall SOURCE=lighting-control npm start
```

## weather-station-2
Scenario with an alternative implementation of the Zambretti algorithm used in weather-station

