import {
	action,
	type DialDownEvent,
	type DialRotateEvent,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type TouchTapEvent,
	type WillAppearEvent,
} from "@elgato/streamdeck";
import { lifxClient } from "../lifx/client";
import type { LifxStateDeltaPayload } from "../lifx/types";
import { BaseLifxAction } from "./base-lifx-action";

export type DeltaProperty = "brightness" | "kelvin" | "hue" | "saturation" | "infrared";

export type StateDeltaSettings = {
	selector?: string;
	property?: DeltaProperty;
	step?: number | string;
	duration?: number | string;
	fast?: boolean;
};

/**
 * Adjusts LIFX light properties relatively (`POST /v1/lights/:selector/state/delta`).
 * Supports both Keypad buttons (step up/down on press) and Stream Deck+ Rotary Dials (rotate to adjust, press/tap to toggle).
 */
@action({ UUID: "dev.codingcat.streamdeck-lifx.state-delta" })
export class StateDeltaAction extends BaseLifxAction<StateDeltaSettings> {
	override async onWillAppear(ev: WillAppearEvent<StateDeltaSettings>): Promise<void> {
		await this.updateDialFeedback(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<StateDeltaSettings>,
	): Promise<void> {
		await this.updateDialFeedback(ev.action, ev.payload.settings);
	}

	/**
	 * Keypad press: applies `step` delta to the configured property.
	 */
	override async onKeyDown(ev: KeyDownEvent<StateDeltaSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const property = settings.property || "brightness";
		const step = Number(settings.step ?? 10);

		const payload = this.buildDeltaPayload(property, step, settings);

		try {
			await lifxClient.stateDelta(selector, payload);
			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "StateDeltaAction.onKeyDown", error);
		}
	}

	/**
	 * Stream Deck+ Dial rotation: multiplies `ticks * Math.abs(step)` for intuitive clockwise/counter-clockwise control.
	 */
	override async onDialRotate(ev: DialRotateEvent<StateDeltaSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const property = settings.property || "brightness";
		const baseStep = Math.abs(Number(settings.step ?? 10)) || 10;
		const deltaAmount = ev.payload.ticks * baseStep;

		const payload = this.buildDeltaPayload(property, deltaAmount, {
			...settings,
			fast: true,
		});

		try {
			await lifxClient.stateDelta(selector, payload);
			await this.updateDialFeedback(ev.action, settings, `${deltaAmount > 0 ? "+" : ""}${deltaAmount}`);
		} catch (error) {
			await this.handleError(ev.action, "StateDeltaAction.onDialRotate", error);
		}
	}

	/**
	 * Stream Deck+ Dial press: toggles power on the target selector.
	 */
	override async onDialDown(ev: DialDownEvent<StateDeltaSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const selector = ev.payload.settings.selector || "all";
		try {
			await lifxClient.togglePower(selector, 0.5);
		} catch (error) {
			await this.handleError(ev.action, "StateDeltaAction.onDialDown", error);
		}
	}

	/**
	 * Stream Deck+ Touch Strip tap: toggles power on the target selector.
	 */
	override async onTouchTap(ev: TouchTapEvent<StateDeltaSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const selector = ev.payload.settings.selector || "all";
		try {
			await lifxClient.togglePower(selector, 0.5);
		} catch (error) {
			await this.handleError(ev.action, "StateDeltaAction.onTouchTap", error);
		}
	}

	private buildDeltaPayload(
		property: DeltaProperty,
		rawStep: number,
		settings: StateDeltaSettings,
	): LifxStateDeltaPayload {
		const payload: LifxStateDeltaPayload = {};

		if (settings.duration !== undefined && settings.duration !== "") {
			const dur = Number(settings.duration);
			if (!Number.isNaN(dur) && dur >= 0) {
				payload.duration = dur;
			}
		}

		if (settings.fast) {
			payload.fast = true;
		}

		switch (property) {
			case "brightness":
				payload.brightness = Math.max(-1, Math.min(1, rawStep / 100));
				break;
			case "saturation":
				payload.saturation = Math.max(-1, Math.min(1, rawStep / 100));
				break;
			case "infrared":
				payload.infrared = Math.max(-1, Math.min(1, rawStep / 100));
				break;
			case "kelvin":
				payload.kelvin = rawStep;
				break;
			case "hue":
				payload.hue = Math.max(-360, Math.min(360, rawStep));
				break;
		}

		return payload;
	}

	private async updateDialFeedback(
		actionInstance: WillAppearEvent<StateDeltaSettings>["action"],
		settings: StateDeltaSettings,
		lastDeltaLabel?: string,
	): Promise<void> {
		if (!actionInstance.isDial()) {
			return;
		}

		const property = settings.property || "brightness";
		const step = Number(settings.step ?? 10);
		const unit = property === "kelvin" ? "K" : property === "hue" ? "°" : "%";

		await actionInstance.setTriggerDescription({
			rotate: `Adjust ${property} (${Math.abs(step)}${unit}/tick)`,
			push: "Toggle Power",
			touch: "Toggle Power",
		});

		await actionInstance.setFeedback({
			title: property.charAt(0).toUpperCase() + property.slice(1),
			value: lastDeltaLabel ? `${lastDeltaLabel}${unit}` : `±${Math.abs(step)}${unit}`,
		});
	}
}
