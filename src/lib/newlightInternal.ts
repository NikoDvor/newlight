export const NEWLIGHT_INTERNAL_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";
export const NEWLIGHT_INTERNAL_CLIENT_NAME = "NewLight Internal";

export function isNewLightInternal(clientId: string | null | undefined): boolean {
  return clientId === NEWLIGHT_INTERNAL_CLIENT_ID;
}
/** Internal training / practice workspaces (e.g. "NewLight Account"). Always shown in the admin
 *  workspace switcher, never counted as paying clients. */
export const NEWLIGHT_DEMO_CLIENT_IDS = ["6e1a0c00-0000-4000-8000-00000000a001"];
/** PostgREST "in" list for excluding the training workspaces from NewLight-wide totals. */
export const DEMO_CLIENTS_FILTER = `(${NEWLIGHT_DEMO_CLIENT_IDS.join(",")})`;
