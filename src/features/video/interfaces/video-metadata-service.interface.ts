import type { VideoMetadata } from "../types/video.types";

export interface VideoMetadataService {
  loadMetadata(url: string): Promise<VideoMetadata>;
}
