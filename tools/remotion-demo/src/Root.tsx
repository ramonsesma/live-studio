import React from "react";
import { Composition } from "remotion";
import { MixRadar } from "./MixRadar";

export const RemotionRoot: React.FC = () => (
  <Composition id="MixRadar" component={MixRadar} durationInFrames={210} fps={30} width={1280} height={720} />
);
