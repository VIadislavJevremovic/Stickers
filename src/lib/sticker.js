// Helpers shared by the collection grid and the swap staging grids.

// Split a sticker id into its team code and number:
//   ALG1 -> ALG / 1,  CC-11 -> CC / 11,  FWC7 -> FWC / 7,  00 -> '' / 00
export const codeOf = (id) => (String(id).match(/^[A-Z]+/) || [''])[0];
export const numOf = (id) => String(id).slice(codeOf(id).length).replace(/^-/, '');

// Ownership state from a count: missing / owned / has-spares.
export function stateClass(count) {
  if (count === 0) return 'miss';
  if (count >= 2) return 'spare';
  return 'have';
}
