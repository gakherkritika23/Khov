import { test } from "@playwright/test";

/**
 * Emit an observed value as a boxed report step so it appears in the Allure /
 * HTML report step tree.
 *
 * A bare `console.log` is NOT a `test.step`, so the value never renders inline
 * with the report steps (it lands only in stdout, which the report doesn't show
 * next to the step tree). Routing value logs through here makes them visible in
 * the report — e.g. each image URL + status, sales office hours, the modal
 * address/phone/consultants, floorplan meta data, calculator field values —
 * while still mirroring to stdout for terminal/CI logs.
 *
 * `box: true` keeps the step collapsed to just its title (the value), matching
 * the clean, client-readable style used by `Validator`.
 */
export async function reportValue(message: string): Promise<void> {
  await test.step(message, async () => {}, { box: true });
  console.log(message);
}
