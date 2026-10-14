import { action, type KeyDownEvent } from "@elgato/streamdeck";
import { lifxClient } from "../client";
import type { LifxStatePayload } from "../types";
import { BaseLifxAction } from "./base-lifx-action";

export type SetStateSettings = {
	selector?: string;
	power?: "on" | "off" | "unchanged";
	colorMode?: "hex" | "kelvin" | "custom" | "none";
	colorHex?: string;
	kelvin?: number | string;
	customColor?: string;
	brightness?: number | string;
	enableBrightness?: boolean;
	infrared?: number | string;
	enableInfrared?: boolean;
	duration?: number | string;
	fast?: boolean;
};

/**
 * Sets comprehensive LIFX light state (`PUT /v1/lights/:selector/state`):
 * power, color (hex picker, Kelvin temperature, or LIFX color string), brightness, infrared, duration, and fast mode.
 */
@action({ UUID: "dev.codingcat.streamdeck.lifx-set-state" })
export class SetStateAction extends BaseLifxAction<SetStateSettings> {
	override async onKeyDown(ev: KeyDownEvent<SetStateSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const payload: LifxStatePayload = {};

		const power = settings.power ?? "on";
		if (power === "on" || power === "off") {
			payload.power = power;
		}

		const colorMode = settings.colorMode ?? "hex";
		if (colorMode === "hex" && settings.colorHex) {
			payload.color = settings.colorHex;
		} else if (colorMode === "kelvin" && settings.kelvin !== undefined) {
			payload.color = `kelvin:${Number(settings.kelvin) || 3500} saturation:0`;
		} else if (colorMode === "custom" && settings.customColor) {
			payload.color = settings.customColor.trim();
		}

		if (settings.enableBrightness !== false && settings.brightness !== undefined) {
			const pct = Number(settings.brightness);
			if (!Number.isNaN(pct)) {
				payload.brightness = Math.max(0, Math.min(1, pct / 100));
			}
		}

		if (settings.enableInfrared && settings.infrared !== undefined) {
			const irPct = Number(settings.infrared);
			if (!Number.isNaN(irPct)) {
				payload.infrared = Math.max(0, Math.min(1, irPct / 100));
			}
		}

		if (settings.duration !== undefined && settings.duration !== "") {
			const dur = Number(settings.duration);
			if (!Number.isNaN(dur) && dur >= 0) {
				payload.duration = dur;
			}
		}

		if (settings.fast) {
			payload.fast = true;
		}

		try {
			await lifxClient.setState(selector, payload);
			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "SetStateAction", error);
		}
	}
}
