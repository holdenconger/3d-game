export type BuildMode = "pc" | "laptop";

export interface PartDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  mode: BuildMode;
  optional?: boolean;
  powerDraw: number;
  cost: number;
}
