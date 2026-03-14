import { getBeamApi, preferences } from "./api";
import { environment } from "./api/environment";

export type Global = typeof globalThis & {
  beam: {
    api: ReturnType<typeof getBeamApi>;
    environ: typeof environment;
    preferences: Record<string, unknown>;
  };
};

const globalBeam = globalThis as Global;

if (!globalBeam.beam) {
  globalBeam.beam = {
    api: {} as ReturnType<typeof getBeamApi>,
    environ: environment,
    preferences: {},
  };
}

export const loadBeamGlobals = (): void => {
  globalBeam.beam.api = getBeamApi();
  globalBeam.beam.environ = environment;
  globalBeam.beam.preferences = preferences;
};
