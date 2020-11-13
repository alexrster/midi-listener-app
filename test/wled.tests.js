const assert = require('assert')
const { MqttWled } = require('../src/mods/wled')

describe('WLED', () => {
  it('should be created', () => {
    const wled = new MqttWled(_ => _)
    assert.notStrictEqual(wled.config, null, 'wled.config is null')
  })

  it('should trigger callback to subscribe', () => {
    function cb() {
      assert.ok(true)
    }

    const wled = new MqttWled(cb)
  })
  
  it('should have default config', () => {
    const wled = new MqttWled(_ => _)
    assert.ok(wled.config, 'Config shouldn\'t be null')
  })

  it('should update config when notified', () => {
    var updFunc;
    function cb(f) {
      updFunc = f
    }

    const wled = new MqttWled(cb)
    updFunc(`<?xml version="1.0" ?>
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
    </vs>`)
    assert.ok(wled.config, 'Config shouldn\'t be null')
//    assert.ok(wled.config.masterBrightness, 'Config.masterBrightness shouldn\'t be empty')
//    assert.strictEqual(wled.config.masterBrightness, 16, 'Config.masterBrightness value isn\'t updated')
  })

  it('should return 2', () => {
         assert.equal(1 + 1, 2)
     })
 
  it('should return 9', () => {
         assert.equal(3 * 3, 9)
     })
 })
 