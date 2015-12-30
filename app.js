/**
 * Tool for reading data from D-Link DSP-W215 Home Smart Plug.
 *
 * Usage: enter your PIN code to LOGIN_PWD, change value of HNAP_URL according to your device settings.
 *
 * @type {exports|module.exports}
 */
var soapclient = require('./js/soapclient');
var fs = require('fs');

var OUTPUT_FILE = "result.txt";
var LOGIN_USER = "admin";
var LOGIN_PWD = "<PIN CODE>";
var HNAP_URL = "http://192.168.1.128/HNAP1";
var POLLING_INTERVAL = 10000;

soapclient.login(LOGIN_USER, LOGIN_PWD, HNAP_URL).done(function (status) {
    if (!status) {
        throw "Login failed!";
    }
    read();
});

function read() {
    soapclient.sendCommand("GetCurrentPowerConsumption", "CurrentConsumption", 1).done(function (power) {
        soapclient.sendCommand("GetCurrentTemperature", "CurrentTemperature", 2).done(function (temperature) {
            console.log(new Date().toLocaleString(), power, temperature);
            save(power, temperature);
            setTimeout(function () {
                read();
            }, POLLING_INTERVAL);
        });
    })
}

function save(power, temperature) {
    fs.writeFile(OUTPUT_FILE, new Date().toLocaleString() + ";" + power + ";" + temperature + "\r\n", {flag: "a"}, function (err) {
        if (err) throw err;
    })
}