/**
 * Creates basic explanation section
 * @param {string} title
 * @param {string[]} content
 * @returns {ExplanationSection} - An explanation section object
 */
export const createExplanationSection = (title, content) => {
  return {
    title,
    content
  }
}

/**
 * @import { ExplanationSection } from './explanations.d.js'
 */
