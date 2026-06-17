const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "David", "Emma",
  "Frank", "Grace", "Henry", "Isla", "James",
];
const LAST_NAMES = [
  "Anderson", "Brown", "Clark", "Davis", "Evans",
  "Foster", "Garcia", "Harris", "Irving", "Johnson",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomFirstName(): string {
  return pick(FIRST_NAMES);
}

export function randomLastName(): string {
  return pick(LAST_NAMES);
}

// Generates a valid 10-digit US phone number (no formatting).
// Area code and exchange are both in the 200–999 range (no 0xx / 1xx).
export function randomPhone(): string {
  const area = String(Math.floor(Math.random() * 800) + 200);
  const exchange = String(Math.floor(Math.random() * 800) + 200);
  const subscriber = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return area + exchange + subscriber;
}

// Timestamp-based email — keeps the required test.automation+…@ex2india.com format.
export function randomEmail(): string {
  return `testing_${Date.now()}@gmail.com`;
}
