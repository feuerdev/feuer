/**
 * Wrapper around addEventListener
 */
import PubSub from "pubsub-js"

export default class EventBus<DetailType = any> {
  on(type: string, listener: (data: CustomEvent<DetailType>) => void) {
    PubSub.subscribe(type, (_a, b) => {
      listener(b)
    })
  }

  emit(type: string, data?: DetailType) {
    PubSub.publish(type, data)
  }
  /**
   * Shorthand for sending an event to the server socket
   */
  emitSocket(type: string, data?: any) {
    PubSub.publish("game request", {
      detail: {
        type: type,
        data: data,
      },
    })
  }

  /**
   * Singleton
   */
  private static eventBus: EventBus | null = null

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
