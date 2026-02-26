const USER_GUID_KEY = "stemify.user_guid.v1";

function generate_uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function get_user_guid(): string {
  try {
    const stored = window.localStorage.getItem(USER_GUID_KEY);
    if (stored) return stored;
    const new_guid = generate_uuid();
    window.localStorage.setItem(USER_GUID_KEY, new_guid);
    return new_guid;
  } catch {
    return generate_uuid();
  }
}
