// Fields safe to expose when embedding a User relation in an API response --
// excludes passwordHash and other internal columns. Use this `select`
// wherever a related User is nested into a response body instead of `true`.
export const SAFE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} as const;
