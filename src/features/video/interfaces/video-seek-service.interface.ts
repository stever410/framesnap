export interface VideoSeekService {
  seekTo(video: HTMLVideoElement, targetSec: number): Promise<void>;
}
