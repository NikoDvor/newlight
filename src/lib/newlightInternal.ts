export const NEWLIGHT_INTERNAL_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";
export const NEWLIGHT_INTERNAL_CLIENT_NAME = "NewLight Internal";

export function isNewLightInternal(clientId: string | null | undefined): boolean {
  return clientId === NEWLIGHT_INTERNAL_CLIENT_ID;
}