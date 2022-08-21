import { nanoid } from "nanoid";
import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import backgrounds from "./assets/images/spaceshooter/Backgrounds/*.png";
import shipTypes from "./data/shipTypes";
import { convertRadiansToDegrees, updatePlanet, updateShip } from "./lib";
import { EntityType, Position, ShipType, State } from "./types";
import SmoothedKeyControl = Phaser.Cameras.Controls.SmoothedKeyControl;
import FixedKeyControl = Phaser.Cameras.Controls.FixedKeyControl;
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import SmoothedKeyControlConfig = Phaser.Types.Cameras.Controls.SmoothedKeyControlConfig;
import FixedKeyControlConfig = Phaser.Types.Cameras.Controls.FixedKeyControlConfig;
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private screenCenter: Position;
  private state: State;
  private sprites: Record<
    string,
    Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  >;
  private orbits: Record<string, Phaser.GameObjects.Graphics>;
  private cameraMaxSpeed: number;
  private cameraZoomSpeed: number;
  private cameraMinZoom: number;
  private cameraMaxZoom: number;

  private shipScaleFactor: number;
  private selected: [EntityType, string] | null;
  private paused: boolean;

  // @ts-ignore
  private controls: FixedKeyControl;

  constructor() {
    super("game");
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.state = {
      money: 0,
      planets: {},
      ships: {},
      routes: {},
    };
    this.sprites = {};
    this.orbits = {};
    this.shipScaleFactor = 0.3;

    this.cameraMaxSpeed = 1.5;
    this.cameraZoomSpeed = 0.025;
    this.cameraMinZoom = 0.25;
    this.cameraMaxZoom = 8;
    this.selected = null;
    this.paused = false;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeworld", planets.planet00);
    this.load.image("toxicWorld", planets.planet01);
    this.load.image("moltenWorld", planets.planet02);
    this.load.image("crystalWorld", planets.planet04);
    this.load.image("moon", planets.planet05);
    this.load.image("pinkWorld", planets.planet06);
    this.load.image("oceanWorld", planets.planet07);
    this.load.image("sun", planets.planet08);
    this.load.image("purpleWorld", planets.planet09);
    this.load.image("background", backgrounds.purple);
    this.load.image("shuttle", ships.spaceShips_003);
    this.load.image("freighter", ships.spaceShips_005);
    this.load.plugin(
      "rexglowfilter2pipelineplugin",
      "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexglowfilter2pipelineplugin.min.js",
      true,
    );
  }

  create() {
    //  add to top-level game object
    const { x, y } = this.screenCenter;
    try {
      // this.add.tileSprite(0, 0, 16_000, 16_000, "background");
    } catch {}

    this.generateMap();

    this.state.money = 100;

    // camera
    this.cameras.main.setBounds(0, 0, 8000, 8000);
    this.cameras.main.centerOn(4000, 4000);
    this.cameras.main.setZoom(0.5, 0.5);

    // Input
    const controlConfig: FixedKeyControlConfig = {
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
      speed: this.cameraMaxSpeed,
    };

    this.controls = new FixedKeyControl(controlConfig);

    this.input.on(
      "gameobjectup",
      (
        pointer: never,
        object: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
      ) => {
        const [type, id] = object.getData(["type", "id"]) as [
          EntityType,
          string,
        ];
        this.toggleSelected(type, id);
      },
    );

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        this.paused = !this.paused;
      }
    });

    window.addEventListener("keyup", () => {
      const speed = this.cameraMaxSpeed / this.cameras.main.zoom;
      this.controls.speedX = speed;
      this.controls.speedY = speed;
    });
  }

  update(time: number, delta: number): void {
    this.controls.update(delta);

    if (!this.paused) {
      const deltaSeconds = delta / 1000;
      Object.values(this.state.planets).forEach((planet) => {
        updatePlanet(this.state, planet, deltaSeconds);
        const sprite = this.sprites[planet.id];
        const dx = planet.position.x - sprite.x;
        const dy = planet.position.y - sprite.y;
        sprite.setPosition(planet.position.x, planet.position.y);
        Object.values(this.state.planets)
          .filter((moon) => moon.orbitCenter === planet.position)
          .forEach((moon) => {
            const orbit = this.orbits[moon.id];
            orbit.x += dx;
            orbit.y += dy;
          });
      });
      Object.values(this.state.ships).forEach((ship) => {
        updateShip(this.state, ship, deltaSeconds);
        const sprite = this.sprites[ship.id];
        sprite.setAngle(convertRadiansToDegrees(ship.direction) - 90);
        sprite.setPosition(ship.position.x, ship.position.y);
      });
    }
  }

  deselect() {
    if (!this.selected) return;
    const [type, id] = this.selected;
    const sprite = this.sprites[id];
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).remove(sprite);
    this.selected = null;
  }

  select(type: EntityType, id: string) {
    if (this.selected) {
      this.deselect();
    }
    const sprite = this.sprites[id];
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).add(sprite, {
      outerStrength: 20,
      innerStrength: 0,
      glowColor: 0x80c0ff,
      knockout: false,
      distance: 5,
      quality: 1,
    });
    this.selected = [type, id];
  }

  toggleSelected(type: EntityType, id: string) {
    if (this.selected && this.selected[0] === type && this.selected[1] === id) {
      this.deselect();
    } else {
      this.select(type, id);
    }
  }

  createPlanet({
    texture,
    radius,
    orbitCenter,
    orbitRadius,
    population = 0,
    waste = 0,
  }: {
    texture: string;
    radius: number;
    orbitCenter: Position;
    orbitRadius: number;
    population?: number;
    waste?: number;
  }): string {
    const id = nanoid();
    const capacity = radius * 100;
    const scale = (radius * 2) / 1000;
    const startingAngle = Math.random() * 2 * Math.PI;
    const position = {
      x: orbitCenter.x + Math.cos(startingAngle) * orbitRadius,
      y: orbitCenter.y + Math.sin(startingAngle) * orbitRadius,
    };
    this.orbits[id] = this.drawOrbit(orbitCenter, orbitRadius);
    const sprite = this.physics.add.sprite(position.x, position.y, texture);
    this.sprites[id] = sprite;
    sprite.setScale(scale);
    sprite.setInteractive(
      new Phaser.Geom.Circle(
        sprite.width / 2,
        sprite.height / 2,
        sprite.width / 2,
      ),
      Phaser.Geom.Circle.Contains,
    );
    sprite.setDataEnabled();
    sprite.setData({ type: "planet", id });
    this.state.planets[id] = {
      id,
      position,
      capacity,
      radius,
      population,
      waste,
      growingPop: 0,
      growingWaste: 0,
      orbitCenter,
      orbitRadius,
      orbitSpeed: 5000 / orbitRadius ** 2,
      orbitAngle: startingAngle,
    };
    return id;
  }

  private configureControls() {}

  createShip({ type, position }: { type: ShipType; position: Position }) {
    const id = nanoid();
    this.state.ships[id] = {
      id,
      type,
      position,
      direction: 0,
      currentSpeed: 0,
      waste: 0,
      assignedRoute: null,
      destinationNodeIndex: 0,
    };
    const sprite = this.physics.add.sprite(
      position.x,
      position.y,
      type === shipTypes.freighter ? "freighter" : "shuttle",
    );
    sprite.setScale(
      this.shipScaleFactor * (type === shipTypes.freighter ? 1.5 : 1),
    );
    sprite.setInteractive(
      new Phaser.Geom.Circle(sprite.width / 2, sprite.height / 2, sprite.width),
      Phaser.Geom.Circle.Contains,
    );
    sprite.setDataEnabled();
    sprite.setData({ type: "ship", id });
    this.sprites[id] = sprite;
    return id;
  }

  generateMap() {
    const sunPosition = { x: 4000, y: 4000 };
    const sun = this.physics.add.sprite(sunPosition.x, sunPosition.y, "sun");
    sun.setScale(0.25);
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).add(sun, {
      outerStrength: 5,
      innerStrength: 2,
      glowColor: 0xff8753,
      knockout: false,
      distance: 5,
      quality: 0.1,
    });

    this.createPlanet({
      texture: "moltenWorld",
      radius: 30,
      orbitCenter: sunPosition,
      orbitRadius: 220,
    });

    this.createPlanet({
      texture: "toxicWorld",
      radius: 40,
      orbitCenter: sunPosition,
      orbitRadius: 400,
    });

    const homeworldId = this.createPlanet({
      texture: "homeworld",
      radius: 50,
      orbitCenter: sunPosition,
      orbitRadius: 600,
    });

    this.createPlanet({
      texture: "moon",
      radius: 20,
      orbitCenter: this.state.planets[homeworldId].position,
      orbitRadius: 150,
    });

    const giantWorldId = this.createPlanet({
      texture: "purpleWorld",
      radius: 75,
      orbitCenter: sunPosition,
      orbitRadius: 1100,
    });

    this.createPlanet({
      texture: "crystalWorld",
      radius: 15,
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 150,
    });

    this.createPlanet({
      texture: "oceanWorld",
      radius: 25,
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 200,
    });

    this.createPlanet({
      texture: "pinkWorld",
      radius: 10,
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 250,
    });

    const routeId = nanoid();
    this.state.routes = {
      [routeId]: {
        id: routeId,
        nodes: [
          { planet: homeworldId, action: "LOAD_WASTE" },
          { planet: giantWorldId, action: "DUMP_WASTE" },
        ],
      },
    };

    const freighter = this.createShip({
      position: this.state.planets[homeworldId].position,
      type: shipTypes.freighter,
    });
    this.state.ships[freighter].assignedRoute = routeId;

    const shuttle = this.createShip({
      position: this.state.planets[homeworldId].position,
      type: shipTypes.shuttle,
    });
    this.state.ships[shuttle].assignedRoute = routeId;
  }

  drawOrbit(position: Position, radius: number) {
    const graphics = this.add.graphics();

    var color = 0xffffff;
    var thickness = 2;
    var alpha = 0.1;

    graphics.lineStyle(thickness, color, alpha);
    graphics.strokeCircle(position.x, position.y, radius);
    return graphics;
  }
}

const config: GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#1a1a1a",
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
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
