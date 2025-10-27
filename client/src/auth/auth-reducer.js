export const AuthStatus = {
  INIT: "INIT",               // только загрузились, ещё не проверяли
  CHECKING: "CHECKING",       // идёт запрос /auth/me
  AUTHENTICATED: "AUTHENTICATED", // залогинен
  ANONYMOUS: "ANONYMOUS",     // не залогинен
};

/**
 * Типы действий (экшены) для редьюсера.
 */
export const Action = {
  START_CHECK: "START_CHECK",
  SET_USER: "SET_USER",
  SET_ANON: "SET_ANON",
  LOGOUT: "LOGOUT",
};

/**
 * Начальное состояние при запуске приложения.
 */
export const initialAuthState = {
  status: AuthStatus.INIT,
  user: null,
  error: null,
};

/**
 * Редьюсер для управления состоянием авторизации.
 * Обрабатывает все действия (экшены) и возвращает новое состояние.
 */
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