export const buildAppDownloadPath = (workspaceSlug: string) => `/app/${encodeURIComponent(workspaceSlug)}`;

export const buildAppDownloadUrl = (workspaceSlug: string, origin = window.location.origin) =>
  `${origin}${buildAppDownloadPath(workspaceSlug)}`;
