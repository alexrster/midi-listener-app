const parser = require('fast-xml-parser');
const he = require('he');
const { EventEmitter } = require('events')

/*
<?xml version="1.0" ?>
<vs>
  <ac>16</ac>
  <cl>255</cl>
  <cl>0</cl>
  <cl>230</cl>
  <cs>0</cs>
  <cs>0</cs>
  <cs>0</cs>
  <ns>1</ns>
  <nr>0</nr>
  <nl>0</nl>
  <nf>1</nf>
  <nd>60</nd>
  <nt>0</nt>
  <fx>91</fx>
  <sx>79</sx>
  <ix>179</ix>
  <fp>2</fp>
  <wv>-1</wv>
  <ws>0</ws>
  <ps>0</ps>
  <cy>0</cy>
  <ds>ay-wled-05</ds>
  <ss>0</ss>
</vs>
*/
var xmlMap = {
  "ac": "masterBrightness",                  // 0..255
  "cl": "primaryColorRGB",                   // 3x 0..255
  "cs": "secondaryColorRGB",                 // 3x 0..255
  "ns": "notificationSender",                // 0/1
  "nr": "notificationReceiver",              // 0/1
  "nl": "nightlightMode",                    // 0/1
  "nf": "nightlightFadeType",                // 0..2
  "nd": "nightlightDelay",                   // 0..255
  "nt": "nightlightTargetBrightness",        // 0..255
  "fx": "effectIndex",                       // 0..73
  "sx": "effectSpeed",                       // 0..255
  "ix": "effectIntensity",                   // 0..255
  "fp": "palette",                           // 0..43
  "wv": "primaryWhite",                      // -1..255
  "ws": "secondaryWhite",                    // 0..255
  "md": "hsbUI",                             // 0/1, rgb=0, hsb=1
  "ds": "serverDescription",                 // string
  "ps": "presetSaveTo",                      // 1..16
  "cy": "presetCycle",                       // 0..2, (2 - toggle)
  "ss": "segmentIndex",                      // 0..9
}

var options = {
  attributeNamePrefix : "@_",
  attrNodeName: "attr", //default is 'false'
  textNodeName : "#text",
  ignoreAttributes : true,
  ignoreNameSpace : false,
  allowBooleanAttributes : false,
  parseNodeValue : true,
  parseAttributeValue : false,
  trimValues: true,
  cdataTagName: "__cdata", //default is 'false'
  cdataPositionChar: "\\c",
  parseTrueNumberOnly: false,
  arrayMode: false, //"strict"
  attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
  tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
  stopNodes: ["parse-me-as-string"]
}

function parseWledXml(xmlData) {
  try {
    return parser.parse(xmlData, options, true);
  } catch(error) {
    console.log(error.message)
  }

  return null
}

var wled = function(subscriberFunc) {
  var self = this;

  this.config = {
    "masterBrightness": 0,
    "primaryColorRGB": [0, 0, 0],
    "secondaryColorRGB": [0, 0, 0],
    "notificationSender": 1,
    "notificationReceiver": 0,
    "nightlightMode": 0,
    "nightlightFadeType": 0,
    "nightlightDelay": 0,
    "nightlightTargetBrightness": 0,
    "effectIndex": 0,
    "effectSpeed": 0,
    "effectIntensity": 0,
    "palette": 0,
    "primaryWhite": -1,
    "secondaryWhite": 0,
    "hsbUI": 0,
    "serverDescription": "",
    "presetSaveTo": 1,
    "presetCycle": 0,
    "segmentIndex": 0,
  }

  var setProp = function(prop, val) {
    if (!!xmlMap[prop]) self.config[xmlMap[prop]] = val;
  }

  var onStateCallback = function(xmlData) {
    var state = parseWledXml(xmlData);
    if (!state || !state.vs) return;

    for (var i in state.vs) {
      setProp(i, state.vs[i]);
    }
  }

  subscriberFunc(onStateCallback);
}

wled.prototype = Object.create(EventEmitter.prototype);

exports.Wled = wled;