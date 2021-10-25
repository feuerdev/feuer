import Hex from "./hex"
import Log from "../server/src/util/log"

class QueueElement {
  public element: any
  public priority: number

  constructor(element, priority) {
    this.element = element
    this.priority = priority
  }
}

class PriorityQueue {
  public items: QueueElement[] = []

  public enqueue(element, priority) {
    let qe = new QueueElement(element, priority)

    let contain = false

    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority > qe.priority) {
        this.items.splice(i, 0, qe)
        contain = true
        break
      }
    }

    if (!contain) {
      this.items.push(qe)
    }
  }

  public dequeue() {
    if (!this.isEmpty()) {
      return this.items.shift().element
    } else return null
  }

  public front() {
    if (!this.isEmpty()) {
      return this.items[0]
    } else return null
  }

  public isEmpty() {
    return this.items.length === 0
  }
}

export function astar(tiles, start: Hex, goal: Hex) {
  let heuristic = function (a: Hex, b: Hex) {
    return a.distance(b)
  }

  let frontier = new PriorityQueue()
  frontier.enqueue(start, 0)

  let came_from = {}
  let cost_so_far = {}
  came_from[start.hash()] = null
  cost_so_far[start.hash()] = 0

  while (!frontier.isEmpty()) {
    let current: Hex = frontier.dequeue()

    // if(current.equals(goal)) {
    //   break;
    // }

    for (let next of current.neighbors()) {
      if (tiles[next.hash()]) {
        let new_cost =
          cost_so_far[current.hash()] + 1 / tiles[current.hash()].movementFactor //TODO calculate correct movementcost
        if (
          cost_so_far[next.hash()] === undefined ||
          new_cost < cost_so_far[next.hash()]
        ) {
          cost_so_far[next.hash()] = new_cost
          let priority = new_cost + heuristic(goal, next)
          frontier.enqueue(next, priority)
          came_from[next.hash()] = current
        }
      }
    }
  }

  let result: Hex[] = []
  let x: Hex = goal
  while (!x.equals(start)) {
    result.push(x)
    x = came_from[x.hash()]
    if (result.length > 999) {
      Log.error("Pathfinding error!")
      return []
    }
  }
  return result.reverse()
}
