import { MONEY_PER_WASTE, PLANET_VALUE_PER_EMPTY, PLANET_VALUE_PER_POPULATION, PLANET_VALUE_PER_WASTE, POPULATION_GROWTH_RATE, WASTE_PER_POP } from "./constants";
import { Action, Planet, Position, Ship, State } from "./types";

export function updatePlanet(
  state: State,
  planet: Planet,
  delta: number,
): void {
  // grow populated planets if room
  if (planet.population > 0 && (planet.population + planet.waste) < planet.capacity) {
    planet.growingPop += POPULATION_GROWTH_RATE * delta;
    planet.population = Math.min(
      planet.capacity,
      planet.population + Math.floor(planet.growingPop),
    );
    planet.growingPop -= Math.floor(planet.growingPop);
  }
  // produce waste
  if (planet.population > 0 && planet.waste < planet.capacity) {
    planet.growingWaste += planet.population * WASTE_PER_POP * delta;
    planet.waste = Math.min(
      planet.capacity,
      planet.waste + Math.floor(planet.growingWaste),
    );
    planet.growingWaste -= Math.floor(planet.growingWaste);
  }
  // waste pushes out population if needed
  displacePopulationIfNeeded(planet);
}

export function displacePopulationIfNeeded(planet: Planet): void {
  if ((planet.population + planet.waste) > planet.capacity) {
    planet.population = planet.capacity - planet.waste;
  }
}

export function calculatePlanetValue(planet: Planet): number {
  return (
    planet.population * PLANET_VALUE_PER_POPULATION +
    planet.waste * PLANET_VALUE_PER_WASTE +
    (planet.capacity - planet.population - planet.waste) *
      PLANET_VALUE_PER_EMPTY
  );
}

export function updateShip(state: State, ship: Ship, delta: number): void {
  // upkeep
  state.money = Math.max(0, state.money - ship.type.upkeepCost * delta);

  if (ship.assignedRoute) {
    const route = state.routes[ship.assignedRoute];
    if (!ship.destinationNodeIndex || !route.nodes[ship.destinationNodeIndex]) {
      ship.destinationNodeIndex = 0;
    }
    const node = route.nodes[ship.destinationNodeIndex];
    const planet = state.planets[node.planet];

    // update direction
    const planetDeltaX = planet.position.x - ship.position.x;
    const planetDeltaY = planet.position.y - ship.position.y;
    const direction = Math.atan2(planetDeltaY, planetDeltaX);
    ship.direction = direction;

    // update speed and position
    ship.currentSpeed = Math.min(
      ship.type.maxSpeed,
      ship.currentSpeed + ship.type.acceleration * delta,
    );

    if (
      calculateDistance(ship.position, planet.position) <
      ship.currentSpeed * delta
    ) {
      ship.position = { ...planet.position };
    } else {
      ship.position.x += Math.cos(ship.direction) * ship.currentSpeed;
      ship.position.y += Math.sin(ship.direction) * ship.currentSpeed;
    }

    // check if at destination
    if (
      calculateDistance(ship.position, planet.position) <
      planet.radius
    ) {
      ship.currentSpeed = 0;
      executeShipAction(state, ship, node.action, planet);
      ship.destinationNodeIndex =
        (ship.destinationNodeIndex + 1) % route.nodes.length;
    }
  } else {
    // no route, do nothing
    ship.currentSpeed = 0;
  }
}

export function executeShipAction(
  state: State,
  ship: Ship,
  action: Action,
  planet: Planet,
): void {
  switch (action) {
    case "LOAD_WASTE": {
      const remainingShipCapacity = ship.type.capacity - ship.waste;
      if (remainingShipCapacity > 0) {
        const toLoad = Math.min(planet.waste, remainingShipCapacity);
        state.money += toLoad * MONEY_PER_WASTE;
        ship.waste += toLoad;
        planet.waste -= toLoad;
      }
      break;
    }
    case "DUMP_WASTE": {
      const remainingPlanetCapacity = planet.capacity - planet.waste;
      if (remainingPlanetCapacity > 0) {
        const toDump = Math.min(ship.waste, remainingPlanetCapacity);
        ship.waste -= toDump;
        planet.waste += toDump;
        displacePopulationIfNeeded(planet);
      }
      break;
    }
    default: {
      console.error(
        `Bad action ${action} for ship ${ship.id} at planet ${planet.id}`,
      );
    }
  }
}

export function calculateDistance(p1: Position, p2: Position): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function convertRadiansToDegrees(value: number): number {
  return (value / 2 / Math.PI) * 360;
}
