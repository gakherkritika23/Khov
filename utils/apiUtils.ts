import { Page, Response } from "@playwright/test";

export async function waitForApi(
  page: Page,
  endpoint: string,
): Promise<Response> {
  return await page.waitForResponse(
    (resp) => resp.url().includes(endpoint) && resp.status() === 200,
  );
}

export async function apiResponseData<T>(
  page: Page,
  endpoint: string,
): Promise<T> {
  const apiResponse = await waitForApi(page, endpoint);
  return (await apiResponse.json()) as T;
}
