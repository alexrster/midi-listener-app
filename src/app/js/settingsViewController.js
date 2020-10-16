const { ipcRenderer } = require('electron');

// {
//   "title": "Person",
//   "type": "object",
//   "properties": {
//     "name": {
//       "type": "string",
//       "description": "First and Last name",
//       "minLength": 4,
//       "default": "Jeremy Dorn"
//     },
//     "age": {
//       "type": "integer",
//       "default": 25,
//       "minimum": 18,
//       "maximum": 99
//     },
//     "favorite_color": {
//       "type": "string",
//       "format": "color",
//       "title": "favorite color",
//       "default": "#ffa500"
//     },
//     "gender": {
//       "type": "string",
//       "enum": [
//         "male",
//         "female"
//       ]
//     },
//     "location": {
//       "type": "object",
//       "title": "Location",
//       "properties": {
//         "city": {
//           "type": "string",
//           "default": "San Francisco"
//         },
//         "state": {
//           "type": "string",
//           "default": "CA"
//         },
//         "citystate": {
//           "type": "string",
//           "description": "This is generated automatically from the previous two fields",
//           "template": "{{city}}, {{state}}",
//           "watch": {
//             "city": "location.city",
//             "state": "location.state"
//           }
//         }
//       }
//     },
//     "pets": {
//       "type": "array",
//       "format": "table",
//       "title": "Pets",
//       "uniqueItems": true,
//       "items": {
//         "type": "object",
//         "title": "Pet",
//         "properties": {
//           "type": {
//             "type": "string",
//             "enum": [
//               "cat",
//               "dog",
//               "bird",
//               "reptile",
//               "other"
//             ],
//             "default": "dog"
//           },
//           "name": {
//             "type": "string"
//           }
//         }
//       },
//       "default": [
//         {
//           "type": "dog",
//           "name": "Walter"
//         }
//       ]
//     }
//   }
// }

const schema = {
  "title": "Settings",
  "type": "object",
  "properties": {
    "mqttUrl": {
      "type": "string",
      "title": "MQTT URL"
    },
    "midiDevice": {
      "type": "string",
      "enum": [
        "LPD8",
        "Launchpad"
      ],
      "title": "MIDI device"
    },
    "mqttSubscriptions": {
      "type": "array",
      "format": "table",
      "title": "MQTT handlers",
      "uniqueItems": false,
      "items": {
        "type": "object",
        "title": "MQTT topic subscription",
        "properties": {
          "name": {
            "type": "string",
            "title": "Topic"
          },
          "dataType": {
            "type": "string",
            "enum": [
              "bool",
              "number100",
              "number255"
            ],
            "title": "Data type"
          },
          "actionName": {
            "type": "string",
            "title": "Action"
          }
        }
      }
    },
    "actions": {
      "type": "array",
      "format": "table",
      "title": "Actions",
      "uniqueItems": true,
      "items": {
        "type": "object",
        "title": "MQTT topic subscription",
        "properties": {
          "name": {
            "type": "string",
            "title": "Action"
          },
          "type": {
            "type": "string",
            "enum": [
              "Pad",
              "Knob"
            ]
          }
        }
      }
    }
  }
}

let jedata = {
  "title": "JSON-Editor Example",
  "schema": schema,
  "startval": {},
  "config": {
    "theme": "bootstrap3",
    "iconlib": "bootstrap3",
    "object_layout": "normal",
    "template": "default",
    "show_errors": "interaction",
    "required_by_default": 0,
    "no_additional_properties": 0,
    "display_required_only": 0,
    "remove_empty_properties": 0,
    "keep_oneof_values": 1,
    "ajax": 0,
    "ajaxCredentials": 0,
    "show_opt_in": 0,
    "disable_edit_json": 1,
    "disable_collapse": 1,
    "disable_properties": 0,
    "disable_array_add": 0,
    "disable_array_reorder": 0,
    "disable_array_delete": 0,
    "enable_array_copy": 0,
    "array_controls_top": 0,
    "disable_array_delete_all_rows": 0,
    "disable_array_delete_last_row": 0,
    "prompt_before_delete": 1,
    "lib_aceeditor": 0,
    "lib_autocomplete": 0,
    "lib_sceditor": 0,
    "lib_simplemde": 0,
    "lib_select2": 0,
    "lib_selectize": 0,
    "lib_choices": 0,
    "lib_flatpickr": 0,
    "lib_signaturepad": 0,
    "lib_mathjs": 0,
    "lib_cleavejs": 0,
    "lib_jodit": 0,
    "lib_jquery": 0,
    "lib_dompurify": 0
  },
//  "code": "// The following lines are mandatory and readonly. You can add custom code above and below.\nif (jseditor instanceof window.JSONEditor) jseditor.destroy();\njseditor = new window.JSONEditor(document.querySelector(\"#json-editor-form\"), jedata);",
//  "style": "",
  "desc": "Add optional description here. (HTML format)"
}

function updateSettings() {
  ipcRenderer.invoke(
    "perform-action", 
    { 
      "action": 'settings.set', 
      "settings": { } 
    })
}

var jseditor;
function init() {
  jseditor = new window.JSONEditor(document.querySelector("#json-editor-form"), jedata);
}
