const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

const runtime = 'pack/kubejs/server_scripts/84_expedition.js'
assert.ok(fs.existsSync(runtime), 'expedition railway runtime exists')
const events = {}
const context = {
  ServerEvents: {
    tick(handler) { events.tick = handler },
    loaded(handler) { events.loaded = handler },
    unloaded(handler) { events.unloaded = handler }
  },
  PlayerEvents: {
    loggedIn(handler) { events.loggedIn = handler }
  }
}
vm.createContext(context)
vm.runInContext(fs.readFileSync(runtime, 'utf8'), context)

const surface = Array.from({length: 193}, (_, x) =>
  x < 40 ? 73 : x < 116 ? 74 + Math.floor((x - 40) / 3) : 99)
const y = Array.from(context.gpExpeditionGrade(surface, 73, 99))
assert.equal(y.length, 193)
assert.ok(y.slice(0, 24).every(height => height === 73))
assert.ok(y.slice(169).every(height => height === 99))
const ascending = []
for (let x = 1; x < y.length; x++) {
  assert.ok(Math.abs(y[x] - y[x - 1]) <= 1, 'adjacent rails connect')
  if (y[x] !== y[x - 1]) ascending.push(x)
}
assert.ok(ascending.length >= 26)
assert.ok(ascending.every((x, i) => i === 0 || x - ascending[i - 1] >= 3), 'grade transitions have a flat approach')
