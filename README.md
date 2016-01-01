# dsp-w215-hnap
Tool for reading data from D-Link DSP-W215 Home Smart Plug.
Tested with hardware version B1 and firmware version 2.20.

Usage: fill your login credentials into app.js, modify device IP address.
Run: node app.js

Supported operations:<br>
soapclient.consumption() - read current power consumption<br>
soapclient.totalConsumption() - read total power consumption<br>
soapclient.temperature() - read current temperature<br>
soapclient.on() - turn on<br>
soapclient.off() - turn off<br>
soapclient.setPowerWarning() - set power warning thresholds<br>
soapclient.setTemperatureSettings() - set temperature warning threshold<br>

