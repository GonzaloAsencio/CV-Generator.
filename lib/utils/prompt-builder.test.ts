import { describe, it, expect } from 'vitest'
import {
  CV_SYSTEM_PROMPT,
  buildHarvardUserPrompt,
  buildRetryUserPrompt,
  extractJsonFromLlmText,
} from './prompt-builder'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

const company: CompanySnapshot = {
  name: 'Acme Corp',
  industry: 'Software',
  techStack: ['React', 'Node.js'],
  culture: 'Collaborative',
  notes: 'Focus on remote',
}

const cvText = 'Worked on React apps. Led backend team.'

describe('CV_SYSTEM_PROMPT', () => {
  it('should instruct the model to output only valid JSON', () => {
    expect(CV_SYSTEM_PROMPT).toContain('ÚNICAMENTE con JSON válido')
  })
})

describe('buildHarvardUserPrompt', () => {
  it('should include the company name', () => {
    const prompt = buildHarvardUserPrompt(cvText, company, 'Looking for React dev')
    expect(prompt).toContain('Acme Corp')
  })

  it('should include the tech stack', () => {
    const prompt = buildHarvardUserPrompt(cvText, company, 'job offer text')
    expect(prompt).toContain('React')
    expect(prompt).toContain('Node.js')
  })

  it('should include the CV text content', () => {
    const prompt = buildHarvardUserPrompt(cvText, company, 'job offer text')
    expect(prompt).toContain('Worked on React apps')
    expect(prompt).toContain('Led backend team')
  })

  it('should include the job offer', () => {
    const prompt = buildHarvardUserPrompt(cvText, company, 'Senior React Developer needed')
    expect(prompt).toContain('Senior React Developer needed')
  })

  it('should handle optional company fields gracefully', () => {
    const minimal: CompanySnapshot = { name: 'Startup' }
    const prompt = buildHarvardUserPrompt(cvText, minimal, 'job offer')
    expect(prompt).toContain('Startup')
    expect(prompt).not.toContain('undefined')
  })
})

describe('buildRetryUserPrompt', () => {
  it('should include original prompt, first response and validation error', () => {
    const prompt = buildRetryUserPrompt('original context', '{"bad":"json"}', 'Required field "name" is missing')
    expect(prompt).toContain('original context')
    expect(prompt).toContain('{"bad":"json"}')
    expect(prompt).toContain('Required field "name" is missing')
  })
})

describe('extractJsonFromLlmText', () => {
  it('should parse plain JSON', () => {
    const result = extractJsonFromLlmText('{"key": "value"}')
    expect(result).toEqual({ key: 'value' })
  })

  it('should strip markdown json code fences', () => {
    const result = extractJsonFromLlmText('```json\n{"key": "value"}\n```')
    expect(result).toEqual({ key: 'value' })
  })

  it('should strip generic code fences', () => {
    const result = extractJsonFromLlmText('```\n{"key": "value"}\n```')
    expect(result).toEqual({ key: 'value' })
  })

  it('should throw on invalid JSON', () => {
    expect(() => extractJsonFromLlmText('not json')).toThrow()
  })
})
