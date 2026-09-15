// Name: TurboWarp-Time-Space-Sync
// ID: kubohiroyatimespacesync
// Description: Optical time correspondence and camera placement calibration.
// By: Hiroya Kubo
// License: MPL-2.0

(function (Scratch) {
  'use strict';

  //#region src/config.ts
  var extensionConfig = {
  	id: "kubohiroyatimespacesync",
  	slug: "time-space-sync",
  	name: "TurboWarp-Time-Space-Sync",
  	description: "Optical time correspondence and camera placement calibration.",
  	author: "Hiroya Kubo",
  	license: "MPL-2.0",
  	unsandboxed: true,
  	docsURI: "https://kubohiroya.github.io/turbowarp-time-space-sync/",
  	blockIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHJlY3QgeD0iNCIgeT0iOCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiByeD0iMyIgZmlsbD0iIzRDOTdGRiIvPjxyZWN0IHg9IjI2IiB5PSI4IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIiBmaWxsPSIjNTlDMDU5Ii8+PHJlY3QgeD0iMTUiIHk9IjI2IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIiBmaWxsPSIjRkZBQjE5Ii8+PC9zdmc+"
  };
  //#endregion
  //#region config/feature-flags.ts
  var overrides = globalThis.__TWTSS_FEATURE_FLAGS__;
  var featureFlags = Object.freeze({
  	opticalTimeSyncV1: overrides?.opticalTimeSyncV1 === true,
  	placementSolveV1: overrides?.placementSolveV1 === true
  });
  var block_definitions_default = {
  	extensionName: "TurboWarp-Time-Space-Sync",
  	blocks: [
  		{
  			"opcode": "acknowledgePatternFlashing",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "acknowledge that the time pattern flashes",
  			"description": "Records that the operator was warned the full screen pattern flashes. The pattern will not be shown until this runs, and the acknowledgement lasts until the project stops.",
  			"arguments": {}
  		},
  		{
  			"opcode": "showTimePattern",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "show time pattern",
  			"description": "Covers the screen with the time coded pattern. The panel stays blank until the display refresh interval has been measured, so nothing decodable is shown from a guess.",
  			"arguments": {}
  		},
  		{
  			"opcode": "hideTimePattern",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "hide time pattern",
  			"description": "Removes the time pattern overlay. Escape also removes it, and so does the page ceasing to be shown.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timePatternShown",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "BOOLEAN",
  			"text": "time pattern shown?",
  			"description": "Reports whether the time pattern overlay is on screen.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timePatternStable",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "BOOLEAN",
  			"text": "time pattern stable?",
  			"description": "Reports whether the display refresh interval has been measured. While false the panel is blank and no camera can read a time from it.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timePatternRefreshUs",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time pattern refresh us",
  			"description": "Returns the measured display refresh interval in microseconds, or 0 before it has been measured.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timePatternWrapUs",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time pattern wrap us",
  			"description": "Returns the period after which the encoded display time repeats, in microseconds.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timePatternProfileId",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time pattern profile id",
  			"description": "Returns the identifier of the pattern profile in use. The decoder must be given the same profile or no reading will ever decode.",
  			"arguments": {}
  		},
  		{
  			"opcode": "startOpticalTimeDecoder",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "start optical time decoder for camera [CAMERA_ID] reference [REFERENCE_ID] calibrating [SECONDS] seconds at [REFRESH_US] us refresh",
  			"description": "Leases the camera, locates the pattern, learns each cell light and dark level, and refuses when readings do not decode often enough. The display refresh interval must be supplied because it sets how long each code stays on screen.",
  			"arguments": {
  				"CAMERA_ID": {
  					"type": "STRING",
  					"defaultValue": "default"
  				},
  				"REFERENCE_ID": {
  					"type": "STRING",
  					"defaultValue": "screen"
  				},
  				"SECONDS": {
  					"type": "NUMBER",
  					"defaultValue": 8
  				},
  				"REFRESH_US": {
  					"type": "NUMBER",
  					"defaultValue": 16667
  				}
  			}
  		},
  		{
  			"opcode": "calibrateOpticalTimeDecoder",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "calibrate optical time decoder for [SECONDS] seconds",
  			"description": "Runs calibration again on a running decoder, for example after the camera or the display moved.",
  			"arguments": { "SECONDS": {
  				"type": "NUMBER",
  				"defaultValue": 8
  			} }
  		},
  		{
  			"opcode": "stopOpticalTimeDecoder",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "stop optical time decoder",
  			"description": "Stops decoding and releases the camera lease.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeDecoderState",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time decoder state",
  			"description": "Returns idle, acquiring-camera, calibrating, ready, or error.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeDecoderError",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time decoder error",
  			"description": "Returns the last decoder error code, or an empty string when there is none.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeDecodeRate",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time decode rate",
  			"description": "Returns the share of recent camera frames the decoder could read, between 0 and 1. It is governed by the camera exposure: a reading only decodes when the whole exposure falls inside one displayed code.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeDecodeMargin",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time decode margin",
  			"description": "Returns how much room the weakest cell of the last reading had to spare, in luminance units. A panel drifting out of readability shows here as a falling margin before it starts failing.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeObservationAvailable",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "BOOLEAN",
  			"text": "optical time observation available?",
  			"description": "Reports whether a decoded observation is waiting to be taken.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeObservationCount",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time observation count",
  			"description": "Returns how many observations are currently held. Observations are kept for a fixed stretch of time rather than a fixed count, so the window does not change length with the decode rate.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeDroppedCount",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time dropped count",
  			"description": "Returns how many observations were discarded for leaving the retention window or exceeding the memory cap.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeRejectedCount",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time rejected count",
  			"description": "Returns how many readings decoded but could not follow the previous one in real time. A frozen panel and a reading that slipped past the check bits both land here.",
  			"arguments": {}
  		},
  		{
  			"opcode": "takeOpticalTimeObservation",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "take next optical time observation",
  			"description": "Removes the oldest observation from the queue and exposes it to the observation reporter.",
  			"arguments": {}
  		},
  		{
  			"opcode": "latestOpticalTimeObservationJson",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "latest optical time observation JSON",
  			"description": "Returns the taken observation as twtss/optical-time-observation version 1 JSON, or an empty string before one is taken.",
  			"arguments": {}
  		},
  		{
  			"opcode": "opticalTimeMinimumCalibrationSeconds",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "optical time minimum calibration seconds",
  			"description": "Returns the shortest calibration window in which every pattern cell is guaranteed to change state at least once.",
  			"arguments": {}
  		}
  	]
  };
  //#endregion
  //#region src/clock/local-clock.ts
  /**
  * This computer's own clock.
  *
  * It advances steadily and never jumps, which is what deadlines and durations
  * need, and it is exact within itself, which is why its domain carries zero
  * uncertainty. What it cannot do is say anything about another computer's
  * clock; that is a conversion, and it lives in `SessionClock`.
  */
  var LocalMonotonicClock = class {
  	constructor(options = {}) {
  		this.domainValue = Object.freeze({
  			id: options.id ?? `local:${sessionSuffix()}`,
  			kind: "local-monotonic",
  			epoch: 0,
  			uncertaintyUs: 0
  		});
  		this.read = options.now ?? defaultNowUs;
  	}
  	domain() {
  		return this.domainValue;
  	}
  	nowUs() {
  		return this.read();
  	}
  };
  /**
  * `performance.timeOrigin` is a constant and `performance.now()` is monotonic,
  * so their sum advances steadily even when the operating system's wall clock is
  * corrected underneath it. `Date.now` is the fallback for environments without
  * a performance timeline, and it does not have that property; it is used
  * because a clock that can step is still better than no clock, and the
  * difference shows up as a rejected measurement rather than a wrong one.
  */
  function defaultNowUs() {
  	if (typeof performance === "object" && typeof performance.now === "function") return Math.round((performance.timeOrigin + performance.now()) * 1e3);
  	return Date.now() * 1e3;
  }
  function sessionSuffix() {
  	const cryptoRef = globalThis.crypto;
  	if (cryptoRef !== void 0 && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID().replace(/-/g, "").slice(0, 16);
  	return Math.floor(Math.random() * 4294967295).toString(16).padStart(8, "0");
  }
  //#endregion
  //#region src/contracts/errors.ts
  /**
  * A refusal carrying one of the codes above.
  *
  * Every path that gives up produces one of these rather than a bare `Error`,
  * so a caller can branch on the reason without parsing a message, and so a
  * block reporter has something stable to publish.
  */
  var TimeSpaceSyncError = class extends Error {
  	constructor(code, message, options) {
  		super(message, options);
  		this.name = "TimeSpaceSyncError";
  		this.code = code;
  	}
  };
  /** The code of an error, or `invalid-payload` for anything not from this package. */
  function errorCodeOf(error) {
  	return error instanceof TimeSpaceSyncError ? error.code : "invalid-payload";
  }
  /**
  * A finite number. `Number.isFinite` is the point of this helper: a NaN or an
  * infinity that reaches a solver produces a result that looks like a number,
  * and the contracts must reject it before anything changes state.
  */
  function finite(bounds = {}) {
  	return {
  		kind: "number",
  		...bounds
  	};
  }
  /** A whole number of microseconds. Timestamps are integers by contract. */
  function integer(bounds = {}) {
  	return {
  		kind: "number",
  		integer: true,
  		...bounds
  	};
  }
  integer({ minimum: 0 });
  /** True when two domain readings may be compared without conversion. */
  function sameClockDomain(left, right) {
  	return left.id === right.id && left.epoch === right.epoch;
  }
  finite();
  //#endregion
  //#region src/contracts/optical-time-observation.ts
  var OPTICAL_TIME_OBSERVATION_SCHEMA = "twtss/optical-time-observation";
  finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ exclusiveMinimum: 0 }), finite({ exclusiveMinimum: 0 });
  finite({ exclusiveMinimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 });
  integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 1 }), finite({ minimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 0 });
  integer({ minimum: 0 }), integer({ minimum: 0 }), integer({ minimum: 0 }), finite({
  	minimum: 0,
  	maximum: 1
  }), finite({ minimum: 0 }), finite(), finite({ minimum: 0 }), finite(), finite();
  finite(), finite(), finite(), finite({ minimum: 0 });
  finite({ minimum: 0 }), finite({ minimum: 0 });
  finite({ minimum: 0 }), finite({ minimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 }), finite({ exclusiveMinimum: 0 });
  finite({ minimum: 0 }), finite({ minimum: 0 }), integer({ minimum: 4 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite();
  //#endregion
  //#region src/clock/session-clock.ts
  /**
  * The clock the rest of the extension stamps observations with.
  *
  * It is this computer's clock, plus whatever conversions to other computers
  * happen to be available. With no peers registered it still works, which is the
  * single-computer case: several cameras on one machine already share a clock
  * and need nothing negotiated.
  *
  * Deadlines are deliberately not served from here. `monotonic()` hands out the
  * local clock for that, because a converted timestamp moves whenever the offset
  * behind it is re-estimated, and a deadline that moves is not a deadline.
  */
  var SessionClock = class {
  	constructor(local) {
  		this.bridges = /* @__PURE__ */ new Map();
  		this.local = local;
  	}
  	monotonic() {
  		return this.local;
  	}
  	domain() {
  		return this.local.domain();
  	}
  	nowUs() {
  		return this.local.nowUs();
  	}
  	registerPeer(bridge) {
  		this.bridges.set(bridge.peer, bridge);
  	}
  	forgetPeer(peer) {
  		this.bridges.delete(peer);
  	}
  	peers() {
  		return [...this.bridges.keys()].sort();
  	}
  	/** Domains this clock can currently convert from, including its own. */
  	reachableDomains() {
  		const domains = [this.domain()];
  		for (const bridge of this.bridges.values()) {
  			const estimate = bridge.estimate();
  			if (estimate) domains.push(estimate.domain);
  		}
  		return domains;
  	}
  	convertFrom(source, timestampUs) {
  		if (!Number.isFinite(timestampUs)) return void 0;
  		if (sameClockDomain(source, this.domain())) return {
  			timestampUs,
  			uncertaintyUs: 0
  		};
  		const estimate = this.estimateFor(source);
  		if (!estimate) return void 0;
  		return {
  			timestampUs: timestampUs - estimate.offsetUs,
  			uncertaintyUs: estimate.uncertaintyUs
  		};
  	}
  	/** The reverse direction: a local instant expressed on another computer's clock. */
  	convertTo(target, timestampUs) {
  		if (!Number.isFinite(timestampUs)) return void 0;
  		if (sameClockDomain(target, this.domain())) return {
  			timestampUs,
  			uncertaintyUs: 0
  		};
  		const estimate = this.estimateFor(target);
  		if (!estimate) return void 0;
  		return {
  			timestampUs: timestampUs + estimate.offsetUs,
  			uncertaintyUs: estimate.uncertaintyUs
  		};
  	}
  	/**
  	* Finds the current relationship to a domain, and refuses when the epoch the
  	* caller holds is not the one in force.
  	*
  	* A stale epoch means the offset was re-estimated after that timestamp was
  	* taken. Converting it with today's offset would silently move it by the
  	* whole correction, and the result would look like an ordinary measurement.
  	*/
  	estimateFor(domain) {
  		for (const bridge of this.bridges.values()) {
  			const estimate = bridge.estimate();
  			if (!estimate || estimate.domain.id !== domain.id) continue;
  			if (estimate.domain.epoch !== domain.epoch) return void 0;
  			return estimate;
  		}
  	}
  };
  //#endregion
  //#region src/optical-time/pattern-profile.ts
  /** The profile the extraction source published, reproduced exactly. */
  var PATTERN_PROFILE_V1 = Object.freeze({
  	id: "twtss.pattern.v1",
  	columns: 4,
  	rows: 4,
  	dataBits: 12,
  	checkBits: 4,
  	stepUs: 1e3,
  	encoding: "absolute"
  });
  function cellCount(profile) {
  	return profile.columns * profile.rows;
  }
  function codeCount(profile) {
  	return 2 ** profile.dataBits;
  }
  /**
  * The period after which the encoded time repeats.
  *
  * A reading is only a time within the current window. The consumer resolves
  * which window by comparing against a clock it already has, which holds as long
  * as the measured latency stays well inside half the period.
  */
  function wrapUs(profile) {
  	return codeCount(profile) * profile.stepUs;
  }
  /** Cells used per bit: one, or two for a constant-luminance pattern. */
  function cellsPerBit(profile) {
  	return profile.encoding === "differential" ? 2 : 1;
  }
  function requireUsableProfile(profile) {
  	const needed = (profile.dataBits + profile.checkBits) * cellsPerBit(profile);
  	if (profile.columns < 1 || profile.rows < 1) throw new TimeSpaceSyncError("invalid-payload", "A pattern needs at least one cell.");
  	if (profile.dataBits < 1 || profile.checkBits < 1) throw new TimeSpaceSyncError("invalid-payload", "A pattern needs both data and check bits.");
  	if (profile.stepUs < 1 || !Number.isSafeInteger(profile.stepUs)) throw new TimeSpaceSyncError("invalid-payload", "The pattern step must be whole microseconds.");
  	if (needed > cellCount(profile)) throw new TimeSpaceSyncError("invalid-payload", `The ${profile.columns}x${profile.rows} grid holds ${cellCount(profile)} cells but the encoding needs ${needed}.`);
  	return profile;
  }
  /**
  * The shortest window in which every cell is guaranteed to change state.
  *
  * The slowest bit is the top data bit, which holds its value for half the wrap
  * period. Calibrating for less than that can leave a cell at one level for the
  * whole window, and it would then be located from an incomplete region or read
  * as low contrast: a failure the operator cannot act on, because nothing was
  * actually wrong.
  */
  function minimumObservationUs(profile) {
  	return wrapUs(profile) / 2;
  }
  //#endregion
  //#region src/optical-time/pattern.ts
  /**
  * The time code a display shows, and the reading of it.
  *
  * Data cells carry a counter; check cells reject a reading that mixed two
  * displayed frames, which happens whenever a camera exposure straddles a
  * display refresh.
  *
  * The check is a fold of the counter onto itself, so it is linear: single cell
  * errors are always caught, but of the 4095 non-zero error patterns across the
  * data cells, 255 leave the check unchanged and pass. An undetected mix reports
  * a time that can be wrong by most of the wrap period, so the check is a filter
  * and not a guarantee. A decoder that needs one adds a continuity gate against
  * a clock it already has; the encoding alone cannot provide it.
  */
  var CHECK_SEED = 10;
  /** The code a display shows for a timestamp, in the display computer's clock. */
  function patternCodeForTimestamp(timestampUs, profile) {
  	const count = codeCount(profile);
  	return (Math.floor(timestampUs / profile.stepUs) % count + count) % count;
  }
  /** The display time a decoded code stands for, within the current wrap window. */
  function patternTimestampUs(code, profile) {
  	return normalizeCode(code, profile) * profile.stepUs;
  }
  function patternCheckBits(code, profile) {
  	const mask = 2 ** profile.checkBits - 1;
  	let folded = 0;
  	for (let shift = 0; shift < profile.dataBits; shift += profile.checkBits) folded ^= code >> shift;
  	return folded & mask ^ CHECK_SEED;
  }
  /** Cell states in row-major order. `true` is a light cell. */
  function encodePatternCells(code, profile) {
  	requireUsableProfile(profile);
  	const normalized = normalizeCode(code, profile);
  	const check = patternCheckBits(normalized, profile);
  	const bits = [];
  	for (let index = 0; index < profile.dataBits; index += 1) bits.push(bitAt(normalized, profile.dataBits - 1 - index));
  	for (let index = 0; index < profile.checkBits; index += 1) bits.push(bitAt(check, profile.checkBits - 1 - index));
  	const cells = [];
  	for (const bit of bits) {
  		cells.push(bit);
  		if (profile.encoding === "differential") cells.push(!bit);
  	}
  	while (cells.length < cellCount(profile)) cells.push(false);
  	return cells;
  }
  /**
  * Rebuilds the code from cell states.
  *
  * An undefined cell is one the reader could not tell apart from its opposite,
  * and any such cell rejects the whole reading rather than being guessed at: a
  * guessed cell that happens to satisfy the check produces a confident wrong
  * time.
  */
  function decodePatternCells(cells, profile) {
  	requireUsableProfile(profile);
  	if (cells.length !== cellCount(profile)) return void 0;
  	const stride = cellsPerBit(profile);
  	const bits = [];
  	for (let index = 0; index < profile.dataBits + profile.checkBits; index += 1) {
  		const bit = readBit(cells, index * stride, profile);
  		if (bit === void 0) return void 0;
  		bits.push(bit);
  	}
  	let code = 0;
  	for (let index = 0; index < profile.dataBits; index += 1) code = code << 1 | (bits[index] === true ? 1 : 0);
  	let check = 0;
  	for (let index = 0; index < profile.checkBits; index += 1) check = check << 1 | (bits[profile.dataBits + index] === true ? 1 : 0);
  	return check === patternCheckBits(code, profile) ? code : void 0;
  }
  function readBit(cells, offset, profile) {
  	const cell = cells[offset];
  	if (profile.encoding !== "differential") return cell;
  	const opposite = cells[offset + 1];
  	if (cell === void 0 || opposite === void 0) return void 0;
  	return cell === opposite ? void 0 : cell;
  }
  function normalizeCode(code, profile) {
  	const count = codeCount(profile);
  	return (Math.trunc(code) % count + count) % count;
  }
  function bitAt(value, bit) {
  	return (value >> bit & 1) === 1;
  }
  //#endregion
  //#region src/optical-time/sampling.ts
  /**
  * Sampling rectangles for each cell, inset to tolerate a small misalignment.
  *
  * The panel is divided evenly, which assumes the camera sees it square on and
  * undistorted. That holds for the v1 profile and it is what the extraction
  * source did; a tilted or keystoned view needs the corner fiducials and a
  * homography, which arrive with the v2 profile.
  */
  function patternCellRects(panel, profile, insetRatio = .25) {
  	const cellWidth = panel.width / profile.columns;
  	const cellHeight = panel.height / profile.rows;
  	const insetX = cellWidth * insetRatio;
  	const insetY = cellHeight * insetRatio;
  	const rects = [];
  	for (let row = 0; row < profile.rows; row += 1) for (let column = 0; column < profile.columns; column += 1) rects.push({
  		x: Math.floor(panel.x + column * cellWidth + insetX),
  		y: Math.floor(panel.y + row * cellHeight + insetY),
  		width: Math.max(1, Math.ceil(cellWidth - insetX * 2)),
  		height: Math.max(1, Math.ceil(cellHeight - insetY * 2))
  	});
  	return rects;
  }
  function sampleCells(frame, rects) {
  	return rects.map((rect) => meanLuminance(frame, rect));
  }
  function meanLuminance(frame, rect) {
  	const startX = Math.max(0, Math.min(frame.width - 1, rect.x));
  	const startY = Math.max(0, Math.min(frame.height - 1, rect.y));
  	const endX = Math.max(startX + 1, Math.min(frame.width, rect.x + rect.width));
  	const endY = Math.max(startY + 1, Math.min(frame.height, rect.y + rect.height));
  	let total = 0;
  	let count = 0;
  	for (let y = startY; y < endY; y += 1) {
  		const row = y * frame.width;
  		for (let x = startX; x < endX; x += 1) {
  			total += frame.data[row + x] ?? 0;
  			count += 1;
  		}
  	}
  	return count === 0 ? 0 : total / count;
  }
  //#endregion
  //#region src/optical-time/panel-detector.ts
  var defaultOptions = {
  	minimumRange: 40,
  	rangeRatio: .5,
  	minimumCellPixels: 3,
  	minimumFillRatio: .5,
  	maximumAspectSkew: 2.5,
  	ambiguityRatio: .5
  };
  /**
  * Finds the panel by watching which pixels change over time.
  *
  * Every pattern cell toggles within a few seconds because the counter runs
  * through all of its bits, so the panel stands out as one connected region of
  * high temporal range while the rest of the room stays comparatively still.
  */
  var PanelRangeAccumulator = class {
  	constructor(width, height) {
  		this.frameCount = 0;
  		this.width = width;
  		this.height = height;
  		this.minimum = new Uint8Array(width * height).fill(255);
  		this.maximum = new Uint8Array(width * height);
  	}
  	add(frame) {
  		if (frame.width !== this.width || frame.height !== this.height) throw new Error("Frame size does not match the accumulator.");
  		for (let index = 0; index < frame.data.length; index += 1) {
  			const value = frame.data[index] ?? 0;
  			if (value < (this.minimum[index] ?? 255)) this.minimum[index] = value;
  			if (value > (this.maximum[index] ?? 0)) this.maximum[index] = value;
  		}
  		this.frameCount += 1;
  	}
  	frames() {
  		return this.frameCount;
  	}
  	detect(profile, options = {}) {
  		if (this.frameCount < 2) return {
  			ok: false,
  			reason: "too-few-frames"
  		};
  		const settings = {
  			...defaultOptions,
  			...options
  		};
  		const pixels = this.width * this.height;
  		let strongest = 0;
  		for (let index = 0; index < pixels; index += 1) {
  			const range = (this.maximum[index] ?? 0) - (this.minimum[index] ?? 0);
  			if (range > strongest) strongest = range;
  		}
  		if (strongest < settings.minimumRange) return {
  			ok: false,
  			reason: "no-changing-region"
  		};
  		const threshold = Math.max(settings.minimumRange, strongest * settings.rangeRatio);
  		const mask = new Uint8Array(pixels);
  		for (let index = 0; index < pixels; index += 1) {
  			const range = (this.maximum[index] ?? 0) - (this.minimum[index] ?? 0);
  			mask[index] = range >= threshold ? 1 : 0;
  		}
  		const regions = findRegions(mask, this.width, this.height);
  		const best = regions[0];
  		if (!best) return {
  			ok: false,
  			reason: "no-changing-region"
  		};
  		const runnerUp = regions[1];
  		if (runnerUp && runnerUp.area >= best.area * settings.ambiguityRatio) return {
  			ok: false,
  			reason: "ambiguous"
  		};
  		const width = best.maxX - best.minX + 1;
  		const height = best.maxY - best.minY + 1;
  		if (width < profile.columns * settings.minimumCellPixels || height < profile.rows * settings.minimumCellPixels) return {
  			ok: false,
  			reason: "too-small"
  		};
  		const skew = width / height;
  		if (skew > settings.maximumAspectSkew || skew < 1 / settings.maximumAspectSkew) return {
  			ok: false,
  			reason: "wrong-shape"
  		};
  		if (best.area / (width * height) < settings.minimumFillRatio) return {
  			ok: false,
  			reason: "not-solid"
  		};
  		return {
  			ok: true,
  			panel: {
  				x: best.minX,
  				y: best.minY,
  				width,
  				height
  			}
  		};
  	}
  };
  /** Connected regions of the mask, largest first. */
  function findRegions(mask, width, height) {
  	const visited = new Uint8Array(mask.length);
  	const stack = [];
  	const regions = [];
  	for (let start = 0; start < mask.length; start += 1) {
  		if (mask[start] !== 1 || visited[start] === 1) continue;
  		visited[start] = 1;
  		stack.push(start);
  		let area = 0;
  		let minX = width;
  		let minY = height;
  		let maxX = 0;
  		let maxY = 0;
  		while (stack.length > 0) {
  			const index = stack.pop();
  			const x = index % width;
  			const y = (index - x) / width;
  			area += 1;
  			if (x < minX) minX = x;
  			if (x > maxX) maxX = x;
  			if (y < minY) minY = y;
  			if (y > maxY) maxY = y;
  			if (x > 0) push(index - 1);
  			if (x + 1 < width) push(index + 1);
  			if (y > 0) push(index - width);
  			if (y + 1 < height) push(index + width);
  		}
  		regions.push({
  			minX,
  			minY,
  			maxX,
  			maxY,
  			area
  		});
  	}
  	return regions.sort((left, right) => right.area - left.area);
  	function push(index) {
  		if (mask[index] === 1 && visited[index] === 0) {
  			visited[index] = 1;
  			stack.push(index);
  		}
  	}
  }
  //#endregion
  //#region src/optical-time/cell-levels.ts
  var defaults = {
  	trimRatio: .05,
  	marginRatio: .25,
  	windowSize: 256,
  	trackingRate: .02,
  	trackingLimitRatio: .05
  };
  /**
  * Light and dark levels learned per cell.
  *
  * Projection is uneven, so one global threshold misreads the dim corners of the
  * panel. Each cell keeps its own pair of levels and rejects readings that land
  * in the band between them, which is where a mixed exposure shows up.
  */
  var CellLevels = class {
  	constructor(profile, options = {}) {
  		this.profile = profile;
  		this.options = {
  			...defaults,
  			...options
  		};
  		this.samples = Array.from({ length: cellCount(profile) }, () => []);
  	}
  	/** Adds one reading to the learning window. */
  	add(values) {
  		for (let index = 0; index < this.samples.length; index += 1) {
  			const value = values[index];
  			if (value === void 0 || !Number.isFinite(value)) continue;
  			const bucket = this.samples[index];
  			bucket.push(value);
  			if (bucket.length > this.options.windowSize) bucket.shift();
  		}
  		this.levels = void 0;
  	}
  	sampleCount() {
  		return this.samples[0]?.length ?? 0;
  	}
  	/** The narrowest band across the cells: the panel's weakest contrast. */
  	contrast() {
  		let smallest = Number.POSITIVE_INFINITY;
  		for (const level of this.resolve()) {
  			const span = level.high - level.low;
  			if (span < smallest) smallest = span;
  		}
  		return Number.isFinite(smallest) ? smallest : 0;
  	}
  	/**
  	* How much room the weakest cell of a reading had to spare.
  	*
  	* Published continuously so a panel that is drifting out of readability shows
  	* as a falling margin rather than as a sudden run of failures.
  	*/
  	decodeMargin(values) {
  		const levels = this.resolve();
  		let smallest = Number.POSITIVE_INFINITY;
  		for (let index = 0; index < levels.length; index += 1) {
  			const level = levels[index];
  			const value = values[index];
  			if (value === void 0 || !Number.isFinite(value)) return 0;
  			const threshold = (level.low + level.high) / 2;
  			const margin = Math.abs(value - threshold) - (level.high - level.low) * this.options.marginRatio;
  			if (margin < smallest) smallest = margin;
  		}
  		return Number.isFinite(smallest) ? smallest : 0;
  	}
  	decodeCells(values) {
  		const levels = this.resolve();
  		const cells = [];
  		for (let index = 0; index < levels.length; index += 1) {
  			const level = levels[index];
  			const value = values[index];
  			const threshold = (level.low + level.high) / 2;
  			const margin = (level.high - level.low) * this.options.marginRatio;
  			if (value === void 0 || !Number.isFinite(value) || Math.abs(value - threshold) < margin) cells.push(void 0);
  			else cells.push(value > threshold);
  		}
  		return cells;
  	}
  	decode(values) {
  		return decodePatternCells(this.decodeCells(values), this.profile);
  	}
  	/**
  	* Nudges the levels towards a reading that decoded cleanly.
  	*
  	* Only confident decodes are used, and each step is capped, so lighting and
  	* exposure can drift over a session without the levels being able to chase a
  	* run of misreads across the band.
  	*/
  	track(values) {
  		const levels = this.resolve();
  		if (this.decode(values) === void 0) return;
  		const cells = this.decodeCells(values);
  		for (let index = 0; index < levels.length; index += 1) {
  			const level = levels[index];
  			const value = values[index];
  			const cell = cells[index];
  			if (value === void 0 || cell === void 0) continue;
  			const limit = (level.high - level.low) * this.options.trackingLimitRatio;
  			if (cell) level.high = level.high + clamp((value - level.high) * this.options.trackingRate, limit);
  			else level.low = level.low + clamp((value - level.low) * this.options.trackingRate, limit);
  			if (level.high <= level.low) {
  				const midpoint = (level.high + level.low) / 2;
  				level.low = midpoint - .5;
  				level.high = midpoint + .5;
  			}
  		}
  	}
  	/** The learned levels, for diagnostics and for saving a calibration. */
  	snapshot() {
  		return this.resolve().map((level) => ({ ...level }));
  	}
  	resolve() {
  		if (this.levels) return this.levels;
  		this.levels = this.samples.map((bucket) => {
  			if (bucket.length === 0) return {
  				low: 0,
  				high: 0
  			};
  			const sorted = [...bucket].sort((left, right) => left - right);
  			return {
  				low: percentile(sorted, this.options.trimRatio),
  				high: percentile(sorted, 1 - this.options.trimRatio)
  			};
  		});
  		return this.levels;
  	}
  };
  function clamp(value, limit) {
  	if (limit <= 0) return 0;
  	return Math.max(-limit, Math.min(limit, value));
  }
  function percentile(sorted, fraction) {
  	if (sorted.length === 0) return 0;
  	if (sorted.length === 1) return sorted[0];
  	const position = (sorted.length - 1) * Math.min(1, Math.max(0, fraction));
  	const lower = Math.floor(position);
  	const upper = Math.ceil(position);
  	const low = sorted[lower];
  	return low + ((sorted[upper] ?? low) - low) * (position - lower);
  }
  //#endregion
  //#region src/optical-time/pattern-display.ts
  var REFRESH_SAMPLES = 24;
  /** Enough samples that one stalled frame cannot dominate the median. */
  var REFRESH_SAMPLES_REQUIRED = 8;
  var MINIMUM_REFRESH_US = 4e3;
  /**
  * A 24 Hz display refreshes every 41.7 ms, and a variable-refresh panel can go
  * slower still. The extraction source capped the accepted interval at 40 ms, so
  * on those displays every sample was discarded and the estimate stayed at its
  * starting value forever.
  */
  var MAXIMUM_REFRESH_US = 1e5;
  /**
  * Smaller than the extraction source's 0.7.
  *
  * It reduces the share of the visual field that reverses each refresh, which is
  * the quantity the photosensitivity guidance is written in terms of. It is a
  * mitigation and not a guarantee: the real figure depends on viewing distance.
  * The decoder needs the panel to be large enough in the camera image, so this
  * trades against range and wants measuring on real hardware before it is fixed.
  */
  var DEFAULT_PANEL_SCALE = .35;
  var CELL_GAP_RATIO = .08;
  var DEFAULT_PALETTE = {
  	light: "#ffffff",
  	dark: "#000000",
  	/**
  	* Left black, as the extraction source had it. A lighter surround would cut
  	* the screen's overall luminance swing, but it also floods the room from a
  	* projector and drives the camera's auto-exposure away from the panel. That
  	* trade has not been measured, so it is not made here.
  	*/
  	surround: "#000000"
  };
  var OVERLAY_STYLE = [
  	"position:fixed",
  	"inset:0",
  	"width:100vw",
  	"height:100vh",
  	"margin:0",
  	"padding:0",
  	"border:0",
  	"background:#000",
  	"pointer-events:none",
  	"z-index:2147483000"
  ].join(";");
  /**
  * Shows the time coded pattern full screen for a camera or projector to relay.
  *
  * What is drawn during one animation frame reaches the screen at the next
  * refresh, so the encoded time is the current reading plus one measured refresh
  * interval. Any remaining display or projector delay is not measured here; it
  * is one of the components an optical measurement cannot separate, and the
  * correspondence result says so rather than assuming it away.
  */
  var PatternDisplay = class {
  	constructor(options) {
  		this.intervals = [];
  		this.lastFrameUs = 0;
  		requireAcknowledgement(options.acknowledgement);
  		this.profile = requireUsableProfile(options.profile);
  		this.clock = options.clock;
  		this.documentRef = options.documentRef ?? document;
  		this.panelScale = clampScale(options.panelScale ?? DEFAULT_PANEL_SCALE);
  		this.palette = {
  			...DEFAULT_PALETTE,
  			...options.palette
  		};
  		this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(() => callback()));
  		this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  		this.readDevicePixelRatio = options.devicePixelRatio ?? (() => globalThis.devicePixelRatio || 1);
  		this.onHidden = options.onHidden;
  	}
  	visible() {
  		return this.canvas !== void 0;
  	}
  	/**
  	* Whether the refresh interval has been measured well enough to encode with.
  	*
  	* Until it has, the panel is shown blank. The extraction source started from
  	* a 4 ms assumption, so on an ordinary 60 Hz display its first frames encoded
  	* a time about 12.7 ms early -- a systematic error, present only at the start
  	* of a run, and indistinguishable afterwards from a genuine latency.
  	*/
  	stable() {
  		return this.intervals.length >= REFRESH_SAMPLES_REQUIRED;
  	}
  	refreshUs() {
  		return this.stable() ? this.medianInterval() : void 0;
  	}
  	/** The code currently on screen, or undefined while the panel is blank. */
  	shownCode() {
  		return this.lastShownCode;
  	}
  	patternProfile() {
  		return this.profile;
  	}
  	show() {
  		if (this.canvas) return;
  		const canvas = this.documentRef.createElement("canvas");
  		canvas.style.cssText = OVERLAY_STYLE;
  		const context = canvas.getContext("2d");
  		if (!context) throw new TimeSpaceSyncError("display-unavailable", "The frame sync pattern needs a 2D canvas.");
  		this.documentRef.body.append(canvas);
  		this.canvas = canvas;
  		this.context = context;
  		this.intervals.length = 0;
  		this.lastFrameUs = 0;
  		this.lastShownCode = void 0;
  		this.attachListeners();
  		this.scheduleFrame();
  	}
  	hide(reason = "requested") {
  		if (!this.canvas) return;
  		if (this.animationHandle !== void 0) {
  			this.cancelFrame(this.animationHandle);
  			this.animationHandle = void 0;
  		}
  		this.detachListeners();
  		this.canvas.remove();
  		this.canvas = void 0;
  		this.context = void 0;
  		this.intervals.length = 0;
  		this.lastFrameUs = 0;
  		this.lastShownCode = void 0;
  		this.onHidden?.(reason);
  	}
  	attachListeners() {
  		this.keyListener = (event) => {
  			if (event.key === "Escape") this.hide("escape-key");
  		};
  		this.documentRef.addEventListener("keydown", this.keyListener, true);
  		this.visibilityListener = () => {
  			if (this.documentRef.visibilityState === "hidden") this.hide("page-hidden");
  		};
  		this.documentRef.addEventListener("visibilitychange", this.visibilityListener);
  	}
  	detachListeners() {
  		if (this.keyListener) {
  			this.documentRef.removeEventListener("keydown", this.keyListener, true);
  			this.keyListener = void 0;
  		}
  		if (this.visibilityListener) {
  			this.documentRef.removeEventListener("visibilitychange", this.visibilityListener);
  			this.visibilityListener = void 0;
  		}
  	}
  	scheduleFrame() {
  		if (!this.canvas) return;
  		this.animationHandle = this.requestFrame(() => {
  			this.animationHandle = void 0;
  			this.renderFrame();
  			this.scheduleFrame();
  		});
  	}
  	renderFrame() {
  		const canvas = this.canvas;
  		const context = this.context;
  		if (!canvas || !context) return;
  		const nowUs = this.clock.nowUs();
  		this.recordInterval(nowUs);
  		this.resize(canvas);
  		const refreshUs = this.refreshUs();
  		if (refreshUs === void 0) {
  			this.lastShownCode = void 0;
  			drawPattern(context, canvas.width, canvas.height, blankCells(this.profile), {
  				profile: this.profile,
  				panelScale: this.panelScale,
  				palette: this.palette
  			});
  			return;
  		}
  		const code = patternCodeForTimestamp(nowUs + refreshUs, this.profile);
  		this.lastShownCode = code;
  		drawPattern(context, canvas.width, canvas.height, encodePatternCells(code, this.profile), {
  			profile: this.profile,
  			panelScale: this.panelScale,
  			palette: this.palette
  		});
  	}
  	recordInterval(nowUs) {
  		if (this.lastFrameUs > 0) {
  			const interval = nowUs - this.lastFrameUs;
  			if (interval >= MINIMUM_REFRESH_US && interval <= MAXIMUM_REFRESH_US) {
  				this.intervals.push(interval);
  				while (this.intervals.length > REFRESH_SAMPLES) this.intervals.shift();
  			}
  		}
  		this.lastFrameUs = nowUs;
  	}
  	medianInterval() {
  		const sorted = [...this.intervals].sort((left, right) => left - right);
  		return sorted[Math.floor(sorted.length / 2)] ?? MINIMUM_REFRESH_US;
  	}
  	resize(canvas) {
  		const ratio = Math.min(3, Math.max(1, this.readDevicePixelRatio()));
  		const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  		const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  		if (canvas.width !== width) canvas.width = width;
  		if (canvas.height !== height) canvas.height = height;
  	}
  };
  function blankCells(profile) {
  	return new Array(cellCount(profile)).fill(false);
  }
  function drawPattern(context, width, height, cells, options) {
  	const { profile, panelScale, palette } = options;
  	context.fillStyle = palette.surround;
  	context.fillRect(0, 0, width, height);
  	const panel = Math.min(width, height) * panelScale;
  	const originX = (width - panel) / 2;
  	const originY = (height - panel) / 2;
  	const cellWidth = panel / profile.columns;
  	const cellHeight = panel / profile.rows;
  	const gapX = cellWidth * CELL_GAP_RATIO;
  	const gapY = cellHeight * CELL_GAP_RATIO;
  	for (let row = 0; row < profile.rows; row += 1) for (let column = 0; column < profile.columns; column += 1) {
  		context.fillStyle = cells[row * profile.columns + column] === true ? palette.light : palette.dark;
  		context.fillRect(originX + column * cellWidth + gapX / 2, originY + row * cellHeight + gapY / 2, cellWidth - gapX, cellHeight - gapY);
  	}
  }
  function requireAcknowledgement(value) {
  	if (typeof value !== "object" || value === null || value.acknowledgedByOperator !== true || !Number.isFinite(value.acknowledgedAtUs)) throw new TimeSpaceSyncError("photosensitivity-unacknowledged", "The full screen pattern flashes and must be acknowledged by the operator before it is shown.");
  }
  function clampScale(value) {
  	if (!Number.isFinite(value)) return DEFAULT_PANEL_SCALE;
  	return Math.min(.95, Math.max(.05, value));
  }
  //#endregion
  //#region src/optical-time/frame-pump.ts
  /**
  * Delivers downscaled camera frames to the decoder.
  *
  * The clocks are read at the top of the callback, before any pixel work. The
  * extraction source read its shared clock after downscaling and converting the
  * whole frame to luminance, so the cost of that work sat inside every latency
  * it went on to compute, unmodelled and invisible.
  */
  var VideoFramePump = class {
  	constructor(options) {
  		this.element = options.element;
  		this.width = options.width;
  		this.height = options.height;
  		this.clock = options.clock;
  		this.monotonic = options.monotonic;
  		this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(() => callback()));
  		this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  		this.onError = options.onError;
  		const documentRef = options.documentRef ?? document;
  		this.canvas = documentRef.createElement("canvas");
  		this.canvas.width = options.width;
  		this.canvas.height = options.height;
  		const context = this.canvas.getContext("2d", { willReadFrequently: true });
  		if (!context) throw new Error("The frame sync decoder needs a 2D canvas.");
  		this.context = context;
  		this.luminance = new Uint8Array(options.width * options.height);
  	}
  	start(handler) {
  		this.stop();
  		this.handler = handler;
  		this.schedule();
  	}
  	stop() {
  		this.handler = void 0;
  		if (this.videoFrameHandle !== void 0) {
  			this.element.cancelVideoFrameCallback(this.videoFrameHandle);
  			this.videoFrameHandle = void 0;
  		}
  		if (this.animationHandle !== void 0) {
  			this.cancelFrame(this.animationHandle);
  			this.animationHandle = void 0;
  		}
  	}
  	schedule() {
  		if (!this.handler) return;
  		if (typeof this.element.requestVideoFrameCallback === "function") {
  			this.videoFrameHandle = this.element.requestVideoFrameCallback((now, metadata) => {
  				this.videoFrameHandle = void 0;
  				this.deliver(now, metadata);
  			});
  			return;
  		}
  		this.animationHandle = this.requestFrame(() => {
  			this.animationHandle = void 0;
  			this.deliver(void 0, {});
  		});
  	}
  	deliver(now, metadata) {
  		const handler = this.handler;
  		if (!handler) return;
  		const deliveredAtUs = this.clock.nowUs();
  		const monotonicAtUs = this.monotonic.nowUs();
  		try {
  			const capture = captureTimeOf(now, metadata, deliveredAtUs);
  			this.context.drawImage(this.element, 0, 0, this.width, this.height);
  			const pixels = this.context.getImageData(0, 0, this.width, this.height).data;
  			for (let index = 0; index < this.luminance.length; index += 1) {
  				const offset = index * 4;
  				const red = pixels[offset] ?? 0;
  				const green = pixels[offset + 1] ?? 0;
  				const blue = pixels[offset + 2] ?? 0;
  				this.luminance[index] = (red * 299 + green * 587 + blue * 114) / 1e3;
  			}
  			handler({
  				luminance: {
  					width: this.width,
  					height: this.height,
  					data: this.luminance
  				},
  				deliveredAtUs,
  				monotonicAtUs,
  				...capture.captureTimeUs === void 0 ? {} : { captureTimeUs: capture.captureTimeUs },
  				captureTimeKind: capture.kind,
  				sourceWidth: this.element.videoWidth || this.width,
  				sourceHeight: this.element.videoHeight || this.height
  			});
  		} catch (error) {
  			this.onError?.(error);
  		} finally {
  			this.schedule();
  		}
  	}
  };
  /**
  * Places the capture instant on the shared clock, or says it is unknown.
  *
  * Only a real capture time is converted. A presentation time is reported as
  * what it is, so a consumer can decide what to do with it, and a frame with
  * neither carries no timestamp at all rather than a zero that would read as a
  * measured absence of latency.
  */
  function captureTimeOf(now, metadata, deliveredAtUs) {
  	if (now === void 0 || !Number.isFinite(now)) return { kind: "none" };
  	const captured = metadata.captureTime;
  	if (captured !== void 0 && Number.isFinite(captured)) return {
  		captureTimeUs: deliveredAtUs - Math.max(0, Math.round((now - captured) * 1e3)),
  		kind: "capture"
  	};
  	const presented = metadata.presentationTime;
  	if (presented !== void 0 && Number.isFinite(presented)) return {
  		captureTimeUs: deliveredAtUs - Math.max(0, Math.round((now - presented) * 1e3)),
  		kind: "presentation"
  	};
  	return { kind: "none" };
  }
  //#endregion
  //#region src/camera/camera-source.ts
  var CAMERA_SOURCE_EXTENSION_KEY = "ext_kubohiroyacamerasource";
  function requireCameraSource(runtime) {
  	const candidate = runtime[CAMERA_SOURCE_EXTENSION_KEY];
  	if (typeof candidate !== "object" || candidate === null || typeof candidate.acquireCamera !== "function") throw new TimeSpaceSyncError("camera-unavailable", "Camera Source is not loaded.");
  	return candidate;
  }
  /**
  * The capture settings the browser is willing to report.
  *
  * Recorded rather than controlled. Decoding fails whenever an exposure spans a
  * display refresh, so the decode rate is governed by the exposure time, and a
  * low rate caused by a long exposure looks exactly like one caused by a dim
  * panel while calling for the opposite remedy. Every field is optional because
  * every field genuinely may be absent, and an absent setting is left absent.
  */
  function readCaptureConditions(element) {
  	const track = videoTrackOf(element);
  	if (!track) return {};
  	let settings;
  	try {
  		settings = track.getSettings();
  	} catch {
  		return {};
  	}
  	const conditions = {};
  	const frameRate = positive(settings.frameRate);
  	if (frameRate !== void 0) conditions.frameRate = frameRate;
  	const width = wholePositive(settings.width);
  	if (width !== void 0) conditions.width = width;
  	const height = wholePositive(settings.height);
  	if (height !== void 0) conditions.height = height;
  	const exposure = positive(settings.exposureTime);
  	if (exposure !== void 0) conditions.exposureTimeUs = Math.round(exposure * 100);
  	return conditions;
  }
  function videoTrackOf(element) {
  	const source = element.srcObject;
  	if (typeof source !== "object" || source === null) return void 0;
  	const stream = source;
  	if (typeof stream.getVideoTracks !== "function") return void 0;
  	return stream.getVideoTracks()[0];
  }
  function positive(value) {
  	const parsed = Number(value);
  	return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
  }
  function wholePositive(value) {
  	const parsed = positive(value);
  	return parsed === void 0 ? void 0 : Math.round(parsed);
  }
  //#endregion
  //#region src/optical-time/controller.ts
  var DEFAULT_ANALYSIS_WIDTH = 240;
  var DEFAULT_ANALYSIS_HEIGHT = 180;
  /**
  * A time window, not a count.
  *
  * The extraction source kept 600 observations. How long that spans depends on
  * the decode rate, so at 30 fps the same setting covered 22 seconds when
  * reading well and about 100 seconds when reading poorly: the same API
  * averaging over quite different stretches of time, with nothing saying which.
  */
  var DEFAULT_OBSERVATION_WINDOW_US = 3e7;
  var DEFAULT_OBSERVATION_LIMIT = 2e3;
  var DEFAULT_MINIMUM_DECODE_RATE = .2;
  var DEFAULT_MINIMUM_CONTRAST = 24;
  var DECODE_RATE_WINDOW = 120;
  var RANGE_PHASE_SHARE = .6;
  var LEVELS_PHASE_SHARE = .4;
  var CALIBRATION_MARGIN = 1.2;
  var MAXIMUM_CALIBRATION_SECONDS = 60;
  /**
  * Decodes the pattern out of one camera and publishes observations.
  *
  * Calibration runs in two phases against the live pattern: the first watches
  * which pixels change to locate the panel, the second learns each cell's levels
  * and checks that readings decode often enough to be worth measuring. Both
  * phases end on the monotonic clock, so neither a stalled camera nor a
  * re-estimated clock offset can leave the controller waiting.
  */
  var OpticalTimeController = class {
  	constructor(options) {
  		this.observations = [];
  		this.recentDecodes = [];
  		this.rects = [];
  		this.pipelineState = "idle";
  		this.code = "";
  		this.message = "";
  		this.operation = 0;
  		this.sequence = 0;
  		this.droppedObservations = 0;
  		this.rejectedObservations = 0;
  		this.lastDecodeMargin = 0;
  		this.runtime = options.runtime;
  		this.clock = options.clock;
  		this.profile = requireUsableProfile(options.profile);
  		this.createFramePump = options.createFramePump;
  		this.wait = options.wait ?? defaultWait;
  		this.analysisWidth = options.analysisWidth ?? DEFAULT_ANALYSIS_WIDTH;
  		this.analysisHeight = options.analysisHeight ?? DEFAULT_ANALYSIS_HEIGHT;
  		this.observationWindowUs = options.observationWindowUs ?? DEFAULT_OBSERVATION_WINDOW_US;
  		this.observationLimit = options.observationLimit ?? DEFAULT_OBSERVATION_LIMIT;
  		this.minimumDecodeRate = options.minimumDecodeRate ?? DEFAULT_MINIMUM_DECODE_RATE;
  		this.minimumContrast = options.minimumContrast ?? DEFAULT_MINIMUM_CONTRAST;
  	}
  	minimumCalibrationSeconds() {
  		return Math.ceil(minimumObservationUs(this.profile) * CALIBRATION_MARGIN / LEVELS_PHASE_SHARE / 1e5) / 10;
  	}
  	analysisSize() {
  		return {
  			width: this.analysisWidth,
  			height: this.analysisHeight
  		};
  	}
  	state() {
  		return this.pipelineState;
  	}
  	errorCode() {
  		return this.code;
  	}
  	errorMessage() {
  		return this.message;
  	}
  	cameraId() {
  		return this.start_?.cameraId ?? "";
  	}
  	decodeRate() {
  		if (this.recentDecodes.length === 0) return 0;
  		return this.recentDecodes.filter((value) => value).length / this.recentDecodes.length;
  	}
  	decodeMargin() {
  		return this.lastDecodeMargin;
  	}
  	droppedCount() {
  		return this.droppedObservations;
  	}
  	/** Readings thrown out for disagreeing with the clock rather than failing to decode. */
  	rejectedCount() {
  		return this.rejectedObservations;
  	}
  	pendingObservations() {
  		this.expire();
  		return this.observations.length;
  	}
  	takeObservation() {
  		this.expire();
  		return this.observations.shift();
  	}
  	drainObservations() {
  		this.expire();
  		return this.observations.splice(0, this.observations.length);
  	}
  	async start(options) {
  		await this.stop();
  		const token = this.operation += 1;
  		const cameraId = options.cameraId.trim();
  		const referenceId = options.referenceId.trim();
  		if (!cameraId) this.fail("camera-unavailable", /* @__PURE__ */ new Error("Camera ID must not be empty."));
  		if (!referenceId) this.fail("reference-unknown", /* @__PURE__ */ new Error("A reference ID must not be empty."));
  		this.requireCalibrationSeconds(options.calibrationSeconds);
  		this.requireDisplayTiming(options);
  		this.start_ = {
  			...options,
  			cameraId,
  			referenceId
  		};
  		this.pipelineState = "acquiring-camera";
  		this.code = "";
  		this.message = "";
  		let lease;
  		try {
  			lease = await requireCameraSource(this.runtime).acquireCamera({
  				owner: "time-space-sync",
  				cameraId
  			});
  		} catch (error) {
  			if (this.operation !== token) return;
  			this.fail("camera-unavailable", error);
  		}
  		if (this.operation !== token) {
  			await lease.release().catch(() => void 0);
  			return;
  		}
  		this.lease = lease;
  		const pump = this.createFramePump(lease);
  		this.pump = pump;
  		pump.start((frame) => this.consume(frame));
  		await this.runCalibration(options.calibrationSeconds, token);
  	}
  	async recalibrate(seconds) {
  		if (!this.pump) this.fail("camera-unavailable", /* @__PURE__ */ new Error("Start the decoder before calibrating."));
  		await this.runCalibration(seconds, this.operation);
  	}
  	async stop() {
  		this.operation += 1;
  		const calibration = this.calibration;
  		if (calibration) {
  			calibration.cancelled = true;
  			calibration.settle(/* @__PURE__ */ new Error("Optical time decoding stopped."));
  		}
  		this.calibration = void 0;
  		this.pump?.stop();
  		this.pump = void 0;
  		const lease = this.lease;
  		this.lease = void 0;
  		this.levels = void 0;
  		this.rects = [];
  		this.observations.length = 0;
  		this.recentDecodes.length = 0;
  		this.lastDecode = void 0;
  		this.start_ = void 0;
  		if (this.pipelineState !== "error") {
  			this.pipelineState = "idle";
  			this.code = "";
  			this.message = "";
  		}
  		if (lease) await lease.release().catch(() => void 0);
  	}
  	requireCalibrationSeconds(seconds) {
  		const minimum = this.minimumCalibrationSeconds();
  		if (!Number.isFinite(seconds) || seconds < minimum || seconds > MAXIMUM_CALIBRATION_SECONDS) this.fail("invalid-duration", /* @__PURE__ */ new Error(`Calibration must run between ${minimum} and ${MAXIMUM_CALIBRATION_SECONDS} seconds so that every pattern cell changes at least once.`));
  	}
  	requireDisplayTiming(options) {
  		if (!Number.isFinite(options.displayRefreshUs) || options.displayRefreshUs <= 0) this.fail("invalid-duration", /* @__PURE__ */ new Error("The display refresh interval must be a positive number of microseconds."));
  		if (!Number.isFinite(options.refreshUncertaintyUs) || options.refreshUncertaintyUs < 0) this.fail("invalid-duration", /* @__PURE__ */ new Error("The refresh uncertainty must not be negative."));
  	}
  	async runCalibration(seconds, token) {
  		this.requireCalibrationSeconds(seconds);
  		this.pipelineState = "calibrating";
  		this.code = "";
  		this.message = "";
  		this.levels = void 0;
  		this.rects = [];
  		this.observations.length = 0;
  		this.recentDecodes.length = 0;
  		this.lastDecode = void 0;
  		const startUs = this.clock.monotonic().nowUs();
  		const totalUs = seconds * 1e6;
  		const finished = new Promise((resolve, reject) => {
  			this.calibration = {
  				phase: "range",
  				cancelled: false,
  				operation: token,
  				rangeDeadlineUs: startUs + totalUs * RANGE_PHASE_SHARE,
  				levelsDeadlineUs: startUs + totalUs,
  				range: new PanelRangeAccumulator(this.analysisWidth, this.analysisHeight),
  				levels: new CellLevels(this.profile),
  				rects: [],
  				attempts: 0,
  				decodes: 0,
  				settle: (error) => {
  					this.calibration = void 0;
  					if (error) reject(error);
  					else resolve();
  				}
  			};
  		});
  		const pending = this.calibration;
  		this.wait(seconds * 1e3 + 2e3).then(() => {
  			if (this.calibration !== pending) return;
  			pending?.settle(/* @__PURE__ */ new Error("The camera stopped delivering frames while calibrating."));
  		});
  		try {
  			await finished;
  		} catch (error) {
  			if (pending?.cancelled) return;
  			this.fail(this.code || "camera-ended", error);
  		}
  	}
  	consume(frame) {
  		try {
  			this.consumeFrame(frame);
  		} catch (error) {
  			const calibration = this.calibration;
  			this.code = errorCodeOf(error);
  			if (calibration) {
  				calibration.settle(error instanceof Error ? error : new Error(String(error)));
  				return;
  			}
  			this.pipelineState = "error";
  			this.message = error instanceof Error ? error.message : String(error);
  		}
  	}
  	consumeFrame(frame) {
  		const calibration = this.calibration;
  		if (calibration) {
  			this.calibrateWith(calibration, frame);
  			return;
  		}
  		if (this.pipelineState !== "ready") return;
  		const levels = this.levels;
  		const start = this.start_;
  		if (!levels || !start) return;
  		const samples = sampleCells(frame.luminance, this.rects);
  		const code = levels.decode(samples);
  		this.lastDecodeMargin = levels.decodeMargin(samples);
  		this.recordDecodeAttempt(code !== void 0);
  		if (code === void 0) return;
  		if (!this.passesContinuity(code, frame)) {
  			this.rejectedObservations += 1;
  			return;
  		}
  		levels.track(samples);
  		this.observations.push(this.observationFor(code, frame, start, levels, samples));
  		this.expire();
  	}
  	/**
  	* Rejects a decode that cannot follow the previous one in real time.
  	*
  	* The check bits are a fold of the counter onto itself and therefore linear,
  	* so 255 of the 4095 non-zero data error patterns pass them; a frozen panel
  	* decodes perfectly as well. Comparing successive codes against the elapsed
  	* time on this computer's own clock catches both, and needs no agreement with
  	* any other clock to do it.
  	*/
  	passesContinuity(code, frame) {
  		const previous = this.lastDecode;
  		this.lastDecode = {
  			code,
  			monotonicAtUs: frame.monotonicAtUs
  		};
  		if (!previous) return true;
  		const elapsedUs = frame.monotonicAtUs - previous.monotonicAtUs;
  		if (elapsedUs <= 0) return true;
  		const wrap = wrapUs(this.profile);
  		if (elapsedUs >= wrap / 2) return true;
  		const advanced = patternTimestampUs(code, this.profile) - patternTimestampUs(previous.code, this.profile);
  		const half = wrap / 2;
  		const signed = ((advanced + half) % wrap + wrap) % wrap - half;
  		const allowance = (this.start_?.displayRefreshUs ?? 0) + (this.start_?.refreshUncertaintyUs ?? 0);
  		return Math.abs(signed - elapsedUs) <= allowance;
  	}
  	observationFor(code, frame, start, levels, samples) {
  		const panel = this.panelRect();
  		const conditions = this.lease ? readCaptureConditions(this.lease.getFrameSource().element) : {};
  		this.sequence += 1;
  		return {
  			schema: OPTICAL_TIME_OBSERVATION_SCHEMA,
  			version: 1,
  			cameraId: start.cameraId,
  			referenceId: start.referenceId,
  			patternProfileId: this.profile.id,
  			observerDomain: this.clock.domain(),
  			displayDomain: start.displayDomain ?? null,
  			deliveredAtUs: frame.deliveredAtUs,
  			monotonicAtUs: frame.monotonicAtUs,
  			...frame.captureTimeUs === void 0 ? {} : { captureTimeUs: frame.captureTimeUs },
  			captureTimeKind: frame.captureTimeKind,
  			patternCodeTimestampUs: patternTimestampUs(code, this.profile),
  			wrapUs: wrapUs(this.profile),
  			stepUs: this.profile.stepUs,
  			displayRefreshUs: start.displayRefreshUs,
  			refreshUncertaintyUs: start.refreshUncertaintyUs,
  			...this.constraintFor(frame),
  			decodeMargin: levels.decodeMargin(samples),
  			panel,
  			imageWidth: this.analysisWidth,
  			imageHeight: this.analysisHeight,
  			captureConditions: conditions,
  			...start.intrinsicProfileId === void 0 ? {} : { intrinsicProfileId: start.intrinsicProfileId },
  			sequence: this.sequence
  		};
  	}
  	/**
  	* The window the capture instant is known to lie in, on the observer's clock.
  	*
  	* The frame existed by the time it was delivered, which is the upper bound.
  	* When the browser reported a capture time that is the lower bound; when it
  	* did not, the bound is set as wide as the wrap period can resolve, so the
  	* observation constrains an estimate only through its upper bound. Choosing a
  	* narrower figure would mean inventing a latency the run never measured.
  	*/
  	constraintFor(frame) {
  		const hi = frame.deliveredAtUs;
  		return {
  			constraintLoUs: frame.captureTimeUs !== void 0 ? Math.min(frame.captureTimeUs, hi - 1) : hi - Math.floor(wrapUs(this.profile) / 2),
  			constraintHiUs: hi
  		};
  	}
  	panelRect() {
  		const first = this.rects[0];
  		const last = this.rects[this.rects.length - 1];
  		if (!first || !last) return {
  			x: 0,
  			y: 0,
  			width: this.analysisWidth,
  			height: this.analysisHeight
  		};
  		return {
  			x: first.x,
  			y: first.y,
  			width: last.x + last.width - first.x,
  			height: last.y + last.height - first.y
  		};
  	}
  	expire() {
  		const cutoff = this.clock.monotonic().nowUs() - this.observationWindowUs;
  		while (this.observations.length > 0 && (this.observations[0]?.monotonicAtUs ?? 0) < cutoff) {
  			this.observations.shift();
  			this.droppedObservations += 1;
  		}
  		while (this.observations.length > this.observationLimit) {
  			this.observations.shift();
  			this.droppedObservations += 1;
  		}
  	}
  	calibrateWith(calibration, frame) {
  		const now = this.clock.monotonic().nowUs();
  		if (calibration.phase === "range") {
  			calibration.range.add(frame.luminance);
  			if (now < calibration.rangeDeadlineUs) return;
  			const detection = calibration.range.detect(this.profile);
  			if (!detection.ok) {
  				this.code = codeForDetectionFailure(detection.reason);
  				calibration.settle(new Error(messageForDetectionFailure(detection.reason)));
  				return;
  			}
  			calibration.rects = patternCellRects(detection.panel, this.profile);
  			calibration.phase = "levels";
  			return;
  		}
  		const samples = sampleCells(frame.luminance, calibration.rects);
  		calibration.levels.add(samples);
  		calibration.attempts += 1;
  		if (calibration.levels.decode(samples) !== void 0) calibration.decodes += 1;
  		if (now < calibration.levelsDeadlineUs) return;
  		if (calibration.levels.contrast() < this.minimumContrast) {
  			this.code = "low-contrast";
  			calibration.settle(/* @__PURE__ */ new Error("The pattern is too dim or too washed out to read."));
  			return;
  		}
  		const rate = calibration.attempts === 0 ? 0 : calibration.decodes / calibration.attempts;
  		if (rate < this.minimumDecodeRate) {
  			this.code = this.exposureIsTooLong() ? "exposure-too-long" : "decode-unstable";
  			calibration.settle(new Error(this.decodeRateMessage(rate)));
  			return;
  		}
  		this.levels = calibration.levels;
  		this.rects = calibration.rects;
  		this.recentDecodes.length = 0;
  		this.pipelineState = "ready";
  		this.code = "";
  		this.message = "";
  		calibration.settle();
  	}
  	/**
  	* Whether the camera's exposure can explain the failures on its own.
  	*
  	* A reading only decodes when the whole exposure falls inside one displayed
  	* code, so the achievable rate is roughly `1 - exposure / refresh`. Saying so
  	* turns an unactionable "unstable" into a specific instruction.
  	*/
  	exposureIsTooLong() {
  		const exposure = this.lease ? readCaptureConditions(this.lease.getFrameSource().element).exposureTimeUs : void 0;
  		const refresh = this.start_?.displayRefreshUs;
  		return exposure !== void 0 && refresh !== void 0 && exposure > refresh;
  	}
  	decodeRateMessage(rate) {
  		const percent = Math.round(rate * 100);
  		if (this.exposureIsTooLong()) return `Only ${percent}% of frames decoded: the camera's exposure is longer than one display refresh, so most exposures span two codes.`;
  		return `Only ${percent}% of the frames decoded during calibration.`;
  	}
  	recordDecodeAttempt(decoded) {
  		this.recentDecodes.push(decoded);
  		while (this.recentDecodes.length > DECODE_RATE_WINDOW) this.recentDecodes.shift();
  	}
  	fail(code, error) {
  		this.pipelineState = "error";
  		this.code = code;
  		this.message = error instanceof Error ? error.message : String(error);
  		this.pump?.stop();
  		this.pump = void 0;
  		const lease = this.lease;
  		this.lease = void 0;
  		if (lease) lease.release().catch(() => void 0);
  		throw error instanceof TimeSpaceSyncError ? error : new TimeSpaceSyncError(code, this.message, { cause: error });
  	}
  };
  function codeForDetectionFailure(reason) {
  	return reason === "ambiguous" ? "ambiguous-panel" : "panel-not-found";
  }
  function messageForDetectionFailure(reason) {
  	switch (reason) {
  		case "ambiguous": return "More than one flickering panel is in view, so which one was read would not be recorded.";
  		case "too-small": return "The pattern is too small in the camera image to sample its cells.";
  		case "wrong-shape": return "The changing region is not shaped like the pattern panel.";
  		case "not-solid": return "The changing region is not solid enough to be the pattern panel.";
  		case "too-few-frames": return "The camera delivered too few frames to locate the pattern.";
  		default: return "No pattern was found in the camera image.";
  	}
  }
  function defaultWait(milliseconds) {
  	return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  //#endregion
  //#region src/runtime-capability.ts
  var runtimeCapabilityKey = "kubohiroyaTimeSpaceSyncCapability";
  function createRuntimeCapability(host) {
  	const capability = {
  		version: 1,
  		requireVersion(version) {
  			if (version !== 1) throw new Error(`Unsupported Time Space Sync runtime capability version: ${version}; this build provides 1.`);
  			return capability;
  		},
  		patternProfile: () => host.patternProfile(),
  		showPattern: (acknowledgement) => host.showPattern(acknowledgement),
  		hidePattern: () => host.hidePattern(),
  		patternShown: () => host.patternShown(),
  		patternRefreshUs: () => host.patternRefreshUs(),
  		startDecoder: (options) => host.startDecoder(options),
  		stopDecoder: () => host.stopDecoder(),
  		decoderState: () => host.decoderState(),
  		decoderError: () => host.decoderError(),
  		takeObservation: () => host.takeObservation(),
  		drainObservations: () => host.drainObservations()
  	};
  	return Object.freeze(capability);
  }
  //#endregion
  //#region src/extension.ts
  var blockDefinitions = block_definitions_default.blocks;
  var ANALYSIS_WIDTH = 240;
  var ANALYSIS_HEIGHT = 180;
  var TimeSpaceSyncExtension = class {
  	constructor(options = {}) {
  		this.runtime = options.runtime ?? Scratch.vm?.runtime ?? {};
  		this.opticalTimeEnabled = options.opticalTimeEnabled ?? featureFlags.opticalTimeSyncV1;
  		this.placementEnabled = options.placementEnabled ?? featureFlags.placementSolveV1;
  		this.profile = options.profile ?? PATTERN_PROFILE_V1;
  		this.clock = options.clock ?? new SessionClock(new LocalMonotonicClock());
  		this.display = options.display;
  		this.controller = options.controller;
  		this.publishCapability();
  		this.watchRuntime();
  	}
  	getInfo() {
  		return {
  			id: extensionConfig.id,
  			name: Scratch.translate(block_definitions_default.extensionName),
  			docsURI: extensionConfig.docsURI,
  			blockIconURI: extensionConfig.blockIconURI,
  			blocks: blockDefinitions.filter((block) => this.featureEnabled(block.feature)).map((block) => this.toScratchBlock(block))
  		};
  	}
  	acknowledgePatternFlashing() {
  		this.requireOpticalTime();
  		this.acknowledgement = {
  			acknowledgedByOperator: true,
  			acknowledgedAtUs: this.clock.nowUs()
  		};
  	}
  	showTimePattern() {
  		this.requireOpticalTime();
  		this.requireDisplay().show();
  	}
  	hideTimePattern() {
  		this.display?.hide();
  	}
  	timePatternShown() {
  		return this.display?.visible() ?? false;
  	}
  	timePatternStable() {
  		return this.display?.stable() ?? false;
  	}
  	timePatternRefreshUs() {
  		return this.display?.refreshUs() ?? 0;
  	}
  	timePatternWrapUs() {
  		return wrapUs(this.profile);
  	}
  	timePatternProfileId() {
  		return this.profile.id;
  	}
  	async startOpticalTimeDecoder(args) {
  		this.requireOpticalTime();
  		await this.requireController().start({
  			cameraId: Scratch.Cast.toString(args.CAMERA_ID),
  			referenceId: Scratch.Cast.toString(args.REFERENCE_ID),
  			calibrationSeconds: Scratch.Cast.toNumber(args.SECONDS),
  			displayRefreshUs: Math.round(Scratch.Cast.toNumber(args.REFRESH_US)),
  			refreshUncertaintyUs: 0
  		});
  	}
  	async calibrateOpticalTimeDecoder(args) {
  		this.requireOpticalTime();
  		await this.requireController().recalibrate(Scratch.Cast.toNumber(args.SECONDS));
  	}
  	async stopOpticalTimeDecoder() {
  		await this.controller?.stop();
  		this.observation = void 0;
  	}
  	opticalTimeDecoderState() {
  		return this.controller?.state() ?? "idle";
  	}
  	opticalTimeDecoderError() {
  		return this.controller?.errorCode() ?? "";
  	}
  	opticalTimeDecodeRate() {
  		return this.controller?.decodeRate() ?? 0;
  	}
  	opticalTimeDecodeMargin() {
  		return this.controller?.decodeMargin() ?? 0;
  	}
  	opticalTimeObservationAvailable() {
  		return (this.controller?.pendingObservations() ?? 0) > 0;
  	}
  	opticalTimeObservationCount() {
  		return this.controller?.pendingObservations() ?? 0;
  	}
  	opticalTimeDroppedCount() {
  		return this.controller?.droppedCount() ?? 0;
  	}
  	opticalTimeRejectedCount() {
  		return this.controller?.rejectedCount() ?? 0;
  	}
  	takeOpticalTimeObservation() {
  		this.observation = this.controller?.takeObservation();
  	}
  	latestOpticalTimeObservationJson() {
  		return this.observation ? JSON.stringify(this.observation) : "";
  	}
  	opticalTimeMinimumCalibrationSeconds() {
  		return this.requireController().minimumCalibrationSeconds();
  	}
  	featureEnabled(feature) {
  		return feature === "placementSolveV1" ? this.placementEnabled : this.opticalTimeEnabled;
  	}
  	requireOpticalTime() {
  		if (!this.opticalTimeEnabled) throw new TimeSpaceSyncError("invalid-payload", "Optical time sync v1 is disabled. Enable it before the project starts.");
  	}
  	requireDisplay() {
  		const acknowledgement = this.acknowledgement;
  		if (!acknowledgement) throw new TimeSpaceSyncError("photosensitivity-unacknowledged", "Acknowledge that the time pattern flashes before showing it.");
  		if (!this.display) this.display = new PatternDisplay({
  			clock: this.clock.monotonic(),
  			profile: this.profile,
  			acknowledgement
  		});
  		return this.display;
  	}
  	requireController() {
  		if (!this.controller) this.controller = new OpticalTimeController({
  			runtime: this.runtime,
  			clock: this.clock,
  			profile: this.profile,
  			analysisWidth: ANALYSIS_WIDTH,
  			analysisHeight: ANALYSIS_HEIGHT,
  			createFramePump: (lease) => new VideoFramePump({
  				element: lease.getFrameSource().element,
  				width: ANALYSIS_WIDTH,
  				height: ANALYSIS_HEIGHT,
  				clock: this.clock,
  				monotonic: this.clock.monotonic()
  			})
  		});
  		return this.controller;
  	}
  	publishCapability() {
  		const capability = createRuntimeCapability({
  			patternProfile: () => this.profile,
  			showPattern: (acknowledgement) => {
  				this.acknowledgement = acknowledgement;
  				this.requireDisplay().show();
  			},
  			hidePattern: () => this.hideTimePattern(),
  			patternShown: () => this.timePatternShown(),
  			patternRefreshUs: () => this.display?.refreshUs(),
  			startDecoder: (options) => this.requireController().start(options),
  			stopDecoder: () => this.stopOpticalTimeDecoder(),
  			decoderState: () => this.controller?.state() ?? "idle",
  			decoderError: () => this.controller?.errorCode() ?? "",
  			takeObservation: () => this.controller?.takeObservation(),
  			drainObservations: () => this.controller?.drainObservations() ?? []
  		});
  		this.runtime[runtimeCapabilityKey] = capability;
  	}
  	/**
  	* Takes the camera and the overlay down when the project does.
  	*
  	* A held camera and a full screen overlay both outlive the project unless
  	* something releases them, and the overlay takes no pointer events, so a
  	* project that stops with one up leaves the machine covered.
  	*/
  	watchRuntime() {
  		const stop = () => {
  			this.controller?.stop().catch(() => void 0);
  			this.display?.hide();
  			this.observation = void 0;
  			this.acknowledgement = void 0;
  		};
  		for (const event of [
  			"PROJECT_STOP_ALL",
  			"PROJECT_LOADED",
  			"RUNTIME_DISPOSED"
  		]) this.runtime.on?.(event, stop);
  	}
  	toScratchBlock(block) {
  		return {
  			opcode: block.opcode,
  			blockType: Scratch.BlockType[block.blockType],
  			text: Scratch.translate(block.text),
  			arguments: Object.fromEntries(Object.entries(block.arguments).map(([name, argument]) => [name, {
  				type: Scratch.ArgumentType[argument.type],
  				defaultValue: argument.defaultValue
  			}]))
  		};
  	}
  };
  //#endregion
  //#region src/index.ts
  if (extensionConfig.unsandboxed && !Scratch.extensions.unsandboxed) throw new Error(`${extensionConfig.name} must run unsandboxed.`);
  Scratch.extensions.register(new TimeSpaceSyncExtension());
  //#endregion

})(Scratch);
