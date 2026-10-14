import { action, type KeyDownEvent } from "@elgato/streamdeck";
import { lifxClient } from "../client";
import { BaseLifxAction } from "./base-lifx-action";

export type CleanLightSettings = {
	selector?: string;
	cleanMode?: "start" | "stop";
	duration?: number | string;
};

/**
 * Starts or stops a High-Energy Visible (HEV) antibacterial cleaning cycle on LIFX Clean bulbs (`POST /v1/lights/:selector/clean`).
 */
@action({ UUID: "dev.codingcat.streamdeck.lifx-clean" })
export class CleanLightAction extends BaseLifxAction<CleanLightSettings> {
	override async onKeyDown(ev: KeyDownEvent<CleanLightSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const stop = settings.cleanMode === "stop";
		const duration = settings.duration !== undefined ? Number(settings.duration) : 3600;

		try {
			await lifxClient.clean(selector, {
				stop,
				duration: !stop && !Number.isNaN(duration) && duration >= 0 ? duration : undefined,
			});
			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "CleanLightAction", error);
		}
	}
}
