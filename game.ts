import "phaser";

export default class Game extends Phaser.Scene {
  private width: number;
  private height: number;

  constructor() {
    super("demo");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  preload() {
    this.load.image("logo", "assets/phaser3-logo.png");
    this.load.image("libs", "assets/libs.png");
    this.load.glsl("bundle", "assets/plasma-bundle.glsl.js");
    this.load.glsl("stars", "assets/starfields.glsl.js");
  }

  create() {
    this.add
      .shader("RGB Shift Field", 0, 0, this.width, this.height)
      .setOrigin(0);

    this.add
      .shader("Plasma", this.width / 4, 412, this.width / 2, 172)
      .setOrigin(0);

    this.add.image(this.width / 2, this.height / 2, "libs");

    const logo = this.add.image(this.width / 2, 70, "logo");

    this.tweens.add({
      targets: logo,
      y: 350,
      duration: 1500,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#125555",
  width: window.innerWidth,
  height: window.innerHeight,
  scene: Game,
};

const game = new Phaser.Game(config);
