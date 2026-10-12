import { FootballRequestQueue } from './football-request-queue';

describe('shared football provider request queue', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2030-10-12T12:00:00Z') }));
  afterEach(() => jest.useRealTimers());

  it('paces concurrent consumers and places the eleventh request outside the first minute', async () => {
    const start = Date.now();
    const queue = new FootballRequestQueue();
    const times: number[] = [];
    const pending = Array.from({ length: 11 }, () =>
      queue.waitForSlot().then(() => times.push(Date.now() - start)),
    );
    await jest.advanceTimersByTimeAsync(65_000);
    await Promise.all(pending);
    expect(times).toEqual(Array.from({ length: 11 }, (_, i) => i * 6500));
  });

  it('extends a queued wait on a retry-after response rather than firing during cooldown', async () => {
    const queue = new FootballRequestQueue();
    await queue.waitForSlot();
    const executed = jest.fn();
    const next = queue.waitForSlot().then(executed);
    await jest.advanceTimersByTimeAsync(1000);
    queue.pause('30');
    await jest.advanceTimersByTimeAsync(29_999);
    expect(executed).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await next;
    expect(executed).toHaveBeenCalledTimes(1);
  });

  it('uses a conservative cooldown for a missing retry-after header', async () => {
    const queue = new FootballRequestQueue();
    queue.pause();
    const executed = jest.fn();
    const pending = queue.waitForSlot().then(executed);
    await jest.advanceTimersByTimeAsync(59_999);
    expect(executed).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(executed).toHaveBeenCalledTimes(1);
  });
});
