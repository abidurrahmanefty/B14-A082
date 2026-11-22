export const BORROW_DURATION_DAYS = 7;

export function addBorrowDays(date: Date, days = BORROW_DURATION_DAYS): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
