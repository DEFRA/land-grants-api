import { startOfMonth, addMonths, addDays, isWeekend, isSaturday, addHours } from 'date-fns';

/**
 * Payment rules

-- assume the user has accepted the agreement today and the agreement start date is the 1st of the next month
-- The first quarterly payment date is always 3 calendar months + 5 days after the agreement start date
-- Subsequent payments are every 3 months on the 5th of the relevant month, see below: 
-- The start date of an Agreement is always on the 1st of the proceeding month, i.e. if accepted an offer say on the 4th August the agreement would have a start date on the 1st Sept
-- Quarterly payments would be on 5th Dec, then 5th March
-- If the ‘Due Date’ falls on a weekend, the payment will always occur the following Monday, and payments will never be made before the ‘Due Date’.
 */

export function calculatePaymentSchedule(amountInPennies, schedule = "quarterly") {
    const agreementStartDate = getAgreementStartDate()
    return {
        agreementStartDate,
        payments: getPaymentDates(agreementStartDate, schedule)
    }
}

/**
 * 
 * @returns the first of next month
 */
export function getAgreementStartDate() {
    return startOfMonth(addMonths(new Date(), 1))
}

/**
 * @param startDate agreement start date
 * @param schedule quarterly
 * @returns { paymentDate: date }[]
 */
export function getPaymentDates(startDate, schedule) {
    const paymentDates = [];

    if (schedule == "quarterly") {
        // first payment date is start date plus 3 months and 5 days
        const firstPaymentDate = addDays(addMonths(startDate, 3), 5)
        paymentDates.push({ paymentDate: getClosestWorkingDay(firstPaymentDate) })
        // subsequent payments are plus 3 months or next monday if a weekend
        for (let i = 0; i < 3; i++) {
            const paymentDate = getClosestWorkingDay(addMonths(firstPaymentDate, (i + 1) * 3))
            paymentDates.push({ paymentDate })
        }
    }

    return paymentDates
}

/**
 * 
 * @param {paymentDate} paymentDate 
 * @returns same date or next working date (mon-fri)
 */
export function getClosestWorkingDay(paymentDate) {
    if (!isWeekend(paymentDate)) return paymentDate

    return addDays(paymentDate, isSaturday(paymentDate) ? 2 : 1)
}