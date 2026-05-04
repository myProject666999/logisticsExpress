const TOKEN_KEY = 'logistics_token'
const USER_INFO_KEY = 'logistics_user_info'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

export function getUserInfo() {
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  return userInfo ? JSON.parse(userInfo) : null
}

export function setUserInfo(userInfo) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export function isLoggedIn() {
  return !!getToken()
}

export function isAdmin() {
  const userInfo = getUserInfo()
  return userInfo?.role === 'admin'
}

export function isEmployee() {
  const userInfo = getUserInfo()
  return userInfo?.role === 'employee' || userInfo?.role === 'admin'
}

export function isUser() {
  const userInfo = getUserInfo()
  return userInfo?.role === 'user' || userInfo?.role === 'employee' || userInfo?.role === 'admin'
}
