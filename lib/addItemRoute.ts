// Params for opening the add-item screen.
//
// The add screen is a (hidden) tab, and tab routes keep their last params:
// navigating to it with only some params merges them into whatever was there
// before. So after editing an item, or adding one from visual search, the next
// tap on "+" still carried the old `id` or `incomingPhoto`, and the form came
// up showing the previous item. Every entry point therefore sends the full set,
// with the unused ones blanked. Empty strings are falsy, which is how the add
// screen tests each of them.
export type AddItemParams = {
  id?: string;
  incomingPhoto?: string;
  incomingDescription?: string;
  collection?: string;
  event?: string;
};

export function addItemParams(params: AddItemParams = {}): Required<AddItemParams> {
  return {
    id: '',
    incomingPhoto: '',
    incomingDescription: '',
    collection: '',
    event: '',
    ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
    ),
  } as Required<AddItemParams>;
}

export function addItemHref(params: AddItemParams = {}) {
  return { pathname: '/(tabs)/add', params: addItemParams(params) } as any;
}
