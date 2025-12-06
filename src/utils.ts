export function randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxSeconds - minSeconds) * 1000) + minSeconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function delay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

