export const AuthStatus = {
  INIT: "INIT",
  CHECKING: "CHECKING",
  AUTHENTICATED: "AUTHENTICATED",
  ANONYMOUS: "ANONYMOUS",
};
export const Action = {
  START_CHECK: "START_CHECK",
  SET_USER: "SET_USER",
  SET_ANON: "SET_ANON",
  LOGOUT: "LOGOUT",
};
export const initialAuthState = {
  status: AuthStatus.INIT,
  user: null,
  error: null,
};
export function authReducer(state, action) {
  switch (action.type) {
    case Action.START_CHECK:
      return { ...state, status: AuthStatus.CHECKING, error: null };
    case Action.SET_USER:
      return {
        ...state,
        status: AuthStatus.AUTHENTICATED,
        user: action.user,
        error: null,
      };
    case Action.SET_ANON:
      return {
        ...state,
        status: AuthStatus.ANONYMOUS,
        user: null,
        error: null,
      };
    case Action.LOGOUT:
      return {
        ...state,
        status: AuthStatus.ANONYMOUS,
        user: null,
        error: null,
      };
    default:
      return state;
  }
}
