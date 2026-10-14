export type JsonPrimitive = boolean | number | string | null | undefined;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
	[key: string]: JsonValue;
};

/**
 * Global plugin settings stored across all LIFX actions.
 */
export type LifxGlobalSettings = {
	apiToken?: string;
};

/**
 * LIFX HSBK color representation returned by the API.
 */
export interface LifxHsbkColor {
	hue: number;
	saturation: number;
	kelvin: number;
	brightness?: number;
}

/**
 * LIFX Group or Location reference.
 */
export interface LifxEntityRef {
	id: string;
	name: string;
}

/**
 * LIFX Product capabilities and metadata.
 */
export interface LifxProduct {
	name: string;
	identifier: string;
	company: string;
	vendor_id?: number;
	product_id?: number;
	capabilities: {
		has_color: boolean;
		has_variable_color_temp: boolean;
		has_ir: boolean;
		has_chain: boolean;
		has_matrix: boolean;
		has_multizone: boolean;
		has_hev?: boolean;
		min_kelvin: number;
		max_kelvin: number;
	};
}

/**
 * LIFX Light object returned by `GET /v1/lights/:selector`.
 */
export interface LifxLight {
	id: string;
	uuid: string;
	label: string;
	connected: boolean;
	power: "on" | "off";
	color: LifxHsbkColor;
	brightness: number;
	effect?: string;
	group: LifxEntityRef;
	location: LifxEntityRef;
	product: LifxProduct;
	last_seen: string;
	seconds_since_seen: number;
	infrared?: string | number;
	hev_cycle?: {
		duration: number;
		remaining: number;
		last_power: boolean;
	};
}

/**
 * LIFX Scene state item.
 */
export interface LifxSceneState {
	selector: string;
	power?: "on" | "off";
	brightness?: number;
	color?: LifxHsbkColor;
}

/**
 * LIFX Scene returned by `GET /v1/scenes`.
 */
export interface LifxScene {
	uuid: string;
	name: string;
	account: {
		uuid: string;
	};
	states: LifxSceneState[];
	created_at: number;
	updated_at: number;
}

/**
 * Individual operation result per light.
 */
export interface LifxOperationResult {
	id: string;
	label: string;
	status: "ok" | "timed_out" | "offline" | string;
}

/**
 * Standard LIFX mutation response (`results` array).
 */
export interface LifxResultsResponse {
	results: LifxOperationResult[];
}

/**
 * Payload for `PUT /v1/lights/:selector/state`.
 */
export interface LifxStatePayload {
	power?: "on" | "off";
	color?: string;
	brightness?: number;
	duration?: number;
	infrared?: number;
	fast?: boolean;
}

/**
 * Payload for `PUT /v1/lights/states`.
 */
export interface LifxStatesPayload {
	states: Array<LifxStatePayload & { selector: string }>;
	defaults?: LifxStatePayload;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/state/delta`.
 */
export interface LifxStateDeltaPayload {
	power?: "on" | "off";
	duration?: number;
	infrared?: number;
	hue?: number;
	saturation?: number;
	brightness?: number;
	kelvin?: number;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/cycle`.
 */
export interface LifxCyclePayload {
	states: LifxStatePayload[];
	defaults?: LifxStatePayload;
	direction?: "forward" | "backward";
}

/**
 * Payload for `PUT /v1/scenes/scene_id::scene_uuid/activate`.
 */
export interface LifxActivateScenePayload {
	duration?: number;
	ignore?: string[];
	overrides?: LifxStatePayload;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/breathe`.
 */
export interface LifxBreatheEffectPayload {
	color: string;
	from_color?: string;
	period?: number;
	cycles?: number;
	persist?: boolean;
	power_on?: boolean;
	peak?: number;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/pulse`.
 */
export interface LifxPulseEffectPayload {
	color: string;
	from_color?: string;
	period?: number;
	cycles?: number;
	persist?: boolean;
	power_on?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/move`.
 */
export interface LifxMoveEffectPayload {
	direction?: "forward" | "backward";
	period?: number;
	cycles?: number;
	power_on?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/morph`.
 */
export interface LifxMorphEffectPayload {
	period?: number;
	duration?: number;
	palette?: string[];
	power_on?: boolean;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/flame`.
 */
export interface LifxFlameEffectPayload {
	period?: number;
	duration?: number;
	power_on?: boolean;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/clouds`.
 */
export interface LifxCloudsEffectPayload {
	period?: number;
	duration?: number;
	min_saturation?: number;
	power_on?: boolean;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/sunrise` and `/sunset`.
 */
export interface LifxSunEffectPayload {
	duration?: number;
	persist?: boolean;
	power_on?: boolean;
	fast?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/effects/off`.
 */
export interface LifxEffectsOffPayload {
	power_off?: boolean;
}

/**
 * Payload for `POST /v1/lights/:selector/clean`.
 */
export interface LifxCleanPayload {
	stop?: boolean;
	duration?: number;
}

/**
 * Response from `GET /v1/color`.
 */
export interface LifxColorValidation {
	hue: number | null;
	saturation: number | null;
	brightness: number | null;
	kelvin: number | null;
}

/**
 * Data source item for `sdpi-components` `<sdpi-select>`.
 */
export type DataSourceItem = {
	label: string;
	value: string;
	disabled?: boolean;
};

/**
 * Data source option group for `sdpi-components` `<sdpi-select>`.
 */
export type DataSourceGroup = {
	label: string;
	children: DataSourceItem[];
};

export type DataSourceNode = DataSourceItem | DataSourceGroup;
