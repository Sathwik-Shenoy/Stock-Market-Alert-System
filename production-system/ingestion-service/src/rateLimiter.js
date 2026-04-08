class TokenBucket {
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerSec = refillPerSec;
    this.lastRefillTs = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillTs) / 1000;
    const refillAmount = elapsedSec * this.refillPerSec;
    this.tokens = Math.min(this.capacity, this.tokens + refillAmount);
    this.lastRefillTs = now;
  }

  async removeToken() {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

module.exports = { TokenBucket };
