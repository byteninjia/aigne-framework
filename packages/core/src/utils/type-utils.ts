import { get as _get } from "lodash";
import isNil from "lodash/isNil";

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return !isNil(value);
}

export function orArrayToArray<T>(value?: T | T[]): T[] {
  if (isNil(value)) return [];
  return Array.isArray(value) ? value : [value];
}

export function get(obj: unknown, path: string | string[], type?: undefined): unknown | undefined;
export function get(obj: unknown, path: string | string[], type: "string"): string | undefined;
export function get(obj: unknown, path: string | string[], type: "number"): number | undefined;
export function get(obj: unknown, path: string | string[], type?: "string" | "number") {
  const v = _get(obj, path);
  if (type === "string" && typeof v === "string") return v;
  if (type === "number" && typeof v === "number") return v;
}

export function createAccessorArray<T>(
  array: T[],
  accessor: (array: T[], name: string) => T | undefined,
): T[] & { [key: string]: T } {
  return new Proxy(array, {
    get: (t, p, r) => Reflect.get(t, p, r) ?? accessor(array, p as string),
  }) as T[] & { [key: string]: T };
}
