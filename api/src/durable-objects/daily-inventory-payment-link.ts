export function squareDefinitelyRejectedPaymentLink(status: number): boolean {
  return status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 409 &&
    status !== 429;
}
