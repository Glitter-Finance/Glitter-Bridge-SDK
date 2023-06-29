import { LoadSolanaSchema } from "./lib";

export * from "./GlitterBridgeSDK"
export * from "./config"
export * from "./types"
export * from "./lib"

//Needed to use the static schema downstream
LoadSolanaSchema();
