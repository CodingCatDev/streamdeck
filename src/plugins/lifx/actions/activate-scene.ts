import {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type WillAppearEvent,
} from "@elgato/streamdeck";
import { lifxClient } from "../client";
import type { LifxActivateScenePayload } from "../types";
import { BaseLifxAction } from "./base-lifx-action";

export type SceneMode = "toggle" | "activate" | "off";

export type ActivateSceneSettings = {
	sceneUuid?: string;
	sceneUuids?: string[];
	sceneMode?: SceneMode;
	isActive?: boolean;
	duration?: number | string;
	ignorePower?: boolean;
	ignoreBrightness?: boolean;
	ignoreColor?: boolean;
	fast?: boolean;
};

/**
 * Activates or toggles one or more saved LIFX Cloud scenes (`PUT /v1/scenes/scene_id::scene_uuid/activate`)
 * and can turn off all lights belonging to those scenes on the second press (`PUT /v1/lights/states`).
 */
@action({ UUID: "dev.codingcat.streamdeck.lifx-activate-scene" })
export class ActivateSceneAction extends BaseLifxAction<ActivateSceneSettings> {
	override async onWillAppear(ev: WillAppearEvent<ActivateSceneSettings>): Promise<void> {
		await this.syncVisualState(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<ActivateSceneSettings>,
	): Promise<void> {
		await this.syncVisualState(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<ActivateSceneSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selectedUuids = this.resolveSceneUuids(settings);
		if (selectedUuids.length === 0) {
			await ev.action.showAlert();
			return;
		}

		const mode: SceneMode = settings.sceneMode || "toggle";
		const duration =
			settings.duration !== undefined && settings.duration !== ""
				? Number(settings.duration)
				: 1;
		const validDuration = !Number.isNaN(duration) && duration >= 0 ? duration : 1;
		const fast = Boolean(settings.fast);

		// Determine whether this press should activate scenes (ON) or turn scene lights OFF
		const shouldTurnOff =
			mode === "off" || (mode === "toggle" && Boolean(settings.isActive));

		try {
			if (shouldTurnOff) {
				await this.turnOffScenesLights(selectedUuids, validDuration, fast);
				const nextSettings: ActivateSceneSettings = {
					...settings,
					isActive: false,
				};
				await ev.action.setSettings(nextSettings);
				await ev.action.setState(0);
			} else {
				const payload = this.buildActivatePayload(settings, validDuration, fast);
				await Promise.all(
					selectedUuids.map((uuid) => lifxClient.activateScene(uuid, payload)),
				);
				const nextSettings: ActivateSceneSettings = {
					...settings,
					isActive: true,
				};
				await ev.action.setSettings(nextSettings);
				await ev.action.setState(1);
			}

			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "ActivateSceneAction", error);
		}
	}

	/**
	 * Resolves the list of selected scene UUIDs (supporting both multi-select `sceneUuids` and legacy single `sceneUuid`).
	 */
	private resolveSceneUuids(settings: ActivateSceneSettings): string[] {
		if (Array.isArray(settings.sceneUuids) && settings.sceneUuids.length > 0) {
			return settings.sceneUuids.filter(Boolean);
		}
		if (typeof settings.sceneUuid === "string" && settings.sceneUuid.trim().length > 0) {
			return [settings.sceneUuid.trim()];
		}
		return [];
	}

	/**
	 * Builds the LIFX scene activation request payload.
	 */
	private buildActivatePayload(
		settings: ActivateSceneSettings,
		duration: number,
		fast: boolean,
	): LifxActivateScenePayload {
		const payload: LifxActivateScenePayload = {
			duration,
		};

		const ignore: string[] = [];
		if (settings.ignorePower) {
			ignore.push("power");
		}
		if (settings.ignoreBrightness) {
			ignore.push("brightness");
		}
		if (settings.ignoreColor) {
			ignore.push("hue", "saturation", "kelvin");
		}
		if (ignore.length > 0) {
			payload.ignore = ignore;
		}

		if (fast) {
			payload.fast = true;
		}

		return payload;
	}

	/**
	 * Finds all light selectors belonging to the selected scenes and powers them off.
	 */
	private async turnOffScenesLights(
		sceneUuids: string[],
		duration: number,
		fast: boolean,
	): Promise<void> {
		const allScenes = await lifxClient.listScenes();
		const uuidSet = new Set(sceneUuids.map((id) => id.replace(/^scene_id:/, "")));

		const selectors = new Set<string>();
		for (const scene of allScenes) {
			if (uuidSet.has(scene.uuid)) {
				for (const state of scene.states ?? []) {
					if (state.selector) {
						selectors.add(state.selector);
					}
				}
			}
		}

		if (selectors.size === 0) {
			await lifxClient.setState("all", { power: "off", duration, fast });
			return;
		}

		if (selectors.size === 1) {
			const [singleSelector] = Array.from(selectors);
			await lifxClient.setState(singleSelector, { power: "off", duration, fast });
			return;
		}

		await lifxClient.setStates({
			states: Array.from(selectors).map((selector) => ({
				selector,
				power: "off",
				duration,
			})),
			fast,
		});
	}

	/**
	 * Synchronizes the Stream Deck key icon state (0 = Off, 1 = On).
	 */
	private async syncVisualState(
		actionInstance: WillAppearEvent<ActivateSceneSettings>["action"],
		settings: ActivateSceneSettings,
	): Promise<void> {
		if (!actionInstance.isKey()) {
			return;
		}

		const mode: SceneMode = settings.sceneMode || "toggle";
		if (mode === "off") {
			await actionInstance.setState(0);
		} else if (mode === "activate") {
			await actionInstance.setState(1);
		} else {
			await actionInstance.setState(settings.isActive ? 1 : 0);
		}
	}
}
