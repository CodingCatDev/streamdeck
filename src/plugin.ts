import streamDeck from "@elgato/streamdeck";

import { ActivateSceneAction } from "./plugins/lifx/actions/activate-scene";
import { CleanLightAction } from "./plugins/lifx/actions/clean-light";
import { CycleStatesAction } from "./plugins/lifx/actions/cycle-states";
import { LightEffectsAction } from "./plugins/lifx/actions/light-effects";
import { SetStateAction } from "./plugins/lifx/actions/set-state";
import { StateDeltaAction } from "./plugins/lifx/actions/state-delta";
import { TogglePowerAction } from "./plugins/lifx/actions/toggle-power";
import { lifxClient } from "./plugins/lifx/client";
import type { LifxGlobalSettings } from "./plugins/lifx/types";

streamDeck.logger.setLevel("info");

// Keep the LIFX HTTP API token synchronized whenever Global Settings change in any Property Inspector.
streamDeck.settings.onDidReceiveGlobalSettings<LifxGlobalSettings>((ev) => {
	lifxClient.setToken(ev.settings.apiToken);
});

// Register all LIFX actions.
streamDeck.actions.registerAction(new TogglePowerAction());
streamDeck.actions.registerAction(new SetStateAction());
streamDeck.actions.registerAction(new StateDeltaAction());
streamDeck.actions.registerAction(new ActivateSceneAction());
streamDeck.actions.registerAction(new LightEffectsAction());
streamDeck.actions.registerAction(new CycleStatesAction());
streamDeck.actions.registerAction(new CleanLightAction());

// Connect to the Stream Deck and load the saved global token on startup.
streamDeck.connect().then(async () => {
	const globalSettings = await streamDeck.settings.getGlobalSettings<LifxGlobalSettings>();
	lifxClient.setToken(globalSettings.apiToken);
});
