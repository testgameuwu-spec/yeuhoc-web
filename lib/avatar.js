export function getOAuthAvatarUrl(user) {
  const metadata = user?.user_metadata || {};
  const providers = user?.identities || [];
  const hasGoogleIdentity = providers.some((identity) => identity?.provider === 'google');

  if (!hasGoogleIdentity) return '';

  return (
    metadata.avatar_url ||
    metadata.picture ||
    metadata.photo_url ||
    metadata.photoURL ||
    ''
  );
}

export function resolveAvatarUrl(profileAvatarUrl, user) {
  return profileAvatarUrl || getOAuthAvatarUrl(user) || '';
}
