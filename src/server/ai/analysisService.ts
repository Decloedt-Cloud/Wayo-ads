import { aiVideoRepository } from './repositories';

export async function getVideoForAnalysis(videoId: string) {
  const video = await aiVideoRepository.findById(videoId);

  if (!video) {
    return { error: 'Video not found' };
  }

  return { video };
}
