import Hex, { distance, hash, neighbors, equals } from "./hex"
import { Tile } from "./objects"
import { Hashtable } from "./util"

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

export function astar(tiles: Hashtable<Tile>, start: Hex, goal: Hex) {
  let heuristic = function (a: Hex, b: Hex) {
    return distance(a, b)
  }

  let frontier = new PriorityQueue()
  frontier.enqueue(start, 0)

  let came_from = {}
  let cost_so_far = {}
  came_from[hash(start)] = null
  cost_so_far[hash(start)] = 0

  while (!frontier.isEmpty()) {
    let current: Hex = frontier.dequeue()

    // if(current.equals(goal)) {
    //   break;
    // }

    for (let next of neighbors(current)) {
      if (tiles[hash(next)]) {
        let new_cost = 1
        // cost_so_far[hash(current)] + 1 / tiles[hash(current)].movementFactor //TODO calculate correct movementcost
        if (cost_so_far[hash(next)] === undefined || new_cost < cost_so_far[hash(next)]) {
          cost_so_far[hash(next)] = new_cost
          let priority = new_cost + heuristic(goal, next)
          frontier.enqueue(next, priority)
          came_from[hash(next)] = current
        }
      }
    }
  }

  let result: Hex[] = []
  let x: Hex = goal
  while (!equals(x, start)) {
    result.push(x)
    x = came_from[hash(x)]
    if (result.length > 999) {
      return []
    }
  }
  return result.reverse()
}
