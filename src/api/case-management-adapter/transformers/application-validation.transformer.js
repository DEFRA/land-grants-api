/**
 * @import { CaseManagementValidationResponse, StatusComponent, HeadingComponent, ParagraphComponent, DetailsComponent, ValidationComponent, DetailsSummaryItem } from '~/src/api/case-management-adapter/case-management-adapter.d.js'
 * @import { ApplicationValidationRun, ActionResult, RuleResult } from '~/src/api/application/application.d.js'
 * @import { ExplanationSection } from '~/src/available-area/explanations.d.js'
 */

const DETAILS_SUMMARY_TEXT_CLASSES = 'govuk-details__summary-text'
const LEVEL_3 = 3

/**
 * Creates a heading component
 * @param {string} text - The heading text
 * @param {number} level - The heading level
 * @param {string} [id] - Optional id for the heading
 * @returns {HeadingComponent}
 */
export const createHeadingComponent = (text, level, id) => {
  return {
    component: 'heading',
    text,
    level,
    id: id ?? undefined
  }
}

/**
 * Creates a paragraph component
 * @param {string} text - The paragraph text
 * @returns {ParagraphComponent}
 */
export const createParagraphComponent = (text) => ({
  component: 'paragraph',
  text
})

/**
 * Creates a status component (Passed/Failed)
 * @param {boolean} hasPassed - Whether the check has passed
 * @returns {StatusComponent} - Status component with appropriate text and color
 */
export const createStatusComponent = (hasPassed) => ({
  classes: 'govuk-!-margin-left-8',
  component: 'status',
  text: hasPassed ? 'Passed' : 'Failed',
  colour: hasPassed ? 'green' : 'red'
})

/**
 * Creates a details component
 * @param {string} text - The summary text
 * @param {ValidationComponent[]} items - Items to display in the details (content)
 * @param {string} [classes] - CSS classes for the summary text (defaults to 'govuk-details__summary-text')
 * @param {DetailsSummaryItem[]} [summaryItems] - Additional items to display in summary (e.g., status badges)
 * @returns {DetailsComponent}
 */
const createDetailsComponent = (
  text,
  items,
  classes = DETAILS_SUMMARY_TEXT_CLASSES,
  summaryItems = []
) => ({
  component: 'details',
  summaryItems: [{ text, classes }, ...summaryItems],
  items
})

/**
 * Maps rule names to user-friendly titles (should replace)
 * @param {string} ruleName - The rule name
 * @returns {string} - User-friendly title
 */
export const getRuleFriendlyTitle = (ruleName) => {
  const titleMap = {
    'parcel-has-intersection-with-data-layer-moorland':
      'Is this parcel on the moorland',
    'applied-for-total-available-area':
      'Has the total available area been applied for?'
  }

  return titleMap[ruleName] || ruleName
}

/**
 * Creates available area calculation details component
 * @param {ExplanationSection[]} explanations - The available area explanations
 * @returns {DetailsComponent}
 */
export const createAvailableAreaDetails = (explanations) => {
  const items = explanations.flatMap((explanation) =>
    explanation.content.map((line) => createParagraphComponent(line))
  )

  return createDetailsComponent(
    'Available area calculation explaination',
    items
  )
}

/**
 * Creates rule validation details component
 * @param {RuleResult} rule - The rule result
 * @returns {DetailsComponent}
 */
export const createRuleDetails = (rule) => {
  const items = rule[0].explanations.flatMap((explanation) =>
    explanation.lines.map((line) => createParagraphComponent(line))
  )

  return createDetailsComponent(
    getRuleFriendlyTitle(rule[0].name),
    items,
    DETAILS_SUMMARY_TEXT_CLASSES,
    [createStatusComponent(rule[0].hasPassed)]
  )
}

/**
 * Creates action details component with all sub-components
 * @param {ActionResult} action - The action result
 * @returns {DetailsComponent}
 */
export const createActionDetails = (action) => {
  /** @type {ValidationComponent[]} */
  const actionItems = []

  // Add available area explanation details
  if (action.availableArea) {
    const availableAreaDetails = createAvailableAreaDetails(
      action.availableArea.explanations
    )

    if (availableAreaDetails) {
      actionItems.push(availableAreaDetails)
    }
  }

  // Process rules
  for (const rule of action.rules) {
    actionItems.push(createRuleDetails(rule))
  }

  return createDetailsComponent(
    action.code,
    actionItems,
    DETAILS_SUMMARY_TEXT_CLASSES,
    [createStatusComponent(action.hasPassed)]
  )
}

/**
 * Transform the application validation run to case management format
 * @param {ApplicationValidationRun} applicationValidationRun - The application validation run to transform
 * @returns {CaseManagementValidationResponse | null} Array of validation components for case management
 */
export const applicationValidationRunToCaseManagement = (
  applicationValidationRun
) => {
  if (!applicationValidationRun) {
    return null
  }

  const parcelComponents = applicationValidationRun.parcelLevelResults.flatMap(
    (parcel) => [
      createHeadingComponent(
        `Parcel ID: ${parcel.sheetId} ${parcel.parcelId} checks`,
        LEVEL_3
      ),
      ...parcel.actions.map((action) => createActionDetails(action))
    ]
  )

  return [
    createHeadingComponent('Land parcel rules checks', 2, 'title'),
    ...parcelComponents
  ]
}
