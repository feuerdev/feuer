/**
 * Wrapper around addEventListener
 */
export default class EventBus<DetailType = any> {
  private eventTarget: EventTarget
  constructor(description = "") {
    this.eventTarget = document.appendChild(document.createComment(description))
  }
  on(type: string, listener: (data: CustomEvent<DetailType>) => void) {
    this.eventTarget.addEventListener(type, listener)
  }
  once(type: string, listener: (event: CustomEvent<DetailType>) => void) {
    this.eventTarget.addEventListener(type, listener, { once: true })
  }
  off(type: string, listener: (event: CustomEvent<DetailType>) => void) {
    this.eventTarget.removeEventListener(type, listener)
  }
  emit(type: string, data?: DetailType) {
    return this.eventTarget.dispatchEvent(new CustomEvent(type, { detail: data }))
  }
  /**
   * Shorthand for sending an event to the server socket
   */
  emitSocket(type: string, data?: any) {
    return this.eventTarget.dispatchEvent(
      new CustomEvent("game request", {
        detail: {
          type: type,
          data: data,
        },
      })
    )
  }

  /**
   * Singleton
   */
  private static eventBus: EventBus = null

  /**
   * Singleton getter
   * @returns singleton instance of EventBus
   */
  static shared(): EventBus<any> {
    if (!this.eventBus) {
      this.eventBus = new EventBus<any>()
    }
    return this.eventBus
  }
}
