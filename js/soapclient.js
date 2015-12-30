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
        return processLogin(HNAP_LOGIN_METHOD);
    }).catch(function (err) {
        console.log("error:", err);
    });
};

function processLogin(method) {
    return request(HNAP_METHOD, HNAP_AUTH.URL,
        {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"' + HNAP1_XMLNS + method + '"',
                "HNAP_AUTH": getHnapAuth('"' + HNAP1_XMLNS + method + '"', HNAP_AUTH.PrivateKey),
                "Cookie": "uid=" + HNAP_AUTH.Cookie
            },
            body: requestBody(method, loginParameters())
        }).then(function (response) {
        return response.statusCode;
    }).catch(function (err) {
        console.log("error:", err);
    })
}
function save_login_result(body) {
    var doc = new DOMParser().parseFromString(body);
    HNAP_AUTH.Result = doc.getElementsByTagName(HNAP_LOGIN_METHOD + "Result").item(0).firstChild.nodeValue;
    HNAP_AUTH.Challenge = doc.getElementsByTagName("Challenge").item(0).firstChild.nodeValue;
    HNAP_AUTH.PublicKey = doc.getElementsByTagName("PublicKey").item(0).firstChild.nodeValue;
    HNAP_AUTH.Cookie = doc.getElementsByTagName("Cookie").item(0).firstChild.nodeValue;
    HNAP_AUTH.PrivateKey = md5.hex_hmac_md5(HNAP_AUTH.PublicKey + HNAP_AUTH.Pwd, HNAP_AUTH.Challenge).toUpperCase();
}

function requestBody(method, parameters) {
    var str = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
        "<soap:Envelope " +
        "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
        "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " +
        "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
        "<soap:Body>" +
        "<" + method + " xmlns=\"";

    str += HNAP1_XMLNS;

    str += "\">" +
        parameters +
        "</" + method + "></soap:Body></soap:Envelope>";
    return str;
}

function commandParameters(module) {
    var param = "<ModuleID>" + module + "</ModuleID>";
    return param;
}

exports.sendCommand = function (method, responseElement, module) {
    return request(HNAP_METHOD, HNAP_AUTH.URL,
        {
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"' + HNAP1_XMLNS + method + '"',
                "HNAP_AUTH": getHnapAuth('"' + HNAP1_XMLNS + method + '"', HNAP_AUTH.PrivateKey),
                "Cookie": "uid=" + HNAP_AUTH.Cookie
            },
            body: requestBody(method, commandParameters(module))
        }).then(function (response) {
        return readResponseValue(response.getBody(HNAP_BODY_ENCODING), responseElement);
    }).catch(function (err) {
        console.log("error:", err);
    });
};

function loginRequest() {
    var para = "<Action>request</Action>"
        + "<Username>" + HNAP_AUTH.User + "</Username>"
        + "<LoginPassword></LoginPassword>"
        + "<Captcha></Captcha>";

    return para;
}

function loginParameters() {
    var login_pwd = md5.hex_hmac_md5(HNAP_AUTH.PrivateKey, HNAP_AUTH.Challenge);
    var para = "<Action>login</Action>"
        + "<Username>" + HNAP_AUTH.User + "</Username>"
        + "<LoginPassword>" + login_pwd.toUpperCase() + "</LoginPassword>"
        + "<Captcha></Captcha>";
    return para;
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