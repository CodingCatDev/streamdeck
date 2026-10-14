import {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type WillAppearEvent,
} from "@elgato/streamdeck";
import { lifxClient } from "../client";
import { BaseLifxAction } from "./base-lifx-action";

export type TogglePowerSettings = {
	selector?: string;
	powerMode?: "toggle" | "on" | "off";
	duration?: number | string;
};

/**
 * Toggles power or explicitly turns LIFX lights On / Off (`POST /v1/lights/:selector/toggle` or `PUT /v1/lights/:selector/state`).
 */
@action({ UUID: "dev.codingcat.streamdeck.lifx-toggle" })
export class TogglePowerAction extends BaseLifxAction<TogglePowerSettings> {
	override async onWillAppear(ev: WillAppearEvent<TogglePowerSettings>): Promise<void> {
		await this.updateButtonState(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<TogglePowerSettings>,
	): Promise<void> {
		await this.updateButtonState(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<TogglePowerSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const powerMode = settings.powerMode || "toggle";
		const duration = settings.duration !== undefined ? Number(settings.duration) : 1;

		try {
			if (powerMode === "toggle") {
				await lifxClient.togglePower(selector, duration);
			} else {
				await lifxClient.setState(selector, {
					power: powerMode,
					duration,
				});
			}

			await this.showSuccess(ev.action);
			await this.updateButtonState(ev.action, settings);
		} catch (error) {
			await this.handleError(ev.action, "TogglePowerAction", error);
		}
	}

	private async updateButtonState(
		actionInstance: WillAppearEvent<TogglePowerSettings>["action"],
		settings: TogglePowerSettings,
	): Promise<void> {
		if (!actionInstance.isKey()) {
			return;
		}

		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			return;
		}

		const selector = settings.selector || "all";
		try {
			const lights = await lifxClient.listLights(selector);
			const anyOn = lights.some((l) => l.connected && l.power === "on");
			await actionInstance.setState(anyOn ? 1 : 0);
		} catch {
			// Ignore background state poll failure so we don't spam alerts on appear
		}
	}
}
