let encBundlePresent = false;
let proPresent = false;

export function setEncBundlePresent(present: boolean): void {
  encBundlePresent = present;
}

export function hasEncBundle(): boolean {
  return encBundlePresent;
}

export function setProPresent(present: boolean): void {
  proPresent = present;
}

export function isProPresent(): boolean {
  return proPresent;
}
