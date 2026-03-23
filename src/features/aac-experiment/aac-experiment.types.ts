// Type definitions for AAC experiment

export interface LandCover {
  areaSqm: number
  name: string
}

export interface Action {
  code: string
  areaSqm: number
}

export type CompatibilityMatrix = string[][]

export type LandCoversForActions = Record<string, string[]>

export type LandCoverOrderPerAction = Record<string, string[]>

export interface ActionStack {
  stackNumber: number
  areaSqm: number
  actions: string[]
  landCover: string
}

export interface ActionWithPermutations {
  code: string
  permutations: string[][]
}

export type CompatibilityCheckFn = (code1: string, code2: string) => boolean
