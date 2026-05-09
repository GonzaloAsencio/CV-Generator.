import type { SupabaseClient } from '@supabase/supabase-js'
import type { LlmCallLogger, LlmCallLog } from '@/lib/ports/llm-call-logger'

export class SupabaseLlmCallLogger implements LlmCallLogger {
  constructor(private readonly client: SupabaseClient) {}

  async log(entry: LlmCallLog): Promise<void> {
    await this.client.from('llm_calls').insert({
      user_id: entry.userId,
      kind: entry.kind,
      prompt: entry.prompt,
      response: entry.response,
      parsed_ok: entry.parsedOk,
      retry_count: entry.retryCount,
      latency_ms: entry.latencyMs,
      error: entry.error ?? null,
    })
    // Fire-and-forget: logging failures must never break the main flow
  }
}
