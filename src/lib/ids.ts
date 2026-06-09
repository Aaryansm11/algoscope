// Stable DOM element ids (data-elid) so the arrow layer can locate cells.

export const cellId = (prefix: string, index: number) => `${prefix}#${index}`;
export const keyId = (prefix: string, keyLabel: string) => `${prefix}@k:${keyLabel}`;
export const setId = (prefix: string, label: string) => `${prefix}@s:${label}`;
export const structId = (name: string) => `struct@${name}`;
export const localId = (name: string) => `local@${name}`;
