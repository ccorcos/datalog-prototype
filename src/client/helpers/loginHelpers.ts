const usernameKey = "username"

export function getLoggedInUsername() {
	const result = localStorage.getItem(usernameKey)
	if (result) {
		return result
	}
}

export function setLoggedInUsername(username: string) {
	localStorage.setItem(usernameKey, username)
}

export function clearLoggedInUsername() {
	localStorage.removeItem(usernameKey)
}
