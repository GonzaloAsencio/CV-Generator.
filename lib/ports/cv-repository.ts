export interface CvChunk {
  content: string
  embedding: number[]
  chunkIndex: number
}

export interface RelevantChunk {
  id: string
  content: string
  similarity: number
}

export interface CvRepository {
  saveChunks(userId: string, chunks: CvChunk[]): Promise<void>
  findRelevantChunks(
    userId: string,
    embedding: number[],
    top: number,
    threshold: number,
  ): Promise<RelevantChunk[]>
  deleteForUser(userId: string): Promise<void>
}
