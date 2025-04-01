import type { ComponentType } from 'react'

export interface CompatibilityIssue {
  id?: number
  browser: string
  component: string
  description: string
  severity: 'critical' | 'major' | 'minor'
  timestamp: string
}

export interface TestSection {
  title: string
  component?: ComponentType<any>
  instructions?: string[]
  props?: Record<string, any>
}

export type TestSections = {
  [key: string]: TestSection
}

export interface LoadingSize {
  width: number
  height: number
}

export interface LoadingSizes {
  [key: string]: LoadingSize
}

export interface SeverityStyle {
  backgroundColor: string
  color: string
}

export interface SeverityStyles {
  [key: string]: SeverityStyle
}
