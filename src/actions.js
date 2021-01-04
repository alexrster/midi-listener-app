const falseVals = ['off', '0', 'mute', 'muted', 'false', 'inactive', 'disabled', '-']
const trueVals = ['on', '1', 'active', 'unmute', 'unmuted', 'true', 'enabled', 'onair', 'live', '+']

let actions = {}
let state = {}

/* jshint -W061 */
function evalToFunction(x) {
  if (!!x)
    try {
      return eval(x);
    }
    catch (e) {
      console.error(e);
    }

  return _ => _;
}

function getSingleActionHandler(i) {
  const func = eval(`actions.${i.action}`)
  const convFunc = !!i.converter ? evalToFunction(`converters.${i.converter}`) : _ => _;
  const exprFunc = !!i.expr ? evalToFunction(`(function(x) { return ${i.expr}; })`) : _ => _;
  const stateSaveFunc = !!i.state ? v => { state[i.state] = v; return v; } : _ => _;
  
  return func instanceof Function ? p => func(stateSaveFunc(exprFunc(convFunc(p)))) : () => {};
}

function getSequenceActionHandler(i) {
  const convFunc = !!i.converter ? evalToFunction(`converters.${i.converter}`) : _ => _;
  const exprFunc = !!i.expr ? evalToFunction(`(function(x) { return ${i.expr}; })`) : _ => _;

  var hndlrs = []

  i.actions.forEach(v => {
    if (typeof(v) === "string") {
      const func = eval(`actions.${v}`);
      hndlrs.push(func instanceof Function ? p => func(exprFunc(convFunc(p))) : () => {});
    } else {
      hndlrs.push(getActionHandler(v));
    }
  });

  if (hndlrs.length == 0) return _ => _;
  if (hndlrs.length == 1) return hndlrs[0];

  return p => hndlrs.forEach(f => {
    try {
      f(p);
    }
    catch (e) {
      console.error(e);
    }
  });
}

function getActionHandler(i) {
  try {
    if (!!i.action) return getSingleActionHandler(i);
    if (!!i.actions) return getSequenceActionHandler(i)
  }
  catch (error) {
    console.error(error);
  }

  return _ => _;
}

actions.getActionHandler = getActionHandler

/* jshint -W061 */
let converters = {
  bool2str: function(trueVal = "true", falseVal = "false") { return x => x ? trueVal : falseVal },
  str2bool: function(defaultVal = false) {
    return x => {
      var v = String(x).toLowerCase().trim()
      if (trueVals.indexOf(v) !== -1) return true;
      else if (falseVals.indexOf(v) !== -1) return false;
      return defaultVal;
    }
  },
  num2bool: function() { return x => !!x && Number(x) > 0 },
  multiply: function(num = 1) { return x => x * num },
  exp: function(max) { return x => ((Math.sin(x * Math.PI/max - Math.PI/2) + 1) / 2) * max }, // [0..max] to be converted to [0..1] range and then back to [0..max]
  exp3: function(max) { return x => ((Math.pow(Math.sin(x * Math.PI/max - Math.PI/2), 3) + 1) / 2) * max }, // [0..max] to be converted to [0..1] range and then back to [0..max]
  str: function(x) { return () => String(x) },
  num: function(x) { return () => Number(x) },
  valueOf: function(x) { return () => state[x] }
}

exports.actions = actions
exports.converters = converters