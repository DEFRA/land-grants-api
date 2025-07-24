import { addMonths, addDays } from "date-fns"

import { getAgreementStartDate, getClosestWorkingDay, calculatePaymentSchedule } from "./payment.schedule.js"

describe("calculatePaymentSchedule", () => {

    test("returns quarterly payment dates", () => {
        jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2));

        const dates = calculatePaymentSchedule(0)

        expect(dates.agreementStartDate).toEqual(new Date(2025, 7, 1))
        expect(dates.payments).toEqual([{
            paymentDate: new Date(2025, 10, 6)
        }, {
            paymentDate: new Date(2026, 1, 6)
        }, {
            paymentDate: new Date(2026, 4, 6)
        }, {
            paymentDate: new Date(2026, 7, 6)
        }])
    })

    test("returns quarterly payment dates where some are weekends", () => {
        jest.useFakeTimers().setSystemTime(new Date(2025, 7, 2));

        const dates = calculatePaymentSchedule(0)

        expect(dates.agreementStartDate).toEqual(new Date(2025, 8, 1))
        expect(dates.payments).toEqual([{
            paymentDate: new Date(2025, 11, 8)
        }, {
            paymentDate: new Date(2026, 2, 6)
        }, {
            paymentDate: new Date(2026, 5, 8)
        }, {
            paymentDate: new Date(2026, 8, 7)
        }])
    })

})

describe("getAgreementStartDate", () => {

    test("returns first of next month", () => {
        const date = getAgreementStartDate()

        expect(date.getMonth()).toEqual(addMonths(new Date(), 1).getMonth())
        expect(date.getDate()).toEqual(1)
    })

})

describe("getClosestWorkingDay", () => {

    test("returns date passed in when not a weekend date", () => {
        const date = new Date(2025, 6, 22)
        const workingDate = getClosestWorkingDay(date)

        expect(workingDate).toEqual(date)
        expect(workingDate.getDate()).toEqual(22)
    })

    test("returns the next monday when a sunday date", () => {
        const date = new Date(2025, 6, 20)
        const workingDate = getClosestWorkingDay(date)

        expect(workingDate).toEqual(addDays(date, 1))
        expect(workingDate.getDay()).toEqual(1)
    })

    test("returns the next monday when a saturday date", () => {
        const date = new Date(2025, 6, 19)
        const workingDate = getClosestWorkingDay(date)

        expect(workingDate.getDay()).toEqual(1)
        expect(workingDate.getDate()).toEqual(21)
    })
})
