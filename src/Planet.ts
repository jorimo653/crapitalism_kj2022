import "phaser";

export interface Position {
  x: number;
  y: number;
}
export type Frame = string | number;

export default class Planet extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: Frame,
  ) {
    super(scene, x, y, texture, frame);
  }
}
