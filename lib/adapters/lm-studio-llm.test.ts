import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LmStudioLlmProvider } from './lm-studio-llm'

function makeOkResponse(content: string): Response {
  const body = {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    model: 'gemma-4-8b',
    choices: [
      { message: { role: 'assistant', content }, finish_reason: 'stop' },
    ],
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeErrorResponse(status: number, body: string): Response {
  return new Response(body, { status })
}

describe('LmStudioLlmProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should POST to the correct endpoint with system and user messages', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse('{"result":"ok"}'))

    const provider = new LmStudioLlmProvider('http://localhost:1234', 'gemma-4-8b')
    await provider.complete({ systemPrompt: 'You are an expert', userPrompt: 'Generate a CV' })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:1234/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are an expert' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Generate a CV' })
  })

  it('should not include response_format in the request body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse('{"ok":true}'))

    const provider = new LmStudioLlmProvider()
    await provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body).not.toHaveProperty('response_format')
  })

  it('should return the content string and a positive latencyMs', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse('{"name":"Ana"}'))

    const provider = new LmStudioLlmProvider()
    const result = await provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' })

    expect(result.text).toBe('{"name":"Ana"}')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('should use the model from constructor', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse('{}'))

    const provider = new LmStudioLlmProvider('http://localhost:1234', 'llama-3-8b')
    await provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('llama-3-8b')
  })

  it('should strip a trailing slash from the base URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse('{}'))

    const provider = new LmStudioLlmProvider('http://localhost:1234/')
    await provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:1234/v1/chat/completions')
  })

  it('should throw when the HTTP status is not OK', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrorResponse(503, 'Service Unavailable'))

    const provider = new LmStudioLlmProvider()
    await expect(
      provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toThrow('LM Studio request failed: HTTP 503')
  })

  it('should throw when choices array is empty', async () => {
    const emptyChoices = {
      id: 'chatcmpl-test', object: 'chat.completion', model: 'gemma-4-8b', choices: [],
    }
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(emptyChoices), { status: 200 }),
    )

    const provider = new LmStudioLlmProvider()
    await expect(
      provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toThrow('LM Studio returned an empty or malformed response')
  })

  it('should throw when content is an empty string', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse(''))

    const provider = new LmStudioLlmProvider()
    await expect(
      provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toThrow('LM Studio returned an empty or malformed response')
  })
})
