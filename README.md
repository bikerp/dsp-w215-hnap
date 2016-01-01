# dsp-w215-hnap
Tool for reading data from D-Link DSP-W215 Home Smart Plug.
Tested with hardware version B1 and firmware version 2.20.

Usage: fill your login credentials into app.js, modify device IP address.
Run: node app.js

Supported operations:
soapclient.consumption() - read current power consumption
soapclient.temperature() - read current temperature
soapclient.on() - turn on
soapclient.off() - turn off
