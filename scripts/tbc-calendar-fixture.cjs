'use strict';
// Test-only calendar control. It deliberately replaces Date only; browser scheduling
// APIs stay native so page-error checks exercise the production timer behavior.
const assert = require('node:assert/strict');

const STATE = '__TBC_TEST_CALENDAR_FIXTURE__';
const STORAGE = '__tbc_test_calendar_fixture_ms__';
const SCHEDULERS = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestIdleCallback', 'cancelIdleCallback', 'requestAnimationFrame', 'cancelAnimationFrame'];

function milliseconds(value) {
  const time = value instanceof Date ? value.valueOf() : new Date(value).valueOf();
  assert.ok(Number.isFinite(time), `invalid fixture calendar time: ${value}`);
  return time;
}

async function installCalendarFixture(page, initial) {
  const initialMilliseconds = milliseconds(initial);
  await page.addInitScript(({ stateKey, storageKey, initialTime, schedulers }) => {
    const NativeDate = window.Date;
    const nativeSchedulers = Object.fromEntries(schedulers.map(name => [name, window[name]]));
    let current = initialTime;
    try {
      const raw = sessionStorage.getItem(storageKey);
      const saved = raw === null ? NaN : Number(raw);
      if (Number.isFinite(saved)) current = saved;
    } catch {}
    const persist = value => { try { sessionStorage.setItem(storageKey, String(value)); } catch {} };
    const FixtureDate = function(...args) {
      if (!new.target) return new NativeDate(current).toString();
      return args.length ? new NativeDate(...args) : new NativeDate(current);
    };
    Object.setPrototypeOf(FixtureDate, NativeDate);
    FixtureDate.prototype = NativeDate.prototype;
    FixtureDate.now = () => current;
    FixtureDate.parse = NativeDate.parse;
    FixtureDate.UTC = NativeDate.UTC;
    Object.defineProperty(window, 'Date', { configurable: true, writable: true, value: FixtureDate });
    window[stateKey] = {
      get: () => current,
      set: value => {
        const next = Number(value);
        if (!Number.isFinite(next)) throw new TypeError('invalid fixture calendar time');
        current = next; persist(current);
      },
      nativeSchedulers
    };
    persist(current);
  }, { stateKey: STATE, storageKey: STORAGE, initialTime: initialMilliseconds, schedulers: SCHEDULERS });
}

async function setCalendarTime(page, value) {
  const time = milliseconds(value);
  await page.evaluate(({ stateKey, time }) => {
    const fixture = window[stateKey];
    if (!fixture) throw new Error('calendar fixture is not installed');
    fixture.set(time);
  }, { stateKey: STATE, time });
}

async function assertCalendarFixture(page, expected) {
  const state = await page.evaluate(({ stateKey, schedulers }) => {
    const fixture = window[stateKey];
    return {
      installed: Boolean(fixture),
      fixtureTime: fixture?.get(),
      constructedTime: new Date().valueOf(),
      now: Date.now(),
      apiIdentities: Object.fromEntries(schedulers.map(name => [name, window[name] === fixture?.nativeSchedulers?.[name]]))
    };
  }, { stateKey: STATE, schedulers: SCHEDULERS });
  assert.equal(state.installed, true, 'calendar fixture must be installed before application code runs');
  const target = expected === undefined ? state.fixtureTime : milliseconds(expected);
  assert.equal(state.fixtureTime, target, 'calendar fixture time must match its expected value');
  assert.equal(state.constructedTime, target, 'new Date() must use the fixture calendar');
  assert.equal(state.now, target, 'Date.now() must use the fixture calendar');
  assert.deepEqual(state.apiIdentities, Object.fromEntries(SCHEDULERS.map(name => [name, true])),
    'calendar fixture must leave native timer, idle-callback and animation APIs untouched');
  return state;
}

module.exports = { installCalendarFixture, setCalendarTime, assertCalendarFixture, SCHEDULERS };
