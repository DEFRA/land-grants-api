
export class ParcelNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ParcelNotFoundError'
    }
}