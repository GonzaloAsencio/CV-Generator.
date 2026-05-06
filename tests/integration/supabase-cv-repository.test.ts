// @vitest-environment node
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SupabaseCvRepository } from '@/lib/adapters/supabase-cv-repository'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

const randomEmbedding = () => Array.from({ length: 768 }, () => Math.random())

describe('SupabaseCvRepository', () => {
  const adminClient = createClient(supabaseUrl, serviceKey)
  let repo: SupabaseCvRepository
  let testUserId: string

  beforeAll(async () => {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: `cv-test-${Date.now()}@cv-generator-test.internal`,
      password: 'Test1234!',
      email_confirm: true,
    })
    if (error) throw new Error(`Test setup failed: ${error.message}`)
    testUserId = data.user.id
    repo = new SupabaseCvRepository(adminClient)
  })

  afterAll(async () => {
    await adminClient.auth.admin.deleteUser(testUserId)
  })

  beforeEach(async () => {
    await repo.deleteForUser(testUserId)
  })

  it('should save chunks and retrieve them by similarity', async () => {
    const embedding = randomEmbedding()

    await repo.saveChunks(testUserId, [
      { content: 'Senior TypeScript developer', embedding, chunkIndex: 0 },
    ])

    const results = await repo.findRelevantChunks(testUserId, embedding, 6, 0.5)

    expect(results).toHaveLength(1)
    expect(results[0].content).toBe('Senior TypeScript developer')
    expect(results[0].similarity).toBeGreaterThan(0.99)
  })

  it('should save multiple chunks preserving order', async () => {
    const chunks = [
      { content: 'chunk A', embedding: randomEmbedding(), chunkIndex: 0 },
      { content: 'chunk B', embedding: randomEmbedding(), chunkIndex: 1 },
      { content: 'chunk C', embedding: randomEmbedding(), chunkIndex: 2 },
    ]

    await repo.saveChunks(testUserId, chunks)

    const { data } = await adminClient
      .from('cv_chunks')
      .select('chunk_index, content')
      .eq('user_id', testUserId)
      .order('chunk_index')

    expect(data).toHaveLength(3)
    expect(data![0].chunk_index).toBe(0)
    expect(data![2].chunk_index).toBe(2)
  })

  it('should return no results below threshold', async () => {
    const embedding = randomEmbedding()
    await repo.saveChunks(testUserId, [
      { content: 'some content', embedding, chunkIndex: 0 },
    ])

    // threshold 1.1 is above max similarity (1.0), so nothing passes
    const results = await repo.findRelevantChunks(testUserId, embedding, 6, 1.1)
    expect(results).toHaveLength(0)
  })

  it('should delete all chunks for a user', async () => {
    await repo.saveChunks(testUserId, [
      { content: 'chunk 1', embedding: randomEmbedding(), chunkIndex: 0 },
      { content: 'chunk 2', embedding: randomEmbedding(), chunkIndex: 1 },
    ])

    await repo.deleteForUser(testUserId)

    const results = await repo.findRelevantChunks(testUserId, randomEmbedding(), 6, 0.0)
    expect(results).toHaveLength(0)
  })

  it('should not return chunks belonging to another user', async () => {
    const { data: otherData, error } = await adminClient.auth.admin.createUser({
      email: `other-test-${Date.now()}@cv-generator-test.internal`,
      password: 'Test1234!',
      email_confirm: true,
    })
    if (error) throw new Error(`Other user setup failed: ${error.message}`)
    const otherUserId = otherData.user.id

    try {
      const sharedEmbedding = randomEmbedding()
      await repo.saveChunks(otherUserId, [
        { content: 'other user private content', embedding: sharedEmbedding, chunkIndex: 0 },
      ])

      const results = await repo.findRelevantChunks(testUserId, sharedEmbedding, 6, 0.0)
      expect(results).toHaveLength(0)
    } finally {
      await adminClient.auth.admin.deleteUser(otherUserId)
    }
  })
})
