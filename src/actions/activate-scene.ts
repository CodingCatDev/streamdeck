import { action, type KeyDownEvent } from "@elgato/streamdeck";
import { lifxClient } from "../lifx/client";
import type { LifxActivateScenePayload } from "../lifx/types";
import { BaseLifxAction } from "./base-lifx-action";

export type ActivateSceneSettings = {
	sceneUuid?: string;
	duration?: number | string;
	ignorePower?: boolean;
	ignoreBrightness?: boolean;
	ignoreColor?: boolean;
	fast?: boolean;
};

/**
 * Activates a saved LIFX Cloud scene (`PUT /v1/scenes/scene_id::scene_uuid/activate`).
 */
@action({ UUID: "dev.codingcat.streamdeck-lifx.activate-scene" })
export class ActivateSceneAction extends BaseLifxAction<ActivateSceneSettings> {
	override async onKeyDown(ev: KeyDownEvent<ActivateSceneSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		if (!settings.sceneUuid) {
			await ev.action.showAlert();
			return;
		}

		const payload: LifxActivateScenePayload = {};
		if (settings.duration !== undefined && settings.duration !== "") {
			const dur = Number(settings.duration);
			if (!Number.isNaN(dur) && dur >= 0) {
				payload.duration = dur;
			}
		}

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

		if (settings.fast) {
			payload.fast = true;
		}

		try {
			await lifxClient.activateScene(settings.sceneUuid, payload);
			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "ActivateSceneAction", error);
		}
	}
}
