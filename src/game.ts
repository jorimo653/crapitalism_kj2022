import { nanoid } from "nanoid";
import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import backgrounds from "./assets/images/spaceshooter/Backgrounds/*.png";
import { convertRadiansToDegrees, updatePlanet, updateShip } from "./lib";
import { Position, State } from "./types";
import SmoothedKeyControl = Phaser.Cameras.Controls.SmoothedKeyControl;
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import SmoothedKeyControlConfig = Phaser.Types.Cameras.Controls.SmoothedKeyControlConfig;
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private screenCenter: Position;
  private state: State;
  private sprites: Record<
    string,
    Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  >;
  private cameraMaxSpeed: number;
  private cameraAcceleration: number;
  private cameraDrag: number;
  private cameraZoomSpeed: number;
  private cameraMinZoom: number;
  private cameraMaxZoom: number;

  // @ts-ignore
  private homeWorld: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private planetScaleFactor: number;

  // @ts-ignore
  private ship: SpriteWithDynamicBody;
  private shipScaleFactor: number;

  // @ts-ignore
  private controls: SmoothedKeyControl;

  constructor() {
    super("game");
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.shipScaleFactor = 0.25;

    this.state = {
      money: 0,
      planets: {},
      ships: {},
      routes: {},
    };
    this.sprites = {};
    this.planetScaleFactor = 0.1;
    this.shipScaleFactor = 0.5;

    this.cameraMaxSpeed = 0.8;
    this.cameraAcceleration = 0.5;
    this.cameraDrag = 0.01;
    this.cameraZoomSpeed = 0.02;
    this.cameraMinZoom = 1;
    this.cameraMaxZoom = 8;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeworld", planets.planet00);
    this.load.image("moon", planets.planet05);
    this.load.image("background", backgrounds.purple);
    this.load.image("ship", ships.spaceShips_005);
  }

  create() {
    //  add to top-level game object
    const { x, y } = this.screenCenter;
    this.add.tileSprite(0, 0, 15_000, 10_000, "background");

    const homeworldId = this.createPlanet({
      texture: "homeworld",
      radius: 100,
      position: { x: 2000, y: 2000 },
      population: 100,
      waste: 10,
    });

    const moonId = this.createPlanet({
      texture: "moon",
      radius: 25,
      position: { x: 2200, y: 1500 },
    });

    this.state.routes.route1 = {
      id: "route1",
      nodes: [
        { planet: homeworldId, action: "LOAD_WASTE" },
        { planet: moonId, action: "DUMP_WASTE" },
      ],
    };

    this.state.ships.shuttle1 = {
      id: "shuttle1",
      type: {
        name: "Shuttle",
        capacity: 10,
        maxSpeed: 10,
        acceleration: 2,
        upkeepCost: 2,
        buildCost: 10,
      },
      position: {
        x: this.state.planets[homeworldId].position.x,
        y: this.state.planets[homeworldId].position.y,
      },
      direction: 0,
      currentSpeed: 0,
      waste: 0,
      assignedRoute: "route1",
      destinationNodeIndex: 0,
    };
    this.sprites.shuttle1 = this.physics.add.sprite(
      this.state.ships.shuttle1.position.x,
      this.state.ships.shuttle1.position.y,
      "ship",
    );
    this.sprites.shuttle1.setScale(this.shipScaleFactor);

    this.state.money = 100;

    const logState = () =>
      console.log(`
    Homeworld pop: ${this.state.planets[homeworldId].population}, waste: ${
        this.state.planets[homeworldId].waste
      }
    Moon pop: ${this.state.planets[moonId].population}, waste: ${
        this.state.planets[moonId].waste
      }
    Ship waste: ${this.state.ships.shuttle1.waste}
    Money: ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(this.state.money)}
    `);
    logState();
    setInterval(logState, 1000);

    // camera
    this.cameras.main.setBounds(0, 0, 8000, 4000);
    this.cameras.main.centerOn(
      this.state.ships.shuttle1.position.x,
      this.state.ships.shuttle1.position.y,
    );
    this.cameras.main.setZoom(1, 1);

    // Input
    const controlConfig: SmoothedKeyControlConfig = {
      camera: this.cameras.main,
      left: this.input.keyboard.addKey(KeyCodes.A),
      right: this.input.keyboard.addKey(KeyCodes.D),
      up: this.input.keyboard.addKey(KeyCodes.W),
      down: this.input.keyboard.addKey(KeyCodes.S),
      zoomIn: this.input.keyboard.addKey(KeyCodes.E),
      zoomOut: this.input.keyboard.addKey(KeyCodes.Q),
      zoomSpeed: this.cameraZoomSpeed,
      minZoom: this.cameraMinZoom,
      maxZoom: this.cameraMaxZoom,
      acceleration: this.cameraAcceleration,
      drag: this.cameraDrag,
      maxSpeed: this.cameraMaxSpeed,
    };

    this.controls = new SmoothedKeyControl(controlConfig);
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    Object.values(this.state.planets).forEach((planet) =>
      updatePlanet(this.state, planet, deltaSeconds),
    );
    Object.values(this.state.ships).forEach((ship) => {
      updateShip(this.state, ship, deltaSeconds);
      const sprite = this.sprites[ship.id];
      sprite.setAngle(convertRadiansToDegrees(ship.direction) + 90);
      sprite.setPosition(ship.position.x, ship.position.y);
    });
    this.controls.update(delta);
  }

  createPlanet({
    texture,
    radius,
    position,
    population = 0,
    waste = 0,
  }: {
    texture: string;
    radius: number;
    position: Position;
    population?: number;
    waste?: number;
  }): string {
    const id = nanoid();
    const capacity = radius * 100;
    const scale = (radius * 2) / 1000;
    this.sprites[id] = this.physics.add.sprite(position.x, position.y, texture);
    this.sprites[id].setScale(scale);
    this.state.planets[id] = {
      id,
      position,
      capacity,
      radius,
      population,
      waste,
      growingPop: 0,
      growingWaste: 0,
    };
    return id;
  }

  private configureControls() {}
}

const config: GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#125555",
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.FIT,
  },
  scene: Game,
  physics: {
    default: "arcade",
    arcade: {
      // gravity: 0
    },
  },
  input: {
    //
  },
  dom: {
    createContainer: true,
  },
};

const game = new Phaser.Game(config);
