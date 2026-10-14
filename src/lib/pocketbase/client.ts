import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// In PocketBase SDK 0.26+, the realtime SSE connection binds to the auth token present
// during initial handshake. When auth changes (login, logout, token refresh),
// pending or future subscription requests on that existing connection carry a different token,
// leading to 403: "The current and the previous request authorization don't match."
// Tearing down the realtime connection resets the SSE client so the next subscription
// establishes a clean handshake with the current token.
pb.authStore.onChange(() => {
  try {
    void pb.realtime.unsubscribe()
  } catch {
    /* safe to ignore when offline or not connected */
  }
})

export default pb
