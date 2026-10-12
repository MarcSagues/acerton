/** One queue for every consumer of the provider singleton (groups and platform events). */
export class FootballRequestQueue {
  private tail: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;

  waitForSlot(): Promise<void> {
    const slot = this.tail.then(async () => {
      // Re-evaluate after each wait: a 429 response may have extended the cooldown meanwhile.
      while (Date.now() < this.nextRequestAt) {
        await new Promise<void>((resolve) => setTimeout(resolve, this.nextRequestAt - Date.now()));
      }
      this.nextRequestAt = Date.now() + 6_500;
    });
    this.tail = slot.catch(() => undefined);
    return slot;
  }

  pause(retryAfter?: string): void {
    const seconds = Number(retryAfter);
    const date = retryAfter ? Date.parse(retryAfter) : NaN;
    const until =
      retryAfter && Number.isFinite(seconds)
        ? Date.now() + Math.max(0, seconds) * 1000
        : Number.isFinite(date)
          ? date
          : Date.now() + 60_000;
    this.nextRequestAt = Math.max(this.nextRequestAt, until);
  }
}
