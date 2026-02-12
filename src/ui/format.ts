export function formatTimestamp(totalSec: number): string {
  const safe = Number.isFinite(totalSec) && totalSec >= 0 ? totalSec : 0;
  const min = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);

  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function parseTimestampInput(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.includes(":")) {
    const [minutesPart, secPart] = value.split(":");
    if (minutesPart === undefined || secPart === undefined) {
      return null;
    }

    const minutes = Number(minutesPart);
    const seconds = Number(secPart);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

export function fileSafeTimestamp(totalSec: number): string {
  const safe = Number.isFinite(totalSec) && totalSec >= 0 ? totalSec : 0;
  return safe.toFixed(3).replace(".", "-");
}
