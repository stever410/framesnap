export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function canShareFiles(): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share !== "function") {
    return false;
  }

  if (typeof nav.canShare !== "function") {
    return false;
  }

  const probe = new File([new Blob(["x"], { type: "text/plain" })], "probe.txt", {
    type: "text/plain",
  });

  return nav.canShare({ files: [probe] });
}
