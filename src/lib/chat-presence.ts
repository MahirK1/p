/**
 * In-memory presence: korisnici koji su trenutno spojeni na chat (socket).
 * Koristi se za prikaz "online" / "offline" u chatu.
 */
const onlineUserIds = new Set<string>();

export function addOnlineUser(userId: string): void {
  onlineUserIds.add(userId);
}

export function removeOnlineUser(userId: string): void {
  onlineUserIds.delete(userId);
}

export function isUserOnline(userId: string): boolean {
  return onlineUserIds.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUserIds);
}
