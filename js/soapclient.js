var md5 = require('./hmac_md5');
var request = require('then-request');
var DOMParser = require('xmldom').DOMParser;
var fs = require("fs");

var HNAP1_XMLNS = "http://purenetworks.com/HNAP1/";
var HNAP_METHOD = "POST";
var HNAP_BODY_ENCODING = "UTF8";
var HNAP_LOGIN_METHOD = "Login";

var HNAP_AUTH = {URL: "", User: "", Pwd: "", Result: "", Challenge: "", PublicKey: "", Cookie: "", PrivateKey: ""};

exports.login = function (user, password, url) {
    HNAP_AUTH.User = user;
    HNAP_AUTH.Pwd = password;
    HNAP_AUTH.URL = url;

    return request(HNAP_METHOD, HNAP_AUTH.URL,
        {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"' + HNAP1_XMLNS + HNAP_LOGIN_METHOD + '"'
            },
            body: requestBody(HNAP_LOGIN_METHOD, loginRequest())
        }).then(function (response) {
        save_login_result(response.getBody(HNAP_BODY_ENCODING));
        return soapAction(HNAP_LOGIN_METHOD, "LoginResult", requestBody(HNAP_LOGIN_METHOD, loginParameters()));
    }).catch(function (err) {
        console.log("error:", err);
    });
};

function save_login_result(body) {
    var doc = new DOMParser().parseFromString(body);
    HNAP_AUTH.Result = doc.getElementsByTagName(HNAP_LOGIN_METHOD + "Result").item(0).firstChild.nodeValue;
    HNAP_AUTH.Challenge = doc.getElementsByTagName("Challenge").item(0).firstChild.nodeValue;
    HNAP_AUTH.PublicKey = doc.getElementsByTagName("PublicKey").item(0).firstChild.nodeValue;
    HNAP_AUTH.Cookie = doc.getElementsByTagName("Cookie").item(0).firstChild.nodeValue;
    HNAP_AUTH.PrivateKey = md5.hex_hmac_md5(HNAP_AUTH.PublicKey + HNAP_AUTH.Pwd, HNAP_AUTH.Challenge).toUpperCase();
}

function requestBody(method, parameters) {
    return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
        "<soap:Envelope " +
        "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
        "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " +
        "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
        "<soap:Body>" +
        "<" + method + " xmlns=\"" + HNAP1_XMLNS + "\">" +
        parameters +
        "</" + method + ">" +
        "</soap:Body></soap:Envelope>";
}

function moduleParameters(module) {
    return "<ModuleID>" + module + "</ModuleID>";
}

function controlParameters(module, status) {
    return moduleParameters(module) +
        "<NickName>Socket 1</NickName><Description>Socket 1</Description>" +
        "<OPStatus>" + status + "</OPStatus><Controller>1</Controller>";
}

function radioParameters(radio) {
    return "<RadioID>" + radio + "</RadioID>";
}

function soapAction(method, responseElement, body) {
    return request(HNAP_METHOD, HNAP_AUTH.URL,
        {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"' + HNAP1_XMLNS + method + '"',
                "HNAP_AUTH": getHnapAuth('"' + HNAP1_XMLNS + method + '"', HNAP_AUTH.PrivateKey),
                "Cookie": "uid=" + HNAP_AUTH.Cookie
            },
            body: body
        }).then(function (response) {
        console.log(response.getBody(HNAP_BODY_ENCODING));
        return readResponseValue(response.getBody(HNAP_BODY_ENCODING), responseElement);
    }).catch(function (err) {
        console.log("error:", err);
    });
}

exports.on = function () {
    return soapAction("SetSocketSettings", "SetSocketSettingsResult", requestBody("SetSocketSettings", controlParameters(1, true)));
};

exports.off = function () {
    return soapAction("SetSocketSettings", "SetSocketSettingsResult", requestBody("SetSocketSettings", controlParameters(1, false)));
};

exports.consumption = function () {
    return soapAction("GetCurrentPowerConsumption", "CurrentConsumption", requestBody("GetCurrentPowerConsumption", moduleParameters(2)));
};

exports.totalConsumption = function () {
    return soapAction("GetPMWarningThreshold", "TotalConsumption", requestBody("GetPMWarningThreshold", moduleParameters(2)));
};

exports.temperature = function () {
    return soapAction("GetCurrentTemperature", "CurrentTemperature", requestBody("GetCurrentTemperature", moduleParameters(3)));
};

exports.radioSettings = function () {
    return soapAction("GetAPClientSettings", "GetAPClientSettingsResult", requestBody("GetAPClientSettings", radioParameters("RADIO_2.4GHz")));
};

exports.setPowerWarning = function () {
    return soapAction("SetPMWarningThreshold", "SetPMWarningThresholdResult", requestBody("SetPMWarningThreshold", powerWarningParameters()));
};

exports.getPowerWarning = function () {
    return soapAction("GetPMWarningThreshold", "GetPMWarningThresholdResult", requestBody("GetPMWarningThreshold", moduleParameters(2)));
};

exports.getTemperatureSettings = function () {
    return soapAction("GetTempMonitorSettings", "GetTempMonitorSettingsResult", requestBody("GetTempMonitorSettings", moduleParameters(3)));
};

exports.setTemperatureSettings = function () {
    return soapAction("SetTempMonitorSettings", "SetTempMonitorSettingsResult", requestBody("SetTempMonitorSettings", temperatureSettingsParameters(3)));
};

exports.getSiteSurvey = function () {
    return soapAction("GetSiteSurvey", "GetSiteSurveyResult", requestBody("GetSiteSurvey", radioParameters("RADIO_2.4GHz")));
};

exports.triggerWirelessSiteSurvey = function () {
    return soapAction("SetTriggerWirelessSiteSurvey", "SetTriggerWirelessSiteSurveyResult", requestBody("SetTriggerWirelessSiteSurvey", radioParameters("RADIO_2.4GHz")));
};

function temperatureSettingsParameters(module) {
    return moduleParameters(module) +
        "<NickName>TemperatureMonitor 3</NickName>" +
        "<Description>Temperature Monitor 3</Description>" +
        "<UpperBound>90</UpperBound>" +
        "<LowerBound>Not Available</LowerBound>" +
        "<OPStatus>false</OPStatus>";
}
function powerWarningParameters() {
    return "<Threshold>28</Threshold>" +
        "<Percentage>70</Percentage>" +
        "<PeriodicType>Weekly</PeriodicType>" +
        "<StartTime>1</StartTime>";
}

function loginRequest() {
    return "<Action>request</Action>"
        + "<Username>" + HNAP_AUTH.User + "</Username>"
        + "<LoginPassword></LoginPassword>"
        + "<Captcha></Captcha>";
}

function loginParameters() {
    var login_pwd = md5.hex_hmac_md5(HNAP_AUTH.PrivateKey, HNAP_AUTH.Challenge);
    return "<Action>login</Action>"
        + "<Username>" + HNAP_AUTH.User + "</Username>"
        + "<LoginPassword>" + login_pwd.toUpperCase() + "</LoginPassword>"
        + "<Captcha></Captcha>";
}

function getHnapAuth(SoapAction, privateKey) {
    var current_time = new Date();
    var time_stamp = Math.round(current_time.getTime() / 1000);
    var auth = md5.hex_hmac_md5(privateKey, time_stamp + SoapAction);
    return auth.toUpperCase() + " " + time_stamp;
}

function readResponseValue(body, elementName) {
    var doc = new DOMParser().parseFromString(body);
    var node = doc.getElementsByTagName(elementName).item(0);
    return (node) ? node.firstChild.nodeValue : "ERROR";
}