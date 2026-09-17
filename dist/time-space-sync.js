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
  			"opcode": "setTimePatternProfile",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "use time pattern profile [PROFILE_ID]",
  			"description": "Chooses the pattern the display draws and the decoder reads: twtss.pattern.v1 (the default) or twtss.pattern.v2, which keeps the panel's brightness constant and has lit corner cells that placement can be measured from. Run it before showing the pattern or starting the decoder; once either exists with another profile the choice is refused and nothing changes. The choice lasts until the project stops.",
  			"arguments": { "PROFILE_ID": {
  				"type": "STRING",
  				"defaultValue": "twtss.pattern.v2"
  			} }
  		},
  		{
  			"opcode": "timePatternProfileError",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time pattern profile error",
  			"description": "Returns why the last profile choice was refused -- unknown-pattern-profile or pattern-profile-in-use -- or an empty string when it was accepted.",
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
  		},
  		{
  			"opcode": "estimateTimeCorrespondence",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "COMMAND",
  			"text": "estimate time correspondence",
  			"description": "Intersects the observations collected so far into one delay. A reading bounds the delay rather than measuring it, so the result is the set of delays every reading allows; when a strict majority cannot agree on any, nothing is published.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timeCorrespondenceJson",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time correspondence JSON",
  			"description": "Returns the last estimate as twtss/time-correspondence version 1 JSON, or an empty string when none has been made.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timeCorrespondenceError",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time correspondence error",
  			"description": "Returns why the last estimate could not be made, or an empty string when it succeeded.",
  			"arguments": {}
  		},
  		{
  			"opcode": "displayToTimestampDelayUs",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "display to timestamp delay us",
  			"description": "Returns how much later a frame is stamped than the pattern it shows was drawn, in microseconds. This is not a clock offset: an optical reading constrains only the sum of the clock offset and the two pipeline delays, and the components folded in are listed in the JSON.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timeCorrespondenceUncertaintyUs",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "REPORTER",
  			"text": "time correspondence uncertainty us",
  			"description": "Returns half the width of the delays the readings agree on. It shrinks as readings accumulate and never reaches zero, because one refresh of the display is never resolved.",
  			"arguments": {}
  		},
  		{
  			"opcode": "timeCorrespondenceCurrent",
  			"feature": "opticalTimeSyncV1",
  			"blockType": "BOOLEAN",
  			"text": "time correspondence current?",
  			"description": "Reports whether the last estimate still describes the present. Every estimate expires: one measured before the camera refocused or the clock was re-estimated is not a smaller measurement but a measurement of something else.",
  			"arguments": {}
  		},
  		{
  			"opcode": "defineReference",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "define reference [REFERENCE_JSON]",
  			"description": "Stores a twtss/placement-reference version 1 document: the measured position of each point on the reference, with how well each was measured. Corners are listed individually because an image thrown obliquely onto a wall is a general quadrilateral, and describing it by a width and a height bakes a scale error into every pose solved from it.",
  			"arguments": { "REFERENCE_JSON": {
  				"type": "STRING",
  				"defaultValue": "{}"
  			} }
  		},
  		{
  			"opcode": "addPlacementObservation",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "add placement observation [OBSERVATION_JSON]",
  			"description": "Stores where one camera saw the reference points, in unmirrored source pixels. Marks are matched to the reference by name; a mark whose name is unknown is dropped rather than matched by position.",
  			"arguments": { "OBSERVATION_JSON": {
  				"type": "STRING",
  				"defaultValue": "{}"
  			} }
  		},
  		{
  			"opcode": "setCameraModel",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "set camera model for [CAMERA_ID] to [MODEL_JSON]",
  			"description": "Supplies the intrinsics and distortion to interpret one camera pixels with, as {intrinsics, distortion} with optional intrinsicProfileId, imageWidth and imageHeight, which a solve checks each observation against. Build it with camera model JSON on the camera computer rather than scaling a calibration profile yourself: only Camera Source can tell a scaled capture from a cropped one.",
  			"arguments": {
  				"CAMERA_ID": {
  					"type": "STRING",
  					"defaultValue": "default"
  				},
  				"MODEL_JSON": {
  					"type": "STRING",
  					"defaultValue": "{}"
  				}
  			}
  		},
  		{
  			"opcode": "cameraModelJson",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "camera model JSON for [CAMERA_ID]",
  			"description": "Returns the camera model to pass to set camera model: the intrinsics Camera Source adapted to the current frame, joined with the distortion, profile id and frame size from the calibration profile it holds. Camera Source's own camera intrinsics JSON leaves the distortion out and is refused by set camera model. Empty when Camera Source publishes no calibration, has no profile for the camera, or cannot adapt it to the frame.",
  			"arguments": { "CAMERA_ID": {
  				"type": "STRING",
  				"defaultValue": "default"
  			} }
  		},
  		{
  			"opcode": "measurePatternCorners",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "measure pattern corners for [SECONDS] seconds",
  			"description": "Measures the four outer corners of the projected time pattern in this camera's full-resolution image and builds a twtss/placement-observation from them. Needs the optical time decoder running on twtss.pattern.v2 and a calibration profile for the camera in Camera Source. Each frame's corners are found from the two outer edges of each lit corner cell and the frames are combined by median. The corners are named in the orientation the pattern is drawn, which is only proven while the camera is rolled less than 45 degrees and not seeing the pattern mirrored. A failed measurement clears the previous observation.",
  			"arguments": { "SECONDS": {
  				"type": "NUMBER",
  				"defaultValue": 3
  			} }
  		},
  		{
  			"opcode": "patternCornerObservationJson",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "pattern corner observation JSON",
  			"description": "Returns the last corner measurement as twtss/placement-observation version 1 JSON, with points tl, tr, br and bl in unmirrored source pixels as observed, or an empty string when there is none.",
  			"arguments": {}
  		},
  		{
  			"opcode": "patternCornerError",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "pattern corner error",
  			"description": "Returns why the last corner measurement failed -- for example decoder-not-running, profile-without-fiducials, intrinsic-profile-missing, too-few-corner-frames, corners-unstable or orientation-unproven -- or an empty string when it succeeded.",
  			"arguments": {}
  		},
  		{
  			"opcode": "patternCornerSpreadPx",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "pattern corner spread px",
  			"description": "Returns how far the per-frame corners scattered around the measured ones, as an RMS distance in source pixels. Reported for a measurement refused as corners-unstable as well, so the operator can see by how much.",
  			"arguments": {}
  		},
  		{
  			"opcode": "patternReferenceJson",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "pattern reference JSON [REFERENCE_ID] corners [CORNERS] sigma [SIGMA_METERS] measured by [MEASURED_BY]",
  			"description": "Builds the twtss/placement-reference for the projected pattern from the outer corners of its lit corner cells, measured on the wall: tlX,tlY;trX,trY;brX,brY;blX,blY in metres on the wall plane, with any right-angled axes. The rectangularity residual is the largest distance from a corner to the best-fitting rectangle. Returns an empty string when a value is not a number, the corners do not trace a convex outline in that order, or measured by is not tape, laser or nominal.",
  			"arguments": {
  				"REFERENCE_ID": {
  					"type": "STRING",
  					"defaultValue": "wall-projection"
  				},
  				"CORNERS": {
  					"type": "STRING",
  					"defaultValue": "0,0;0.7,0;0.7,0.7;0,0.7"
  				},
  				"SIGMA_METERS": {
  					"type": "NUMBER",
  					"defaultValue": .002
  				},
  				"MEASURED_BY": {
  					"type": "STRING",
  					"defaultValue": "tape"
  				}
  			}
  		},
  		{
  			"opcode": "solvePlacement",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "solve placement for rig [RIG_ID]",
  			"description": "Places every camera that observed the reference and works out where they stand relative to each other. A camera whose view fits two poses about equally well is refused rather than placed: a small reprojection error says the pose explains the image, not that the image chose it.",
  			"arguments": { "RIG_ID": {
  				"type": "STRING",
  				"defaultValue": "rig"
  			} }
  		},
  		{
  			"opcode": "placementResultJson",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "placement result JSON",
  			"description": "Returns the last placement as twtss/placement-result version 1 JSON, or an empty string when none has been solved.",
  			"arguments": {}
  		},
  		{
  			"opcode": "placementError",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "placement error",
  			"description": "Returns why the last placement could not be solved, or an empty string when it succeeded.",
  			"arguments": {}
  		},
  		{
  			"opcode": "placementReprojectionRms",
  			"feature": "placementSolveV1",
  			"blockType": "REPORTER",
  			"text": "placement reprojection RMS for [CAMERA_ID]",
  			"description": "Returns the reprojection error of one camera placement, in pixels.",
  			"arguments": { "CAMERA_ID": {
  				"type": "STRING",
  				"defaultValue": "default"
  			} }
  		},
  		{
  			"opcode": "clearPlacement",
  			"feature": "placementSolveV1",
  			"blockType": "COMMAND",
  			"text": "clear placement observations",
  			"description": "Forgets the stored reference, observations, camera models and result.",
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
  //#endregion
  //#region src/contracts/spec.ts
  var IDENTIFIER_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$";
  /** An opaque, stable identifier: a camera slot, a reference, a profile. */
  function identifier() {
  	return {
  		kind: "string",
  		minLength: 1,
  		maxLength: 128,
  		pattern: IDENTIFIER_PATTERN
  	};
  }
  function text(maxLength = 1024) {
  	return {
  		kind: "string",
  		maxLength
  	};
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
  /**
  * A duration that cannot be negative, in microseconds.
  *
  * A negative duration is always a bug in the producer, never a measurement, so
  * it is rejected rather than clamped. Clamping would hide the producer's bug
  * behind a plausible zero.
  */
  function durationUs() {
  	return {
  		kind: "number",
  		integer: true,
  		minimum: 0
  	};
  }
  function timestampUs() {
  	return {
  		kind: "number",
  		integer: true
  	};
  }
  function enumOf(values) {
  	return {
  		kind: "enum",
  		values
  	};
  }
  function object(properties, optional = []) {
  	return {
  		kind: "object",
  		properties,
  		optional
  	};
  }
  function validate(spec, value) {
  	const issues = [];
  	check(spec, value, "", issues);
  	if (issues.length > 0) return {
  		ok: false,
  		issues
  	};
  	return {
  		ok: true,
  		value
  	};
  }
  function check(spec, value, path, issues) {
  	switch (spec.kind) {
  		case "const":
  			if (value !== spec.value) issues.push({
  				path,
  				message: `must be ${JSON.stringify(spec.value)}`
  			});
  			return;
  		case "boolean":
  			if (typeof value !== "boolean") issues.push({
  				path,
  				message: "must be a boolean"
  			});
  			return;
  		case "string":
  			checkString(spec, value, path, issues);
  			return;
  		case "enum":
  			if (typeof value !== "string" || !spec.values.includes(value)) issues.push({
  				path,
  				message: `must be one of ${spec.values.join(", ")}`
  			});
  			return;
  		case "number":
  			checkNumber(spec, value, path, issues);
  			return;
  		case "array":
  			checkArray(spec, value, path, issues);
  			return;
  		case "tuple":
  			checkTuple(spec, value, path, issues);
  			return;
  		case "object":
  			checkObject(spec, value, path, issues);
  			return;
  		case "nullable":
  			if (value !== null) check(spec.inner, value, path, issues);
  			return;
  	}
  }
  function checkString(spec, value, path, issues) {
  	if (typeof value !== "string") {
  		issues.push({
  			path,
  			message: "must be a string"
  		});
  		return;
  	}
  	if (spec.minLength !== void 0 && value.length < spec.minLength) issues.push({
  		path,
  		message: `must be at least ${spec.minLength} characters`
  	});
  	if (spec.maxLength !== void 0 && value.length > spec.maxLength) issues.push({
  		path,
  		message: `must be at most ${spec.maxLength} characters`
  	});
  	if (spec.pattern !== void 0 && !new RegExp(spec.pattern).test(value)) issues.push({
  		path,
  		message: `must match ${spec.pattern}`
  	});
  }
  function checkNumber(spec, value, path, issues) {
  	if (typeof value !== "number" || !Number.isFinite(value)) {
  		issues.push({
  			path,
  			message: "must be a finite number"
  		});
  		return;
  	}
  	if (spec.integer === true && !Number.isSafeInteger(value)) {
  		issues.push({
  			path,
  			message: "must be a safe integer"
  		});
  		return;
  	}
  	if (spec.minimum !== void 0 && value < spec.minimum) issues.push({
  		path,
  		message: `must be at least ${spec.minimum}`
  	});
  	if (spec.exclusiveMinimum !== void 0 && value <= spec.exclusiveMinimum) issues.push({
  		path,
  		message: `must be greater than ${spec.exclusiveMinimum}`
  	});
  	if (spec.maximum !== void 0 && value > spec.maximum) issues.push({
  		path,
  		message: `must be at most ${spec.maximum}`
  	});
  }
  function checkArray(spec, value, path, issues) {
  	if (!Array.isArray(value)) {
  		issues.push({
  			path,
  			message: "must be an array"
  		});
  		return;
  	}
  	if (spec.minItems !== void 0 && value.length < spec.minItems) issues.push({
  		path,
  		message: `must have at least ${spec.minItems} items`
  	});
  	if (spec.maxItems !== void 0 && value.length > spec.maxItems) issues.push({
  		path,
  		message: `must have at most ${spec.maxItems} items`
  	});
  	value.forEach((item, index) => check(spec.items, item, `${path}[${index}]`, issues));
  }
  function checkTuple(spec, value, path, issues) {
  	if (!Array.isArray(value) || value.length !== spec.length) {
  		issues.push({
  			path,
  			message: `must be an array of ${spec.length} items`
  		});
  		return;
  	}
  	value.forEach((item, index) => check(spec.items, item, `${path}[${index}]`, issues));
  }
  function checkObject(spec, value, path, issues) {
  	if (typeof value !== "object" || value === null || Array.isArray(value)) {
  		issues.push({
  			path,
  			message: "must be an object"
  		});
  		return;
  	}
  	const record = value;
  	const optional = new Set(spec.optional ?? []);
  	for (const [name, property] of Object.entries(spec.properties)) {
  		const child = path === "" ? name : `${path}.${name}`;
  		if (!(name in record)) {
  			if (!optional.has(name)) issues.push({
  				path: child,
  				message: "is required"
  			});
  			continue;
  		}
  		if (record[name] === void 0) {
  			issues.push({
  				path: child,
  				message: "must not be undefined"
  			});
  			continue;
  		}
  		check(property, record[name], child, issues);
  	}
  	for (const name of Object.keys(record)) if (!(name in spec.properties)) {
  		const child = path === "" ? name : `${path}.${name}`;
  		issues.push({
  			path: child,
  			message: "is not a known property"
  		});
  	}
  }
  integer({ minimum: 0 });
  /** True when two domain readings may be compared without conversion. */
  function sameClockDomain(left, right) {
  	return left.id === right.id && left.epoch === right.epoch;
  }
  finite();
  /** Rotation part in row-major 3x3 order. */
  function rotationOf(matrix) {
  	return [
  		0,
  		1,
  		2,
  		4,
  		5,
  		6,
  		8,
  		9,
  		10
  	].map((index) => at$1(matrix, index));
  }
  function translationOf(matrix) {
  	return [
  		3,
  		7,
  		11
  	].map((index) => at$1(matrix, index));
  }
  /** `bFromA` composed after `cFromB` gives `cFromA`. */
  function composeRigidTransforms(cFromB, bFromA) {
  	const result = new Array(16).fill(0);
  	for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
  		let total = 0;
  		for (let k = 0; k < 4; k += 1) total += at$1(cFromB, row * 4 + k) * at$1(bFromA, k * 4 + column);
  		result[row * 4 + column] = total;
  	}
  	return result;
  }
  /** Turns `bFromA` into `aFromB`, transposing the rotation. */
  function invertRigidTransform(matrix) {
  	const rotation = rotationOf(matrix);
  	const translation = translationOf(matrix);
  	const transposed = [
  		0,
  		3,
  		6,
  		1,
  		4,
  		7,
  		2,
  		5,
  		8
  	].map((index) => at$1(rotation, index));
  	const moved = [
  		0,
  		1,
  		2
  	].map((row) => {
  		let total = 0;
  		for (let k = 0; k < 3; k += 1) total += at$1(transposed, row * 3 + k) * at$1(translation, k);
  		return -total;
  	});
  	return [
  		at$1(transposed, 0),
  		at$1(transposed, 1),
  		at$1(transposed, 2),
  		at$1(moved, 0),
  		at$1(transposed, 3),
  		at$1(transposed, 4),
  		at$1(transposed, 5),
  		at$1(moved, 1),
  		at$1(transposed, 6),
  		at$1(transposed, 7),
  		at$1(transposed, 8),
  		at$1(moved, 2),
  		0,
  		0,
  		0,
  		1
  	];
  }
  /** Distance between the origins of the two frames, in metres. */
  function baselineMeters(left, right) {
  	const a = translationOf(invertRigidTransform(left));
  	const b = translationOf(invertRigidTransform(right));
  	return Math.hypot(at$1(a, 0) - at$1(b, 0), at$1(a, 1) - at$1(b, 1), at$1(a, 2) - at$1(b, 2));
  }
  function at$1(values, index) {
  	return values[index] ?? 0;
  }
  //#endregion
  //#region src/contracts/optical-time-observation.ts
  var OPTICAL_TIME_OBSERVATION_SCHEMA = "twtss/optical-time-observation";
  finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ exclusiveMinimum: 0 }), finite({ exclusiveMinimum: 0 });
  finite({ exclusiveMinimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 });
  integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 1 }), finite({ minimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 0 });
  //#endregion
  //#region src/contracts/time-correspondence.ts
  var TIME_CORRESPONDENCE_SCHEMA = "twtss/time-correspondence";
  integer({ minimum: 0 }), integer({ minimum: 0 }), integer({ minimum: 0 }), finite({
  	minimum: 0,
  	maximum: 1
  }), finite({ minimum: 0 }), finite(), finite({ minimum: 0 }), finite(), finite();
  /** True when the result still describes the present, on the observer's clock. */
  function isCurrent(result, nowUs) {
  	return nowUs < result.validUntilUs;
  }
  //#endregion
  //#region src/contracts/placement.ts
  var PLACEMENT_REFERENCE_SCHEMA = "twtss/placement-reference";
  var PLACEMENT_OBSERVATION_SCHEMA = "twtss/placement-observation";
  var PLACEMENT_RESULT_SCHEMA = "twtss/placement-result";
  var referencePointSpec = object({
  	id: identifier(),
  	x: finite(),
  	y: finite(),
  	z: finite(),
  	sigmaMeters: finite({ minimum: 0 })
  });
  var referenceDefinitionSpec = object({
  	schema: {
  		kind: "const",
  		value: PLACEMENT_REFERENCE_SCHEMA
  	},
  	version: {
  		kind: "const",
  		value: 1
  	},
  	referenceId: identifier(),
  	kind: enumOf([
  		"screen",
  		"projection",
  		"board",
  		"custom"
  	]),
  	points: {
  		kind: "array",
  		items: referencePointSpec,
  		minItems: 4,
  		maxItems: 1024
  	},
  	planarityResidualMeters: finite({ minimum: 0 }),
  	rectangularityResidualMeters: finite({ minimum: 0 }),
  	measuredBy: enumOf([
  		"tape",
  		"laser",
  		"nominal"
  	]),
  	notes: {
  		kind: "array",
  		items: text(),
  		maxItems: 32
  	}
  });
  var placementObservationSpec = object({
  	schema: {
  		kind: "const",
  		value: PLACEMENT_OBSERVATION_SCHEMA
  	},
  	version: {
  		kind: "const",
  		value: 1
  	},
  	cameraId: identifier(),
  	referenceId: identifier(),
  	intrinsicProfileId: identifier(),
  	imagePoints: {
  		kind: "array",
  		items: object({
  			id: identifier(),
  			u: finite({ minimum: 0 }),
  			v: finite({ minimum: 0 })
  		}),
  		minItems: 4,
  		maxItems: 1024
  	},
  	imageWidth: integer({ minimum: 1 }),
  	imageHeight: integer({ minimum: 1 }),
  	capturedAtUs: timestampUs(),
  	conditions: object({
  		frameRate: finite({ exclusiveMinimum: 0 }),
  		exposureTimeUs: durationUs()
  	}, ["frameRate", "exposureTimeUs"])
  });
  finite({ minimum: 0 }), finite({ minimum: 0 }), integer({ minimum: 4 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ minimum: 0 }), finite();
  function referenceDefinitionIssues(reference) {
  	const issues = [];
  	if (new Set(reference.points.map((point) => point.id)).size !== reference.points.length) issues.push("reference point ids must be unique");
  	if (reference.measuredBy === "nominal" && reference.points.some((p) => p.sigmaMeters === 0)) issues.push("a nominal reference must carry a non-zero measurement sigma");
  	return issues;
  }
  function placementObservationIssues(observation) {
  	const issues = [];
  	if (new Set(observation.imagePoints.map((point) => point.id)).size !== observation.imagePoints.length) issues.push("image point ids must be unique");
  	for (const point of observation.imagePoints) if (point.u > observation.imageWidth || point.v > observation.imageHeight) {
  		issues.push(`image point ${point.id} falls outside the image`);
  		break;
  	}
  	return issues;
  }
  function parseReferenceDefinition(value) {
  	return parseWith(referenceDefinitionSpec, value, referenceDefinitionIssues);
  }
  function parsePlacementObservation(value) {
  	return parseWith(placementObservationSpec, value, placementObservationIssues);
  }
  function parseWith(spec, value, extra) {
  	const result = validate(spec, value);
  	if (!result.ok) return result;
  	const issues = extra(result.value);
  	if (issues.length > 0) return {
  		ok: false,
  		issues: issues.map((message) => ({
  			path: "",
  			message
  		}))
  	};
  	return result;
  }
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
  	encoding: "absolute",
  	sampling: "grid",
  	fiducials: []
  });
  /**
  * A constant-luminance profile with corner fiducials.
  *
  * Each bit takes a pair of cells in opposite states, so every code lights
  * exactly the same number of cells and the panel's total output does not change
  * from one code to the next. That removes the whole-panel brightness pulsing,
  * and it also makes each bit a comparison between two neighbouring cells rather
  * than a reading against a learned level -- which is what made the v1 levels
  * vulnerable to uneven projection and to drift.
  *
  * Sixteen bits need thirty-two cells; with four corner fiducials that is a 6x6
  * grid. The cost is resolution: cells are smaller, so the panel has to be
  * larger in the camera image than v1 needed.
  */
  var PATTERN_PROFILE_V2 = Object.freeze({
  	id: "twtss.pattern.v2",
  	columns: 6,
  	rows: 6,
  	dataBits: 12,
  	checkBits: 4,
  	stepUs: 1e3,
  	encoding: "differential",
  	sampling: "quad",
  	fiducials: Object.freeze([
  		0,
  		5,
  		30,
  		35
  	])
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
  /** Cells available to the encoding, once the fiducials have taken theirs. */
  function dataCellCount(profile) {
  	return cellCount(profile) - profile.fiducials.length;
  }
  function requireUsableProfile(profile) {
  	const needed = (profile.dataBits + profile.checkBits) * cellsPerBit(profile);
  	if (profile.columns < 1 || profile.rows < 1) throw new TimeSpaceSyncError("invalid-payload", "A pattern needs at least one cell.");
  	if (profile.dataBits < 1 || profile.checkBits < 1) throw new TimeSpaceSyncError("invalid-payload", "A pattern needs both data and check bits.");
  	if (profile.stepUs < 1 || !Number.isSafeInteger(profile.stepUs)) throw new TimeSpaceSyncError("invalid-payload", "The pattern step must be whole microseconds.");
  	for (const index of profile.fiducials) if (!Number.isInteger(index) || index < 0 || index >= cellCount(profile)) throw new TimeSpaceSyncError("invalid-payload", `Fiducial cell ${index} is outside the ${profile.columns}x${profile.rows} grid.`);
  	if (new Set(profile.fiducials).size !== profile.fiducials.length) throw new TimeSpaceSyncError("invalid-payload", "Fiducial cells must be distinct.");
  	if (needed > dataCellCount(profile)) throw new TimeSpaceSyncError("invalid-payload", `The ${profile.columns}x${profile.rows} grid leaves ${dataCellCount(profile)} cells for data but the encoding needs ${needed}.`);
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
  	const payload = [];
  	for (const bit of bits) {
  		payload.push(bit);
  		if (profile.encoding === "differential") payload.push(!bit);
  	}
  	while (payload.length < dataCellCount(profile)) payload.push(false);
  	return layOut(payload, profile);
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
  	const fiducials = new Set(profile.fiducials);
  	for (const index of fiducials) if (cells[index] !== true) return void 0;
  	const payload = cells.filter((_, index) => !fiducials.has(index));
  	const stride = cellsPerBit(profile);
  	const bits = [];
  	for (let index = 0; index < profile.dataBits + profile.checkBits; index += 1) {
  		const bit = readBit(payload, index * stride, profile);
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
  /** Places the payload cells around the fiducials, in row-major order. */
  function layOut(payload, profile) {
  	const fiducials = new Set(profile.fiducials);
  	const cells = [];
  	let next = 0;
  	for (let index = 0; index < cellCount(profile); index += 1) {
  		if (fiducials.has(index)) {
  			cells.push(true);
  			continue;
  		}
  		cells.push(payload[next] === true);
  		next += 1;
  	}
  	return cells;
  }
  function normalizeCode(code, profile) {
  	const count = codeCount(profile);
  	return (Math.trunc(code) % count + count) % count;
  }
  function bitAt(value, bit) {
  	return (value >> bit & 1) === 1;
  }
  //#endregion
  //#region src/optical-time/homography.ts
  /**
  * The map taking the unit square onto a quadrilateral.
  *
  * Closed form rather than a least-squares fit: four correspondences determine a
  * homography exactly, so there is nothing to minimise and no iteration to
  * converge.
  */
  function homographyFromUnitSquare(quad) {
  	const [p0, p1, p2, p3] = quad;
  	const dx1 = p1.x - p2.x;
  	const dx2 = p3.x - p2.x;
  	const dy1 = p1.y - p2.y;
  	const dy2 = p3.y - p2.y;
  	const sx = p0.x - p1.x + p2.x - p3.x;
  	const sy = p0.y - p1.y + p2.y - p3.y;
  	if (sx === 0 && sy === 0) return [
  		p1.x - p0.x,
  		p2.x - p1.x,
  		p0.x,
  		p1.y - p0.y,
  		p2.y - p1.y,
  		p0.y,
  		0,
  		0,
  		1
  	];
  	const denominator = dx1 * dy2 - dx2 * dy1;
  	if (denominator === 0) return [];
  	const g = (sx * dy2 - dx2 * sy) / denominator;
  	const h = (dx1 * sy - sx * dy1) / denominator;
  	return [
  		p1.x - p0.x + g * p1.x,
  		p3.x - p0.x + h * p3.x,
  		p0.x,
  		p1.y - p0.y + g * p1.y,
  		p3.y - p0.y + h * p3.y,
  		p0.y,
  		g,
  		h,
  		1
  	];
  }
  function applyHomography(homography, x, y) {
  	if (homography.length !== 9) return void 0;
  	const w = at(homography, 6) * x + at(homography, 7) * y + at(homography, 8);
  	if (w === 0 || !Number.isFinite(w)) return void 0;
  	return {
  		x: (at(homography, 0) * x + at(homography, 1) * y + at(homography, 2)) / w,
  		y: (at(homography, 3) * x + at(homography, 4) * y + at(homography, 5)) / w
  	};
  }
  function invertHomography(homography) {
  	if (homography.length !== 9) return [];
  	const [a, b, c, d, e, f, g, h, i] = [
  		0,
  		1,
  		2,
  		3,
  		4,
  		5,
  		6,
  		7,
  		8
  	].map((index) => at(homography, index));
  	const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  	if (determinant === 0 || !Number.isFinite(determinant)) return [];
  	return [
  		(e * i - f * h) / determinant,
  		(c * h - b * i) / determinant,
  		(b * f - c * e) / determinant,
  		(f * g - d * i) / determinant,
  		(a * i - c * g) / determinant,
  		(c * d - a * f) / determinant,
  		(d * h - e * g) / determinant,
  		(b * g - a * h) / determinant,
  		(a * e - b * d) / determinant
  	];
  }
  /**
  * The four corners of a region, in unit-square order.
  *
  * Two candidate quadrilaterals are built and the larger one wins. The diagonal
  * extremes find the corners of a panel the camera sees square on; the axis
  * extremes find them when it sees the panel turned about 45 degrees. Each is
  * degenerate exactly where the other is sharp: along an edge of a
  * 45-degree-rotated square, `x + y` is constant, so the diagonal extremes pick
  * an arbitrary point on that edge and can collapse two corners onto one. Taking
  * whichever quadrilateral encloses more area avoids a detector that works at
  * every angle except the middle of its range.
  *
  * Which corner is treated as the pattern's own origin still follows from the
  * image, so a panel rotated by a whole quarter turn is read with its cells
  * transposed. Recovering that needs a pattern whose corners are not all alike.
  */
  function cornersOf(points) {
  	if (points.length < 4) return void 0;
  	return [extremesBy(points, (point) => point.x + point.y, (point) => point.x - point.y), extremesBy(points, (point) => point.y, (point) => point.x)].map((quad) => ({
  		quad,
  		area: quadArea(quad)
  	})).filter((entry) => entry.area > 0).sort((left, right) => right.area - left.area)[0]?.quad;
  }
  /**
  * The extremes of two functionals, ordered so the quadrilateral does not cross.
  *
  * `first` runs from the start corner to the opposite one; `second` separates
  * the two remaining corners.
  */
  function extremesBy(points, first, second) {
  	let start = points[0];
  	let end = points[0];
  	let low = points[0];
  	let high = points[0];
  	for (const point of points) {
  		if (first(point) < first(start)) start = point;
  		if (first(point) > first(end)) end = point;
  		if (second(point) > second(high)) high = point;
  		if (second(point) < second(low)) low = point;
  	}
  	return [
  		start,
  		high,
  		end,
  		low
  	];
  }
  /** Twice the signed area; positive for corners in the expected order. */
  function quadArea(quad) {
  	let total = 0;
  	for (let index = 0; index < 4; index += 1) {
  		const current = quad[index];
  		const next = quad[(index + 1) % 4];
  		total += current.x * next.y - next.x * current.y;
  	}
  	return total / 2;
  }
  function at(values, index) {
  	return values[index] ?? 0;
  }
  //#endregion
  //#region src/optical-time/line-fit.ts
  /**
  * The total least squares line: the one minimising perpendicular distances.
  *
  * Ordinary least squares minimises vertical distances, which is wrong for an
  * edge that can run at any angle and undefined for a vertical one.
  */
  function fitLine(points) {
  	if (points.length < 2) return void 0;
  	let meanX = 0;
  	let meanY = 0;
  	for (const point of points) {
  		meanX += point.x;
  		meanY += point.y;
  	}
  	meanX /= points.length;
  	meanY /= points.length;
  	let xx = 0;
  	let xy = 0;
  	let yy = 0;
  	for (const point of points) {
  		const dx = point.x - meanX;
  		const dy = point.y - meanY;
  		xx += dx * dx;
  		xy += dx * dy;
  		yy += dy * dy;
  	}
  	const angle = .5 * Math.atan2(2 * xy, xx - yy);
  	const line = {
  		point: {
  			x: meanX,
  			y: meanY
  		},
  		direction: {
  			x: Math.cos(angle),
  			y: Math.sin(angle)
  		}
  	};
  	if (!(xx + yy > 0)) return void 0;
  	let squares = 0;
  	for (const point of points) squares += signedDistance(line, point) ** 2;
  	return {
  		line,
  		rms: Math.sqrt(squares / points.length),
  		count: points.length
  	};
  }
  /**
  * Fits, drops the points far from the fit, and fits again.
  *
  * An edge sampled across a gap between cells, or through a speck of noise,
  * yields a point that is not on the edge at all. One such point moves a least
  * squares line a long way, so points further than `trimDistance` from the
  * previous fit are left out of the next.
  */
  function robustFitLine(points, trimDistance, passes = 2) {
  	let fit = fitLine(points);
  	for (let pass = 0; pass < passes && fit; pass += 1) {
  		const current = fit.line;
  		const kept = points.filter((point) => Math.abs(signedDistance(current, point)) <= trimDistance);
  		if (kept.length === points.length) break;
  		fit = fitLine(kept);
  	}
  	return fit;
  }
  /** Perpendicular distance, positive to the left of the direction in image axes. */
  function signedDistance(line, point) {
  	return (point.x - line.point.x) * -line.direction.y + (point.y - line.point.y) * line.direction.x;
  }
  /**
  * Where two lines meet, or undefined when they are too near parallel to say.
  *
  * `minimumSine` bounds the angle between them: two nearly parallel edges meet
  * at a point that moves a long way for a small change in either, so a corner
  * found that way is not a measurement.
  */
  function intersectLines(a, b, minimumSine = .2) {
  	const cross = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
  	if (!(Math.abs(cross) >= minimumSine)) return void 0;
  	const dx = b.point.x - a.point.x;
  	const dy = b.point.y - a.point.y;
  	const t = (dx * b.direction.y - dy * b.direction.x) / cross;
  	return {
  		x: a.point.x + t * a.direction.x,
  		y: a.point.y + t * a.direction.y
  	};
  }
  /** The line moved sideways by `distance`, in the direction `signedDistance` counts positive. */
  function offsetLine(line, distance) {
  	return {
  		point: {
  			x: line.point.x - line.direction.y * distance,
  			y: line.point.y + line.direction.x * distance
  		},
  		direction: line.direction
  	};
  }
  //#endregion
  //#region src/optical-time/pattern-geometry.ts
  /**
  * Where the lit parts of the panel are, in the panel's own unit square.
  *
  * Shared by the display, which draws them, and by everything that has to find
  * them again in a camera image. A second copy of the gap ratio in a detector
  * would drift from the one the display draws with, and nothing would fail: the
  * corners would simply be found a little way from where they are.
  */
  /** Share of each cell left as a gap between neighbouring cells. */
  var PATTERN_CELL_GAP_RATIO = .08;
  /**
  * The panel's outer corners, named in the display's own orientation.
  *
  * `tl` is the top-left of the pattern as it is drawn, whatever the camera makes
  * of it. Row-major and clockwise on screen, which is the order the unit square
  * uses: (0,0), (1,0), (1,1), (0,1).
  */
  var PATTERN_CORNER_IDS = [
  	"tl",
  	"tr",
  	"br",
  	"bl"
  ];
  /**
  * How far the lit outline sits inside the panel square, per axis.
  *
  * Each cell is drawn inset by half a gap, so the outer edge of a corner cell
  * -- the edge a camera sees and a tape measures -- lies half a gap inside the
  * square the cells are laid out on. The data cells along an edge are inset by
  * the same amount, which is why the edge of the changing region and the outer
  * edge of a fiducial lie on one line.
  */
  function litOutlineInset(profile) {
  	return {
  		x: PATTERN_CELL_GAP_RATIO / 2 / profile.columns,
  		y: PATTERN_CELL_GAP_RATIO / 2 / profile.rows
  	};
  }
  //#endregion
  //#region src/optical-time/corner-refinement.ts
  /** The same allowance for the second pass, which starts from a measured corner. */
  var REFINED_CORNER_UNCERTAINTY_PX = 1.5;
  /** Pixels either side of the expected edge beyond the corner uncertainty. */
  var PROFILE_EXTRA_PX = 4;
  var PROFILE_STEP_PX = .5;
  /**
  * The smallest light-to-dark step, in luminance units, an edge must show.
  *
  * Matches the decoder's own contrast floor: an edge the decoder could not read
  * a cell across is not one to locate a corner on.
  */
  var MINIMUM_EDGE_CONTRAST = 24;
  /** Scanlines per edge; more cost time and add little once the edge is covered. */
  var SCANLINES_PER_EDGE = 32;
  var MINIMUM_EDGE_POINTS = 8;
  /**
  * The largest RMS distance of edge points from their fitted line.
  *
  * A straight edge seen through ordinary sensor noise fits to a tenth of a pixel
  * or so. Half a pixel means the edge is not straight where it was sampled --
  * something is in front of it, the frame is smeared by motion, or the window
  * caught part of a neighbouring cell -- and a corner built on it is not a
  * measurement.
  */
  var MAXIMUM_EDGE_RMS_PX = .5;
  /** Edge points further than this from the first fit are dropped from the second. */
  var EDGE_TRIM_PX = 1;
  /**
  * The smallest angle two edges may meet at, as a sine: about 20 degrees.
  *
  * A square panel seen at any usable angle has corners far wider than this.
  * Narrower means the view is so oblique that a small error along either edge
  * moves the corner a long way.
  */
  var MINIMUM_CORNER_SINE = .34;
  /** Largest window read for one corner, per edge, so a huge panel costs no more. */
  var MAXIMUM_EDGE_SPAN_PX = 96;
  /** Where along the lit edge scanlines start and stop, as shares of its length. */
  var EDGE_START_SHARE = .1;
  var EDGE_END_SHARE = .85;
  var MINIMUM_EDGE_START_PX = 2;
  /**
  * Maps analysis coordinates onto source coordinates.
  *
  * The analysis frame is the whole source drawn into a smaller canvas, possibly
  * with a different aspect, so each axis scales on its own. Analysis positions
  * are pixel indices, whose centres are half a pixel in from their edges; the
  * half pixel is added before scaling and taken back afterwards only in the
  * analysis units, which is what places the result in the source frame's
  * corner-origin coordinates.
  */
  function sourceQuadFromAnalysis(quad, analysis, source) {
  	const sx = source.width / analysis.width;
  	const sy = source.height / analysis.height;
  	return quad.map((point) => ({
  		x: (point.x + .5) * sx,
  		y: (point.y + .5) * sy
  	}));
  }
  /**
  * Refines all four outer corners of a panel.
  *
  * `panelQuad` is the panel square in source coordinates in the decoder's order,
  * which starts at the display's top-left (see `startAtTopLeft`). Every corner
  * must refine for the result to count: a panel with three good corners and a
  * guessed fourth gives a pose that is wrong by exactly the guess.
  */
  function refinePanelCorners(reader, panelQuad, profile, source, coarseUncertaintyPx) {
  	const homography = homographyFromUnitSquare(panelQuad);
  	if (homography.length !== 9) return {
  		ok: false,
  		reason: "corner-geometry"
  	};
  	const corners = [];
  	let worst = 0;
  	for (let index = 0; index < 4; index += 1) {
  		const plan = planCorner(homography, profile, index);
  		if (!plan) return {
  			ok: false,
  			reason: "corner-geometry"
  		};
  		const result = refineCorner(reader, plan, source, coarseUncertaintyPx);
  		if (!result.ok) return result;
  		corners.push(result.corner);
  		worst = Math.max(worst, result.rms);
  	}
  	return {
  		ok: true,
  		corners,
  		worstEdgeRmsPx: worst
  	};
  }
  /** Where a corner should be and which way its edges run, from the coarse panel. */
  function planCorner(homography, profile, index) {
  	const inset = litOutlineInset(profile);
  	const signX = index === 0 || index === 3 ? 1 : -1;
  	const signY = index === 0 || index === 1 ? 1 : -1;
  	const unit = {
  		x: signX > 0 ? inset.x : 1 - inset.x,
  		y: signY > 0 ? inset.y : 1 - inset.y
  	};
  	const cellX = (1 - PATTERN_CELL_GAP_RATIO) / profile.columns;
  	const cellY = (1 - PATTERN_CELL_GAP_RATIO) / profile.rows;
  	const predicted = applyHomography(homography, unit.x, unit.y);
  	const endX = applyHomography(homography, unit.x + signX * cellX, unit.y);
  	const endY = applyHomography(homography, unit.x, unit.y + signY * cellY);
  	if (!predicted || !endX || !endY) return void 0;
  	const lengthX = Math.hypot(endX.x - predicted.x, endX.y - predicted.y);
  	const lengthY = Math.hypot(endY.x - predicted.x, endY.y - predicted.y);
  	if (!(lengthX > 0) || !(lengthY > 0)) return void 0;
  	return {
  		predicted,
  		along: [{
  			x: (endX.x - predicted.x) / lengthX,
  			y: (endX.y - predicted.y) / lengthX
  		}, {
  			x: (endY.x - predicted.x) / lengthY,
  			y: (endY.y - predicted.y) / lengthY
  		}],
  		length: [lengthX, lengthY]
  	};
  }
  function refineCorner(reader, plan, source, coarseUncertaintyPx) {
  	const uncertainty = Math.max(REFINED_CORNER_UNCERTAINTY_PX, coarseUncertaintyPx);
  	const spans = plan.length.map((length) => Math.min(MAXIMUM_EDGE_SPAN_PX, length * EDGE_END_SHARE - uncertainty));
  	if (spans[0] <= 4 || spans[1] <= 4) return {
  		ok: false,
  		reason: "too-few-edge-points"
  	};
  	const reach = uncertainty + PROFILE_EXTRA_PX;
  	const region = regionAround(plan, spans, reach, source);
  	if (!region) return {
  		ok: false,
  		reason: "outside-image"
  	};
  	const frame = reader.read(region);
  	if (!frame || frame.width !== region.width || frame.height !== region.height) return {
  		ok: false,
  		reason: "outside-image"
  	};
  	const image = {
  		frame,
  		region
  	};
  	let corner = plan.predicted;
  	let along = plan.along;
  	let reachNow = reach;
  	let result = {
  		ok: false,
  		reason: "too-few-edge-points"
  	};
  	for (let pass = 0; pass < 2; pass += 1) {
  		const lines = [];
  		let rms = 0;
  		for (let edge = 0; edge < 2; edge += 1) {
  			const direction = along[edge];
  			const inward = along[1 - edge];
  			const fit = locateEdge(image, corner, direction, inward, spans[edge], plan.length[edge], reachNow);
  			if (!fit.ok) return fit;
  			lines.push(fit.line);
  			rms = Math.max(rms, fit.rms);
  		}
  		const [first, second] = lines;
  		const meeting = intersectLines(first, second, MINIMUM_CORNER_SINE);
  		if (!meeting) return {
  			ok: false,
  			reason: "corner-geometry"
  		};
  		if (Math.hypot(meeting.x - corner.x, meeting.y - corner.y) > reachNow) return {
  			ok: false,
  			reason: "corner-geometry"
  		};
  		corner = meeting;
  		along = [orient(first.direction, along[0]), orient(second.direction, along[1])];
  		reachNow = 5.5;
  		result = {
  			ok: true,
  			corner,
  			rms
  		};
  	}
  	if (!result.ok) return result;
  	if (corner.x < 0 || corner.y < 0 || corner.x > source.width || corner.y > source.height) return {
  		ok: false,
  		reason: "outside-image"
  	};
  	return result;
  }
  /**
  * Finds one straight edge running from the corner along `direction`.
  *
  * Each scanline crosses the edge at right angles, from outside the panel to
  * inside, and the edge is placed where the profile crosses halfway between the
  * dark and light levels measured at its own two ends. The halfway crossing is
  * where a symmetric blur leaves a step edge, so the estimate does not move with
  * focus; the levels are local, so uneven projection does not move it either.
  */
  function locateEdge(image, corner, direction, inwardHint, span, length, reach) {
  	let normal = {
  		x: -direction.y,
  		y: direction.x
  	};
  	if (normal.x * inwardHint.x + normal.y * inwardHint.y < 0) normal = {
  		x: -normal.x,
  		y: -normal.y
  	};
  	const start = Math.max(MINIMUM_EDGE_START_PX, length * EDGE_START_SHARE);
  	if (span <= start) return {
  		ok: false,
  		reason: "too-few-edge-points"
  	};
  	const steps = Math.ceil(reach * 2 / PROFILE_STEP_PX);
  	const points = [];
  	let contrastFailures = 0;
  	for (let line = 0; line < SCANLINES_PER_EDGE; line += 1) {
  		const t = start + (span - start) * line / 31;
  		const base = {
  			x: corner.x + direction.x * t,
  			y: corner.y + direction.y * t
  		};
  		const values = [];
  		for (let step = 0; step <= steps; step += 1) {
  			const s = -reach + step * PROFILE_STEP_PX;
  			const value = bilinear(image, base.x + normal.x * s, base.y + normal.y * s);
  			if (value === void 0) break;
  			values.push(value);
  		}
  		if (values.length !== steps + 1) continue;
  		const dark = mean(values.slice(0, 3));
  		const light = mean(values.slice(-3));
  		if (light - dark < MINIMUM_EDGE_CONTRAST) {
  			contrastFailures += 1;
  			continue;
  		}
  		const crossing = crossingNearestCentre(values, (dark + light) / 2, reach);
  		if (crossing === void 0) continue;
  		points.push({
  			x: base.x + normal.x * crossing,
  			y: base.y + normal.y * crossing
  		});
  	}
  	if (points.length < MINIMUM_EDGE_POINTS) return {
  		ok: false,
  		reason: contrastFailures > SCANLINES_PER_EDGE / 2 ? "low-contrast" : "too-few-edge-points"
  	};
  	const fit = robustFitLine(points, EDGE_TRIM_PX);
  	if (!fit || fit.count < MINIMUM_EDGE_POINTS) return {
  		ok: false,
  		reason: "too-few-edge-points"
  	};
  	if (fit.rms > MAXIMUM_EDGE_RMS_PX) return {
  		ok: false,
  		reason: "edge-not-straight"
  	};
  	return {
  		ok: true,
  		line: fit.line,
  		rms: fit.rms
  	};
  }
  /**
  * The dark-to-light crossing of `level` closest to the expected edge.
  *
  * Returned as a distance along the scanline from the expected edge. Linear
  * between samples: the samples are half a pixel apart on an image that is
  * itself interpolated, and a higher-order fit would be fitting the
  * interpolation.
  */
  function crossingNearestCentre(values, level, reach) {
  	let best;
  	for (let index = 1; index < values.length; index += 1) {
  		const before = values[index - 1];
  		const after = values[index];
  		if (!(before < level && after >= level)) continue;
  		const share = (level - before) / (after - before);
  		const s = -reach + (index - 1 + share) * PROFILE_STEP_PX;
  		if (best === void 0 || Math.abs(s) < Math.abs(best)) best = s;
  	}
  	return best;
  }
  /** The window holding every sample either pass can take, or undefined when it leaves the image. */
  function regionAround(plan, spans, reach, source) {
  	const [a, b] = plan.along;
  	const grow = reach * 2 + 2;
  	const xs = [];
  	const ys = [];
  	for (const [direction, span] of [[a, spans[0]], [b, spans[1]]]) for (const t of [0, span]) {
  		xs.push(plan.predicted.x + direction.x * t);
  		ys.push(plan.predicted.y + direction.y * t);
  	}
  	const minX = Math.floor(Math.min(...xs) - grow);
  	const minY = Math.floor(Math.min(...ys) - grow);
  	const maxX = Math.ceil(Math.max(...xs) + grow);
  	const maxY = Math.ceil(Math.max(...ys) + grow);
  	if (minX < 0 || minY < 0 || maxX > source.width || maxY > source.height) return void 0;
  	return {
  		x: minX,
  		y: minY,
  		width: maxX - minX,
  		height: maxY - minY
  	};
  }
  function bilinear(image, x, y) {
  	const { frame, region } = image;
  	const fx = x - region.x - .5;
  	const fy = y - region.y - .5;
  	const x0 = Math.floor(fx);
  	const y0 = Math.floor(fy);
  	if (x0 < 0 || y0 < 0 || x0 + 1 >= frame.width || y0 + 1 >= frame.height) return void 0;
  	const ax = fx - x0;
  	const ay = fy - y0;
  	const row = y0 * frame.width;
  	const next = row + frame.width;
  	const top = frame.data[row + x0] * (1 - ax) + frame.data[row + x0 + 1] * ax;
  	const bottom = frame.data[next + x0] * (1 - ax) + frame.data[next + x0 + 1] * ax;
  	return top * (1 - ay) + bottom * ay;
  }
  function orient(direction, hint) {
  	return direction.x * hint.x + direction.y * hint.y >= 0 ? direction : {
  		x: -direction.x,
  		y: -direction.y
  	};
  }
  function mean(values) {
  	return values.reduce((total, value) => total + value, 0) / values.length;
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
  //#region src/optical-time/quad-sampling.ts
  /** Points taken across each cell, per axis, when averaging it. */
  var CELL_TAPS = 3;
  /** Share of the cell left untouched at each edge. */
  var CELL_INSET = .25;
  /**
  * Reads each cell through the panel's own coordinates.
  *
  * The taps are placed in pattern space and mapped into the image, so a cell is
  * sampled from the part of the image that actually shows it whatever the camera
  * angle or the projector's keystone. Mapping the other way -- carving the image
  * into equal boxes -- is what makes an oblique view sample its neighbours.
  */
  function sampleCellsThroughQuad(frame, quad, profile) {
  	const homography = homographyFromUnitSquare(quad);
  	if (homography.length !== 9) return void 0;
  	const values = [];
  	for (let row = 0; row < profile.rows; row += 1) for (let column = 0; column < profile.columns; column += 1) {
  		let total = 0;
  		let count = 0;
  		for (let tapY = 0; tapY < CELL_TAPS; tapY += 1) for (let tapX = 0; tapX < CELL_TAPS; tapX += 1) {
  			const unit = cellTap(column, row, tapX, tapY, profile);
  			const point = applyHomography(homography, unit.x, unit.y);
  			if (!point) continue;
  			const sample = pixelAt(frame, point);
  			if (sample === void 0) continue;
  			total += sample;
  			count += 1;
  		}
  		if (count === 0) return void 0;
  		values.push(total / count);
  	}
  	return values.length === cellCount(profile) ? values : void 0;
  }
  function cellTap(column, row, tapX, tapY, profile) {
  	const span = 1 - CELL_INSET * 2;
  	const offset = CELL_INSET + span * tapX / 2;
  	const offsetY = CELL_INSET + span * tapY / 2;
  	return {
  		x: (column + offset) / profile.columns,
  		y: (row + offsetY) / profile.rows
  	};
  }
  function pixelAt(frame, point) {
  	const x = Math.round(point.x);
  	const y = Math.round(point.y);
  	if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return void 0;
  	return frame.data[y * frame.width + x];
  }
  //#endregion
  //#region src/optical-time/panel-detector.ts
  var defaultOptions = {
  	minimumRange: 40,
  	rangeRatio: .5,
  	minimumCellPixels: 3,
  	minimumFillRatio: .5,
  	minimumBoxFillRatio: .35,
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
  		if (frame.width !== this.width || frame.height !== this.height) throw new TimeSpaceSyncError("frame-size-mismatch", `The camera delivered a ${frame.width}x${frame.height} frame but the decoder is analysing ${this.width}x${this.height}.`);
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
  		closeMask(mask, this.width, this.height, MASK_CLOSING_RADIUS);
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
  		const extremes = cornersOf(best.points);
  		if (!extremes) return {
  			ok: false,
  			reason: "wrong-shape"
  		};
  		if (best.area / Math.abs(quadArea(extremes)) < settings.minimumFillRatio || best.area / (width * height) < settings.minimumBoxFillRatio) return {
  			ok: false,
  			reason: "not-solid"
  		};
  		let quad = extremes;
  		if (profile.fiducials.length > 0) {
  			const outline = fitPanelOutline(best.boundary, extremes);
  			if (!outline) return {
  				ok: false,
  				reason: "wrong-shape"
  			};
  			quad = startAtTopLeft(panelSquareFromOutline(outline, profile));
  		}
  		return {
  			ok: true,
  			panel: {
  				x: best.minX,
  				y: best.minY,
  				width,
  				height
  			},
  			quad
  		};
  	}
  };
  /**
  * Analysis pixels bridged between neighbouring cells: gaps up to twice this.
  *
  * The gap is 8% of a cell, so two pixels either side covers every panel whose
  * cells are under fifty analysis pixels, which is larger than a panel that
  * still fits in the frame. Two separate flickering things closer than four
  * pixels are not told apart, which at this resolution they could not be anyway.
  */
  var MASK_CLOSING_RADIUS = 2;
  /**
  * Morphological closing with a square window, in place.
  *
  * Dilation then erosion, each separable into a row pass and a column pass.
  * Outside the image counts as set during the erosion, so a panel touching the
  * frame edge is not eaten away from that side.
  */
  function closeMask(mask, width, height, radius) {
  	const scratch = new Uint8Array(mask.length);
  	sweep(mask, scratch, width, height, radius, "dilate", "rows");
  	sweep(scratch, mask, width, height, radius, "dilate", "columns");
  	sweep(mask, scratch, width, height, radius, "erode", "rows");
  	sweep(scratch, mask, width, height, radius, "erode", "columns");
  }
  /**
  * One pass of a running maximum or minimum along rows or columns.
  *
  * The window is tracked as a running count of set pixels, so a pass costs the
  * same whatever the radius.
  */
  function sweep(input, output, width, height, radius, operation, direction) {
  	const dilate = operation === "dilate";
  	const rows = direction === "rows";
  	const lines = rows ? height : width;
  	const length = rows ? width : height;
  	const window = radius * 2 + 1;
  	const outside = dilate ? 0 : 1;
  	for (let line = 0; line < lines; line += 1) {
  		const step = rows ? 1 : width;
  		const base = rows ? line * width : line;
  		const valueAt = (position) => position < 0 || position >= length ? outside : input[base + position * step];
  		let count = 0;
  		for (let position = -radius; position <= radius; position += 1) count += valueAt(position);
  		for (let position = 0; position < length; position += 1) {
  			output[base + position * step] = dilate ? count > 0 ? 1 : 0 : count === window ? 1 : 0;
  			count += valueAt(position + radius + 1) - valueAt(position - radius);
  		}
  	}
  }
  /** Share of an edge, at each end, not used to fit it: the notches live there. */
  var OUTLINE_EDGE_MARGIN = .2;
  /**
  * How far from an edge, in unit-square terms, a boundary point may lie and count for it.
  *
  * Wide on the first pass, because the first estimate comes from the notch
  * corners and can have an edge a whole cell inside the real one. Measured in
  * that shrunken estimate's own units a cell is a quarter of it, and a small
  * panel adds a pixel or two of rounding on top. Narrow afterwards, so the
  * notch sides and anything else near the panel stop contributing once the
  * edges are roughly known.
  */
  var OUTLINE_FIRST_EDGE_BAND = .45;
  var OUTLINE_EDGE_BAND = .1;
  /** Analysis pixels beyond which a boundary point is dropped from an edge fit. */
  var OUTLINE_TRIM_PIXELS = 1.5;
  var OUTLINE_PASSES = 3;
  var OUTLINE_MINIMUM_EDGE_POINTS = 4;
  /**
  * The quadrilateral whose edges the changing region's boundary follows.
  *
  * Each boundary pixel is assigned to the nearest edge of the current estimate,
  * but only from the middle of that edge: near its ends are the notches, whose
  * sides run across the edge rather than along it. Lines are fitted to each
  * edge and intersected, and the result is used to assign the points again, so
  * a first estimate a whole cell out at each corner still settles on the panel.
  */
  function fitPanelOutline(boundary, initial) {
  	let quad = initial;
  	for (let pass = 0; pass < OUTLINE_PASSES; pass += 1) {
  		const inverse = invertHomography(homographyFromUnitSquare(quad));
  		if (inverse.length !== 9) return void 0;
  		const edges = [
  			[],
  			[],
  			[],
  			[]
  		];
  		for (const point of boundary) {
  			const unit = applyHomography(inverse, point.x, point.y);
  			if (!unit) continue;
  			const candidates = [
  				[Math.abs(unit.y), unit.x],
  				[Math.abs(1 - unit.x), unit.y],
  				[Math.abs(1 - unit.y), unit.x],
  				[Math.abs(unit.x), unit.y]
  			];
  			let nearest = 0;
  			candidates.forEach(([distance], index) => {
  				if (distance < candidates[nearest][0]) nearest = index;
  			});
  			const [distance, along] = candidates[nearest];
  			if (distance > (pass === 0 ? OUTLINE_FIRST_EDGE_BAND : OUTLINE_EDGE_BAND)) continue;
  			if (along < OUTLINE_EDGE_MARGIN || along > .8) continue;
  			edges[nearest].push(point);
  		}
  		const centre = quadCentre(quad);
  		const lines = [];
  		for (const points of edges) {
  			if (points.length < OUTLINE_MINIMUM_EDGE_POINTS) return void 0;
  			const fit = robustFitLine(points, OUTLINE_TRIM_PIXELS);
  			if (!fit || fit.count < OUTLINE_MINIMUM_EDGE_POINTS) return void 0;
  			const outward = signedDistance(fit.line, centre) > 0 ? -.5 : .5;
  			lines.push(offsetLine(fit.line, outward));
  		}
  		const corners = [];
  		for (let index = 0; index < 4; index += 1) {
  			const corner = intersectLines(lines[(index + 3) % 4], lines[index]);
  			if (!corner) return void 0;
  			corners.push(corner);
  		}
  		const next = corners;
  		if (!(quadArea(next) > 0)) return void 0;
  		quad = next;
  	}
  	return quad;
  }
  /**
  * Extends the lit outline out to the square the cells are laid out on.
  *
  * Every cell is drawn inset by half a gap, so the region's edge lies half a gap
  * inside the panel square. Sampling maps the square, so the corners are moved
  * out through the outline's own homography rather than by a fixed number of
  * pixels, which would be wrong on any view that is not square on.
  */
  function panelSquareFromOutline(outline, profile) {
  	const inset = litOutlineInset(profile);
  	const ex = inset.x / (1 - 2 * inset.x);
  	const ey = inset.y / (1 - 2 * inset.y);
  	const homography = homographyFromUnitSquare(outline);
  	const corner = (x, y) => applyHomography(homography, x, y) ?? {
  		x,
  		y
  	};
  	return [
  		corner(-ex, -ey),
  		corner(1 + ex, -ey),
  		corner(1 + ex, 1 + ey),
  		corner(-ex, 1 + ey)
  	];
  }
  /**
  * Starts the corner order at the corner nearest the image's top-left.
  *
  * Which corner a detector calls the origin decides which cell it reads as
  * which, so it has to be fixed by something other than the order the pixels
  * happened to be visited in. The top-left-most corner is the display's own
  * top-left for any camera roll within 45 degrees either way. Beyond that the
  * cells are read turned, and a turned reading of the constant-luminance
  * pattern fails its pairs and its check bits for every code.
  */
  function startAtTopLeft(quad) {
  	let start = 0;
  	quad.forEach((point, index) => {
  		const best = quad[start];
  		if (point.x + point.y < best.x + best.y) start = index;
  	});
  	return [
  		0,
  		1,
  		2,
  		3
  	].map((offset) => quad[(start + offset) % 4]);
  }
  function quadCentre(quad) {
  	return {
  		x: quad.reduce((total, point) => total + point.x, 0) / 4,
  		y: quad.reduce((total, point) => total + point.y, 0) / 4
  	};
  }
  /**
  * The functionals whose maxima are candidate corners.
  *
  * Maxima only; a minimum is the maximum of the negated measure, which keeps the
  * running update to a single comparison per measure.
  */
  var EXTREME_MEASURES = [
  	(point) => -(point.x + point.y),
  	(point) => point.x - point.y,
  	(point) => point.x + point.y,
  	(point) => point.y - point.x,
  	(point) => -point.y,
  	(point) => point.x,
  	(point) => point.y,
  	(point) => -point.x
  ];
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
  		const extremes = [];
  		const boundary = [];
  		while (stack.length > 0) {
  			const index = stack.pop();
  			const x = index % width;
  			const y = (index - x) / width;
  			area += 1;
  			if (x < minX) minX = x;
  			if (x > maxX) maxX = x;
  			if (y < minY) minY = y;
  			if (y > maxY) maxY = y;
  			trackExtreme(extremes, {
  				x,
  				y
  			});
  			if (x === 0 || y === 0 || x + 1 === width || y + 1 === height || mask[index - 1] !== 1 || mask[index + 1] !== 1 || mask[index - width] !== 1 || mask[index + width] !== 1) boundary.push({
  				x,
  				y
  			});
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
  			area,
  			points: extremes,
  			boundary
  		});
  	}
  	return regions.sort((left, right) => right.area - left.area);
  	/** Keeps the running extremes of both diagonals and both axes. */
  	function trackExtreme(extremes, point) {
  		if (extremes.length < EXTREME_MEASURES.length) {
  			while (extremes.length < EXTREME_MEASURES.length) extremes.push(point);
  			return;
  		}
  		EXTREME_MEASURES.forEach((measure, index) => {
  			const current = extremes[index];
  			if (measure(point) > measure(current)) extremes[index] = point;
  		});
  	}
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
  		this.fiducials = new Set(profile.fiducials);
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
  	/**
  	* The narrowest band across the data cells: the panel's weakest contrast.
  	*
  	* Fiducials are excluded. They are lit in every code, so their band is zero
  	* by construction, and counting them would report every panel carrying
  	* fiducials as having no contrast at all.
  	*/
  	contrast() {
  		let smallest = Number.POSITIVE_INFINITY;
  		this.resolve().forEach((level, index) => {
  			if (this.fiducials.has(index)) return;
  			const span = level.high - level.low;
  			if (span < smallest) smallest = span;
  		});
  		return Number.isFinite(smallest) ? smallest : 0;
  	}
  	/**
  	* One threshold for cells that never change, taken across the data cells.
  	*
  	* A fiducial has no band of its own to be read against, so it is read against
  	* the panel as a whole. That still answers the question the fiducial exists
  	* for: is this part of the image the lit corner of the panel, or something
  	* else the decoder has wandered onto.
  	*/
  	globalThreshold() {
  		const lows = [];
  		const highs = [];
  		this.resolve().forEach((level, index) => {
  			if (this.fiducials.has(index)) return;
  			lows.push(level.low);
  			highs.push(level.high);
  		});
  		if (lows.length === 0) return 0;
  		lows.sort((left, right) => left - right);
  		highs.sort((left, right) => left - right);
  		return (percentile$1(lows, .5) + percentile$1(highs, .5)) / 2;
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
  			if (this.fiducials.has(index)) continue;
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
  		const globalThreshold = this.fiducials.size > 0 ? this.globalThreshold() : 0;
  		const cells = [];
  		for (let index = 0; index < levels.length; index += 1) {
  			const level = levels[index];
  			const value = values[index];
  			if (this.fiducials.has(index)) {
  				cells.push(value === void 0 || !Number.isFinite(value) ? void 0 : value > globalThreshold);
  				continue;
  			}
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
  			if (this.fiducials.has(index)) continue;
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
  				low: percentile$1(sorted, this.options.trimRatio),
  				high: percentile$1(sorted, 1 - this.options.trimRatio)
  			};
  		});
  		return this.levels;
  	}
  };
  function clamp(value, limit) {
  	if (limit <= 0) return 0;
  	return Math.max(-limit, Math.min(limit, value));
  }
  function percentile$1(sorted, fraction) {
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
  	/**
  	* How well the refresh interval is known, as a half-width in microseconds.
  	*
  	* Taken from the spread of the samples themselves rather than assumed. A
  	* display that schedules evenly reports a small figure; one being throttled
  	* reports a large one, and a consumer sizing a constraint from it widens
  	* instead of quietly producing a tighter answer than the measurement
  	* supports.
  	*/
  	refreshUncertaintyUs() {
  		if (!this.stable()) return void 0;
  		const sorted = [...this.intervals].sort((left, right) => left - right);
  		const low = sorted[Math.floor(sorted.length * .25)] ?? 0;
  		const high = sorted[Math.floor(sorted.length * .75)] ?? 0;
  		return Math.max(1, Math.round((high - low) / 2));
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
  	const gapX = cellWidth * PATTERN_CELL_GAP_RATIO;
  	const gapY = cellHeight * PATTERN_CELL_GAP_RATIO;
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
  			luminanceFromRgba(pixels, this.luminance);
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
  /** Rec. 601 luma from RGBA bytes, the weighting every reader of frames here uses. */
  function luminanceFromRgba(pixels, luminance) {
  	for (let index = 0; index < luminance.length; index += 1) {
  		const offset = index * 4;
  		const red = pixels[offset] ?? 0;
  		const green = pixels[offset + 1] ?? 0;
  		const blue = pixels[offset + 2] ?? 0;
  		luminance[index] = (red * 299 + green * 587 + blue * 114) / 1e3;
  	}
  }
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
  //#region node_modules/.pnpm/@kubohiroya+turbowarp-camera-source@0.7.0/node_modules/@kubohiroya/turbowarp-camera-source/dist/runtime.js
  /**
  * Where the extension instance puts itself on the VM runtime.
  *
  * Present as soon as the extension is registered. Absent means Camera Source is not loaded, which a
  * consumer has to handle whatever else it does.
  */
  var cameraSourceRuntimeKey = "ext_kubohiroyacamerasource";
  /** Narrows a runtime value to the Camera Source surface, so a missing extension reads as absent. */
  function readCameraSourceRuntime(runtime) {
  	if (typeof runtime !== "object" || runtime === null) return void 0;
  	const candidate = runtime[cameraSourceRuntimeKey];
  	if (typeof candidate !== "object" || candidate === null) return void 0;
  	const { acquireCamera } = candidate;
  	return typeof acquireCamera === "function" ? candidate : void 0;
  }
  //#endregion
  //#region src/camera/camera-source.ts
  /** Camera Source, or a refusal naming what is missing. */
  function requireCameraSource(runtime) {
  	const camera = readCameraSourceRuntime(runtime);
  	if (!camera) throw new TimeSpaceSyncError("camera-unavailable", "Camera Source is not loaded.");
  	return camera;
  }
  /**
  * The capture settings the browser is willing to report.
  *
  * Read from the track rather than from Camera Source's capability, which is
  * published only when its own calibration flag is on: the decoder needs the
  * exposure whether or not anybody is calibrating, and a diagnosis that stops
  * working because a different extension is configured differently would be
  * worse than reading the track twice.
  *
  * Recorded, never set. Decoding fails whenever an exposure spans a display
  * refresh, so the decode rate is governed by the exposure time, and a low rate
  * caused by a long exposure looks exactly like one caused by a dim panel while
  * calling for the opposite remedy. Every field is optional because every field
  * genuinely may be absent, and an absent setting is left absent.
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
  /** Where Camera Source publishes its calibration capability. */
  var cameraSourceCalibrationKey = "kubohiroyaCameraSourceCapability";
  var CAMERA_SOURCE_CALIBRATION_VERSION = 1;
  /**
  * Camera Source's calibration surface, or undefined when it is not published.
  *
  * It is absent whenever Camera Source was loaded without its calibration flag,
  * which is an ordinary configuration and not a fault.
  */
  function readCameraCalibration(runtime) {
  	if (typeof runtime !== "object" || runtime === null) return void 0;
  	const candidate = runtime[cameraSourceCalibrationKey];
  	if (typeof candidate !== "object" || candidate === null) return void 0;
  	const requireVersion = candidate.requireVersion;
  	if (typeof requireVersion !== "function") return void 0;
  	let capability;
  	try {
  		capability = requireVersion.call(candidate, CAMERA_SOURCE_CALIBRATION_VERSION);
  	} catch {
  		return;
  	}
  	if (typeof capability !== "object" || capability === null) return void 0;
  	const { profileFor, intrinsicsFor } = capability;
  	if (typeof profileFor !== "function" || typeof intrinsicsFor !== "function") return void 0;
  	return {
  		profileFor: (cameraId) => readProfileSummary(profileFor.call(capability, cameraId)),
  		intrinsicsFor: (cameraId) => readUsableIntrinsics(intrinsicsFor.call(capability, cameraId))
  	};
  }
  function readProfileSummary(value) {
  	if (typeof value !== "object" || value === null) return void 0;
  	const { profileId, distortion } = value;
  	if (typeof profileId !== "string" || profileId.length === 0) return void 0;
  	if (typeof distortion !== "object" || distortion === null) return void 0;
  	const { model, coefficients } = distortion;
  	if (typeof model !== "string" || !Array.isArray(coefficients)) return void 0;
  	if (!coefficients.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return;
  	return {
  		profileId,
  		distortion: {
  			model,
  			coefficients: [...coefficients]
  		}
  	};
  }
  function readUsableIntrinsics(value) {
  	if (typeof value !== "object" || value === null) return void 0;
  	const record = value;
  	const numbers = [
  		"fx",
  		"fy",
  		"cx",
  		"cy",
  		"skew",
  		"width",
  		"height"
  	].map((key) => record[key]);
  	if (!numbers.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return;
  	const [fx, fy, cx, cy, skew, width, height] = numbers;
  	if (!(fx > 0) || !(fy > 0) || !(width > 0) || !(height > 0)) return;
  	return {
  		fx,
  		fy,
  		cx,
  		cy,
  		skew,
  		width,
  		height
  	};
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
  		this.frameListeners = /* @__PURE__ */ new Set();
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
  	referenceId() {
  		return this.start_?.referenceId ?? "";
  	}
  	patternProfile() {
  		return this.profile;
  	}
  	/** The panel square found by calibration, or undefined unless the decoder is ready. */
  	panelQuad() {
  		return this.pipelineState === "ready" ? this.quad : void 0;
  	}
  	/** The video element frames are drawn from, while a camera is held. */
  	frameElement() {
  		return this.lease?.getFrameSource().element;
  	}
  	/**
  	* Follows the running decoder frame by frame.
  	*
  	* Refused unless the decoder is ready: before then there is no calibrated
  	* panel for a follower to rely on. Returns the function that stops following.
  	*/
  	observeFrames(listener) {
  		if (this.pipelineState !== "ready" || !this.quad) throw new TimeSpaceSyncError("decoder-not-running", "The optical time decoder must be running and calibrated first.");
  		this.frameListeners.add(listener);
  		return () => {
  			this.frameListeners.delete(listener);
  		};
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
  		this.endFrameListeners("Optical time decoding stopped.");
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
  		this.quad = void 0;
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
  		this.endFrameListeners("The optical time decoder started calibrating again.");
  		this.pipelineState = "calibrating";
  		this.code = "";
  		this.message = "";
  		this.levels = void 0;
  		this.rects = [];
  		this.quad = void 0;
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
  				quad: void 0,
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
  			this.endFrameListeners(this.message);
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
  		const samples = this.sample(frame.luminance);
  		if (!samples) {
  			this.recordDecodeAttempt(false);
  			this.notifyFrame(frame, "no-reading");
  			return;
  		}
  		const code = levels.decode(samples);
  		this.lastDecodeMargin = levels.decodeMargin(samples);
  		this.recordDecodeAttempt(code !== void 0);
  		if (code === void 0) {
  			this.notifyFrame(frame, "no-reading");
  			return;
  		}
  		const continuity = this.continuityOf(code, frame);
  		if (continuity === "discontinuous") {
  			this.rejectedObservations += 1;
  			this.notifyFrame(frame, continuity);
  			return;
  		}
  		levels.track(samples);
  		this.observations.push(this.observationFor(code, frame, start, levels, samples));
  		this.expire();
  		this.notifyFrame(frame, continuity);
  	}
  	notifyFrame(frame, continuity) {
  		const quad = this.quad;
  		if (!quad || this.frameListeners.size === 0) return;
  		const event = {
  			frame,
  			quad,
  			analysisWidth: this.analysisWidth,
  			analysisHeight: this.analysisHeight,
  			continuity
  		};
  		for (const listener of [...this.frameListeners]) try {
  			listener.frame(event);
  		} catch {}
  	}
  	endFrameListeners(message) {
  		if (this.frameListeners.size === 0) return;
  		const listeners = [...this.frameListeners];
  		this.frameListeners.clear();
  		const error = new TimeSpaceSyncError("decoder-not-running", message);
  		for (const listener of listeners) try {
  			listener.ended(error);
  		} catch {}
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
  	continuityOf(code, frame) {
  		const previous = this.lastDecode;
  		this.lastDecode = {
  			code,
  			monotonicAtUs: frame.monotonicAtUs
  		};
  		if (!previous) return "first-reading";
  		const elapsedUs = frame.monotonicAtUs - previous.monotonicAtUs;
  		if (elapsedUs <= 0) return "first-reading";
  		const wrap = wrapUs(this.profile);
  		if (elapsedUs >= wrap / 2) return "first-reading";
  		const advanced = patternTimestampUs(code, this.profile) - patternTimestampUs(previous.code, this.profile);
  		const half = wrap / 2;
  		const signed = ((advanced + half) % wrap + wrap) % wrap - half;
  		const allowance = (this.start_?.displayRefreshUs ?? 0) + (this.start_?.refreshUncertaintyUs ?? 0);
  		return Math.abs(signed - elapsedUs) <= allowance ? "continuous" : "discontinuous";
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
  			calibration.quad = detection.quad;
  			calibration.phase = "levels";
  			return;
  		}
  		const samples = this.sampleWith(frame.luminance, calibration.rects, calibration.quad);
  		if (!samples) return;
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
  		this.quad = calibration.quad;
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
  	/**
  	* Reads the cells the way the profile asks for.
  	*
  	* The grid path divides the panel's bounding box evenly, which the extraction
  	* source did and which only holds for a square-on, undistorted view. The quad
  	* path maps the panel's own corners, so a tilted camera or a keystoned
  	* projection reads the cell it is aiming at rather than part of its
  	* neighbour.
  	*/
  	sample(frame) {
  		return this.sampleWith(frame, this.rects, this.quad);
  	}
  	sampleWith(frame, rects, quad) {
  		if (this.profile.sampling === "quad") return quad ? sampleCellsThroughQuad(frame, quad, this.profile) : void 0;
  		return sampleCells(frame, rects);
  	}
  	recordDecodeAttempt(decoded) {
  		this.recentDecodes.push(decoded);
  		while (this.recentDecodes.length > DECODE_RATE_WINDOW) this.recentDecodes.shift();
  	}
  	fail(code, error) {
  		this.pipelineState = "error";
  		this.code = code;
  		this.message = error instanceof Error ? error.message : String(error);
  		this.endFrameListeners(this.message);
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
  /**
  * Largest RMS distance of per-frame corners from the aggregate, in pixels.
  *
  * The placement solve assumes a corner is placed to about half a pixel
  * (DEFAULT_IMAGE_SIGMA_PX). Per-frame corners from a steady camera scatter by
  * well under that. A spread beyond it means the corners moved during the
  * window -- the camera was knocked, the projector is vibrating, auto-focus was
  * hunting -- and the median is then an average of two places, not either of
  * them.
  */
  var MAXIMUM_CORNER_SPREAD_PX = .5;
  /** How long past the window to wait for a frame before calling the camera stopped. */
  var WATCHDOG_GRACE_MS = 2e3;
  function measurePatternCorners(options) {
  	let settle = () => void 0;
  	const result = new Promise((resolve) => {
  		settle = resolve;
  	});
  	let settled = false;
  	let unsubscribe;
  	let reader;
  	let disarm;
  	const finish = (outcome) => {
  		if (settled) return;
  		settled = true;
  		unsubscribe?.();
  		unsubscribe = void 0;
  		disarm?.();
  		disarm = void 0;
  		reader?.dispose();
  		reader = void 0;
  		settle(outcome);
  	};
  	const fail = (code, message, spreadPx) => {
  		finish(spreadPx === void 0 ? {
  			ok: false,
  			code,
  			message
  		} : {
  			ok: false,
  			code,
  			message,
  			spreadPx
  		});
  	};
  	const running = {
  		result,
  		cancel: fail
  	};
  	const seconds = options.seconds;
  	if (!Number.isFinite(seconds) || seconds < 1 || seconds > 60) {
  		fail("invalid-duration", `Corner measurement must run between 1 and 60 seconds.`);
  		return running;
  	}
  	if (options.profile.fiducials.length === 0) {
  		fail("profile-without-fiducials", `Pattern profile ${options.profile.id} has no corner fiducials to measure.`);
  		return running;
  	}
  	const deadlineUs = options.clock.nowUs() + seconds * 1e6;
  	const samples = [];
  	const failures = /* @__PURE__ */ new Map();
  	let rejected = 0;
  	let continuous = 0;
  	let discontinuous = 0;
  	let size;
  	const listener = {
  		frame: (event) => {
  			if (settled) return;
  			try {
  				take(event);
  			} catch (error) {
  				fail(errorCodeOf(error), error instanceof Error ? error.message : String(error));
  			}
  		},
  		ended: (error) => fail(error.code, error.message)
  	};
  	const take = (event) => {
  		const { frame } = event;
  		if (event.continuity === "continuous") continuous += 1;
  		if (event.continuity === "discontinuous") discontinuous += 1;
  		const source = {
  			width: frame.sourceWidth,
  			height: frame.sourceHeight
  		};
  		if (!size) size = source;
  		if (size.width !== source.width || size.height !== source.height) throw new TimeSpaceSyncError("frame-size-mismatch", `The camera changed from ${size.width}x${size.height} to ${source.width}x${source.height} while the corners were being measured.`);
  		const analysis = {
  			width: event.analysisWidth,
  			height: event.analysisHeight
  		};
  		const quad = sourceQuadFromAnalysis(event.quad, analysis, source);
  		const scale = Math.max(source.width / analysis.width, source.height / analysis.height);
  		reader ?? (reader = options.createReader());
  		const refined = refinePanelCorners(reader, quad, options.profile, source, 2 * scale);
  		if (refined.ok) samples.push({
  			corners: refined.corners,
  			deliveredAtUs: frame.deliveredAtUs
  		});
  		else {
  			rejected += 1;
  			failures.set(refined.reason, (failures.get(refined.reason) ?? 0) + 1);
  		}
  		if (options.clock.nowUs() >= deadlineUs) conclude();
  	};
  	const conclude = () => {
  		if (samples.length < 15 || !size) {
  			fail("too-few-corner-frames", `Only ${samples.length} frames gave all four corners; 15 are needed.${describeFailures(failures)}`);
  			return;
  		}
  		if (continuous < 3 || continuous < discontinuous) {
  			fail("orientation-unproven", `Only ${continuous} readings advanced with real time against ${discontinuous} that did not, so the panel may be seen turned over and its corners cannot be named.`);
  			return;
  		}
  		const corners = [
  			0,
  			1,
  			2,
  			3
  		].map((index) => ({
  			x: median(samples.map((sample) => sample.corners[index].x)),
  			y: median(samples.map((sample) => sample.corners[index].y))
  		}));
  		let squares = 0;
  		for (const sample of samples) sample.corners.forEach((point, index) => {
  			const aggregate = corners[index];
  			squares += (point.x - aggregate.x) ** 2 + (point.y - aggregate.y) ** 2;
  		});
  		const spreadPx = Math.sqrt(squares / (samples.length * 4));
  		if (spreadPx > .5) {
  			fail("corners-unstable", `The corners moved by ${spreadPx.toFixed(2)} px RMS during the measurement; at most ${MAXIMUM_CORNER_SPREAD_PX} px is accepted.`, spreadPx);
  			return;
  		}
  		const delivered = samples.map((sample) => sample.deliveredAtUs).sort((a, b) => a - b);
  		finish({
  			ok: true,
  			measurement: {
  				corners,
  				spreadPx,
  				frameCount: samples.length,
  				rejectedFrameCount: rejected,
  				capturedAtUs: delivered[Math.floor((delivered.length - 1) / 2)],
  				sourceWidth: size.width,
  				sourceHeight: size.height
  			}
  		});
  	};
  	try {
  		unsubscribe = options.source.observeFrames(listener);
  	} catch (error) {
  		fail(errorCodeOf(error), error instanceof Error ? error.message : String(error));
  		return running;
  	}
  	disarm = (options.schedule ?? defaultSchedule)(() => {
  		fail("camera-ended", "The camera stopped delivering frames while the corners were being measured.");
  	}, seconds * 1e3 + WATCHDOG_GRACE_MS);
  	if (settled) {
  		disarm();
  		disarm = void 0;
  	}
  	return running;
  }
  function describeFailures(failures) {
  	if (failures.size === 0) return "";
  	const worst = [...failures.entries()].sort((left, right) => right[1] - left[1])[0];
  	return worst ? ` The most common refusal was ${worst[0]} (${worst[1]} frames).` : "";
  }
  function median(values) {
  	const sorted = [...values].sort((left, right) => left - right);
  	const middle = Math.floor(sorted.length / 2);
  	return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  function defaultSchedule(callback, milliseconds) {
  	const handle = setTimeout(callback, milliseconds);
  	return () => clearTimeout(handle);
  }
  //#endregion
  //#region src/optical-time/region-reader.ts
  /**
  * Reads small windows of the video at its own resolution.
  *
  * Each window is drawn with a source rectangle into a canvas no larger than the
  * window, so only those pixels are ever read back. The frame pump draws the
  * whole frame, but downscaled; reading the full frame at full size to cut four
  * corners out of it would cost more than the decoder does.
  */
  var VideoRegionReader = class {
  	constructor(options) {
  		this.element = options.element;
  		const canvas = (options.documentRef ?? document).createElement("canvas");
  		const context = canvas.getContext("2d", { willReadFrequently: true });
  		if (!context) throw new Error("Measuring the pattern corners needs a 2D canvas.");
  		this.canvas = canvas;
  		this.context = context;
  	}
  	read(region) {
  		const canvas = this.canvas;
  		const context = this.context;
  		if (!canvas || !context) return void 0;
  		const { x, y, width, height } = region;
  		if (width < 1 || height < 1) return void 0;
  		if (canvas.width < width) canvas.width = width;
  		if (canvas.height < height) canvas.height = height;
  		context.drawImage(this.element, x, y, width, height, 0, 0, width, height);
  		const pixels = context.getImageData(0, 0, width, height).data;
  		const data = new Uint8Array(width * height);
  		luminanceFromRgba(pixels, data);
  		return {
  			width,
  			height,
  			data
  		};
  	}
  	/** Releases the canvas's backing store, which otherwise lives as long as the object. */
  	dispose() {
  		if (this.canvas) {
  			this.canvas.width = 0;
  			this.canvas.height = 0;
  		}
  		this.canvas = void 0;
  		this.context = void 0;
  	}
  };
  //#endregion
  //#region src/optical-time/estimator.ts
  var DEFAULT_VALIDITY_US = 3e7;
  var DEFAULT_MINIMUM_AGREEMENT = .5;
  /**
  * Folds a delay onto the half wrap period nearest zero.
  *
  * The pattern only says the time within its wrap window, so a delay is known
  * modulo that period. Folding to the nearest representative rather than to the
  * first positive residue keeps a slightly negative delay slightly negative: an
  * over-corrected capture time or a clock error would otherwise arrive as an
  * outlier just short of a full wrap and wreck every summary computed from it.
  *
  * The transport applies the same rule to the samples it collects. The two are
  * held together by a shared fixture rather than by shared code: the rule lives
  * in a module that package does not publish.
  */
  function foldDelayUs(delayUs, wrapUs = 0) {
  	if (!(wrapUs > 0)) return delayUs;
  	const half = wrapUs / 2;
  	return ((delayUs + half) % wrapUs + wrapUs) % wrapUs - half;
  }
  /**
  * The delays one reading allows.
  *
  * The capture instant lies in `[constraintLo, constraintHi]` on the observer's
  * clock. The code it shows was on screen from its own timestamp until one
  * refresh later, give or take how well that refresh is known. The delay is the
  * first minus the second, so the widest difference and the narrowest bound the
  * interval.
  */
  function delayIntervalFor(observation) {
  	const onsetLoUs = observation.patternCodeTimestampUs - observation.refreshUncertaintyUs;
  	const onsetHiUs = observation.patternCodeTimestampUs + observation.displayRefreshUs + observation.refreshUncertaintyUs;
  	const loUs = observation.constraintLoUs - onsetHiUs;
  	const hiUs = observation.constraintHiUs - onsetLoUs;
  	const centre = (loUs + hiUs) / 2;
  	const shift = centre - foldDelayUs(centre, observation.wrapUs);
  	return {
  		loUs: loUs - shift,
  		hiUs: hiUs - shift
  	};
  }
  /**
  * The region the most intervals agree on.
  *
  * Plain intersection is not usable here: one reading that slipped past the
  * check bits empties it, and a result that disappears whenever a single frame
  * misreads is no result at all. Sweeping the edges finds the region the largest
  * number of readings cover, and reports how many that was, so a caller can see
  * the disagreement rather than having it silently averaged away.
  */
  function agreeOn(intervals) {
  	if (intervals.length === 0) return void 0;
  	const edges = [];
  	for (const interval of intervals) {
  		if (interval.hiUs < interval.loUs) continue;
  		edges.push({
  			at: interval.loUs,
  			delta: 1
  		});
  		edges.push({
  			at: interval.hiUs,
  			delta: -1
  		});
  	}
  	if (edges.length === 0) return void 0;
  	edges.sort((left, right) => left.at - right.at || right.delta - left.delta);
  	let running = 0;
  	let best = 0;
  	let loUs = 0;
  	let hiUs = 0;
  	for (let index = 0; index < edges.length; index += 1) {
  		const edge = edges[index];
  		running += edge.delta;
  		if (edge.delta === 1 && running > best) {
  			best = running;
  			loUs = edge.at;
  			hiUs = edge.at;
  			const next = edges[index + 1];
  			if (next) hiUs = next.at;
  		}
  	}
  	return best === 0 ? void 0 : {
  		loUs,
  		hiUs,
  		agreed: best
  	};
  }
  function estimateTimeCorrespondence(observations, options) {
  	if (observations.length === 0) return {
  		ok: false,
  		code: "insufficient-points",
  		message: "No observations have been collected for this camera."
  	};
  	const first = observations[0];
  	const mismatch = firstMismatch(observations, first);
  	if (mismatch) return mismatch;
  	const intervals = observations.map((observation) => delayIntervalFor(observation));
  	const agreement = agreeOn(intervals);
  	if (!agreement) return {
  		ok: false,
  		code: "decode-unstable",
  		message: "No reading produced a usable interval."
  	};
  	const ratio = agreement.agreed / observations.length;
  	const minimum = options.minimumAgreementRatio ?? DEFAULT_MINIMUM_AGREEMENT;
  	const outvoted = observations.length > 1 && agreement.agreed * 2 <= observations.length;
  	if (ratio < minimum || outvoted) return {
  		ok: false,
  		code: "decode-unstable",
  		message: `Only ${agreement.agreed} of ${observations.length} readings agree on any delay, so no interval describes them all.`
  	};
  	const midpoints = intervals.map((interval) => (interval.loUs + interval.hiUs) / 2);
  	const validityUs = options.validityUs ?? DEFAULT_VALIDITY_US;
  	const degraded = ratio < 1 || observations.length < 2;
  	const notes = [];
  	if (agreement.agreed < observations.length) notes.push(`${observations.length - agreement.agreed} of ${observations.length} readings lie outside the agreed interval.`);
  	if (observations.length < 2) notes.push("A single reading bounds the delay but does not corroborate it.");
  	return {
  		ok: true,
  		correspondence: {
  			schema: TIME_CORRESPONDENCE_SCHEMA,
  			version: 1,
  			cameraId: first.cameraId,
  			referenceId: first.referenceId,
  			observerDomain: first.observerDomain,
  			displayDomain: first.displayDomain,
  			displayToTimestampDelayUs: Math.round((agreement.loUs + agreement.hiUs) / 2),
  			delayLoUs: Math.round(agreement.loUs),
  			delayHiUs: Math.round(agreement.hiUs),
  			uncertaintyUs: Math.round((agreement.hiUs - agreement.loUs) / 2),
  			sampleCount: observations.length,
  			rejectedCount: options.rejectedCount ?? 0,
  			droppedCount: options.droppedCount ?? 0,
  			decodeRate: options.decodeRate ?? 0,
  			decodeMarginMin: Math.min(...observations.map((entry) => entry.decodeMargin)),
  			measuredAtUs: Math.round(options.nowUs),
  			validUntilUs: Math.round(options.nowUs + validityUs),
  			unidentifiedComponents: unidentifiedFor(first),
  			degraded,
  			notes,
  			robust: summarize(midpoints)
  		}
  	};
  }
  /**
  * What the result folds together and cannot separate.
  *
  * The camera's capture-to-timestamp delay and the display's draw-to-photons
  * delay are always in there; optical readings constrain only their sum. The
  * clock offset joins them whenever the two clocks are not the same one, which
  * is the price of measuring across machines and the reason the same-computer
  * case is worth keeping simple. Rolling shutter is listed because the panel
  * occupies part of the frame and the rows carrying it are exposed at their own
  * time, which nothing here models.
  */
  function unidentifiedFor(observation) {
  	const components = [
  		"cameraPipelineDelay",
  		"displayPipelineDelay",
  		"rollingShutterSkew"
  	];
  	const display = observation.displayDomain;
  	if (display === null || !sameClockDomain(display, observation.observerDomain)) components.unshift("clockOffset");
  	return components;
  }
  /** Refuses a set of readings that cannot be summarised as one measurement. */
  function firstMismatch(observations, first) {
  	for (const observation of observations) {
  		if (observation.cameraId !== first.cameraId || observation.referenceId !== first.referenceId) return {
  			ok: false,
  			code: "invalid-payload",
  			message: "The readings do not all come from one camera watching one reference."
  		};
  		if (observation.patternProfileId !== first.patternProfileId) return {
  			ok: false,
  			code: "invalid-payload",
  			message: "The readings were decoded under different pattern profiles."
  		};
  		if (observation.observerDomain.id !== first.observerDomain.id) return {
  			ok: false,
  			code: "clock-domain-mismatch",
  			message: "The readings were stamped on different clocks."
  		};
  		if (observation.observerDomain.epoch !== first.observerDomain.epoch) return {
  			ok: false,
  			code: "clock-epoch-changed",
  			message: "The clock was re-estimated partway through, so the readings are not comparable."
  		};
  	}
  }
  function summarize(values) {
  	const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  	if (sorted.length === 0) return {
  		median: 0,
  		mad: 0,
  		p10: 0,
  		p90: 0
  	};
  	const median = percentile(sorted, .5);
  	const deviations = sorted.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  	return {
  		median: Math.round(median),
  		mad: Math.round(percentile(deviations, .5)),
  		p10: Math.round(percentile(sorted, .1)),
  		p90: Math.round(percentile(sorted, .9))
  	};
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
  //#region src/placement/linear-algebra.ts
  function multiply(left, right, rows, inner, columns) {
  	const result = new Array(rows * columns).fill(0);
  	for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
  		let total = 0;
  		for (let k = 0; k < inner; k += 1) total += (left[row * inner + k] ?? 0) * (right[k * columns + column] ?? 0);
  		result[row * columns + column] = total;
  	}
  	return result;
  }
  function transpose(values, rows, columns) {
  	const result = new Array(rows * columns).fill(0);
  	for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) result[column * rows + row] = values[row * columns + column] ?? 0;
  	return result;
  }
  /**
  * Eigen decomposition of a symmetric matrix, by cyclic Jacobi rotations.
  *
  * Used for two things: the smallest eigenvector of `AᵀA`, which is the
  * homogeneous least-squares solution a homography needs, and the parameter
  * covariance a refinement leaves behind. Jacobi is chosen over anything faster
  * because the matrices are nine by nine at most and it needs no pivoting, no
  * balancing and no special cases to be correct.
  */
  function symmetricEigen(matrix, size, sweeps = 60) {
  	const a = [...matrix];
  	const v = new Array(size * size).fill(0);
  	for (let index = 0; index < size; index += 1) v[index * size + index] = 1;
  	for (let sweep = 0; sweep < sweeps; sweep += 1) {
  		let off = 0;
  		for (let p = 0; p < size; p += 1) for (let q = p + 1; q < size; q += 1) off += (a[p * size + q] ?? 0) ** 2;
  		if (off < 1e-24) break;
  		for (let p = 0; p < size; p += 1) for (let q = p + 1; q < size; q += 1) {
  			const apq = a[p * size + q] ?? 0;
  			if (Math.abs(apq) < 1e-30) continue;
  			const app = a[p * size + p] ?? 0;
  			const theta = ((a[q * size + q] ?? 0) - app) / (2 * apq);
  			const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
  			const c = 1 / Math.sqrt(t * t + 1);
  			const s = t * c;
  			for (let k = 0; k < size; k += 1) {
  				const akp = a[k * size + p] ?? 0;
  				const akq = a[k * size + q] ?? 0;
  				a[k * size + p] = c * akp - s * akq;
  				a[k * size + q] = s * akp + c * akq;
  			}
  			for (let k = 0; k < size; k += 1) {
  				const apk = a[p * size + k] ?? 0;
  				const aqk = a[q * size + k] ?? 0;
  				a[p * size + k] = c * apk - s * aqk;
  				a[q * size + k] = s * apk + c * aqk;
  			}
  			for (let k = 0; k < size; k += 1) {
  				const vkp = v[k * size + p] ?? 0;
  				const vkq = v[k * size + q] ?? 0;
  				v[k * size + p] = c * vkp - s * vkq;
  				v[k * size + q] = s * vkp + c * vkq;
  			}
  		}
  	}
  	const order = Array.from({ length: size }, (_, index) => index).sort((left, right) => (a[left * size + left] ?? 0) - (a[right * size + right] ?? 0));
  	const values = order.map((index) => a[index * size + index] ?? 0);
  	const vectors = new Array(size * size).fill(0);
  	order.forEach((source, target) => {
  		for (let row = 0; row < size; row += 1) vectors[row * size + target] = v[row * size + source] ?? 0;
  	});
  	return {
  		values,
  		vectors
  	};
  }
  /** Column `index` of a row-major square matrix. */
  function columnOf(matrix, size, index) {
  	return Array.from({ length: size }, (_, row) => matrix[row * size + index] ?? 0);
  }
  /**
  * Solves a symmetric positive definite system by Cholesky.
  *
  * Returns undefined rather than a large wrong answer when the matrix is not
  * positive definite, which is what a degenerate set of correspondences
  * produces: there the problem has no unique solution and saying so is the
  * result.
  */
  function solveSymmetric(matrix, rhs, size) {
  	const l = new Array(size * size).fill(0);
  	for (let row = 0; row < size; row += 1) for (let column = 0; column <= row; column += 1) {
  		let total = matrix[row * size + column] ?? 0;
  		for (let k = 0; k < column; k += 1) total -= (l[row * size + k] ?? 0) * (l[column * size + k] ?? 0);
  		if (row === column) {
  			if (!(total > 0) || !Number.isFinite(total)) return void 0;
  			l[row * size + column] = Math.sqrt(total);
  		} else {
  			const pivot = l[column * size + column] ?? 0;
  			if (pivot === 0) return void 0;
  			l[row * size + column] = total / pivot;
  		}
  	}
  	const y = new Array(size).fill(0);
  	for (let row = 0; row < size; row += 1) {
  		let total = rhs[row] ?? 0;
  		for (let k = 0; k < row; k += 1) total -= (l[row * size + k] ?? 0) * (y[k] ?? 0);
  		y[row] = total / (l[row * size + row] ?? 1);
  	}
  	const x = new Array(size).fill(0);
  	for (let row = size - 1; row >= 0; row -= 1) {
  		let total = y[row] ?? 0;
  		for (let k = row + 1; k < size; k += 1) total -= (l[k * size + row] ?? 0) * (x[k] ?? 0);
  		x[row] = total / (l[row * size + row] ?? 1);
  	}
  	return x.every((value) => Number.isFinite(value)) ? x : void 0;
  }
  //#endregion
  //#region src/placement/camera-model.ts
  var UNDISTORT_ITERATIONS = 20;
  /** Squared step below which the iteration has stopped moving, in normalised units. */
  var UNDISTORT_TOLERANCE = 1e-26;
  function requireSupportedDistortion(distortion) {
  	if (distortion.model !== "none" && distortion.model !== "brown-conrady") throw new TimeSpaceSyncError("unsupported-distortion-model", `This build cannot undo ${String(distortion.model)} distortion, and guessing at the nearest model it knows would move the solved pose without changing the residual.`);
  	if (distortion.model === "brown-conrady" && distortion.coefficients.length < 4) throw new TimeSpaceSyncError("unsupported-distortion-model", "Brown-Conrady distortion needs at least k1, k2, p1 and p2.");
  	return distortion;
  }
  /** Pixels to ideal normalised image coordinates, with distortion removed. */
  function normalize(point, intrinsics, distortion) {
  	const y = (point.v - intrinsics.cy) / intrinsics.fy;
  	const x = (point.u - intrinsics.cx - intrinsics.skew * y) / intrinsics.fx;
  	return distortion.model === "none" ? {
  		x,
  		y
  	} : undistort({
  		x,
  		y
  	}, distortion.coefficients);
  }
  /** Ideal normalised coordinates back to pixels, distortion included. */
  function project(point, intrinsics, distortion) {
  	const distorted = distortion.model === "none" ? point : applyDistortion(point, distortion.coefficients);
  	return {
  		u: intrinsics.fx * distorted.x + intrinsics.skew * distorted.y + intrinsics.cx,
  		v: intrinsics.fy * distorted.y + intrinsics.cy
  	};
  }
  function applyDistortion(point, coefficients) {
  	const k1 = coefficients[0] ?? 0;
  	const k2 = coefficients[1] ?? 0;
  	const p1 = coefficients[2] ?? 0;
  	const p2 = coefficients[3] ?? 0;
  	const k3 = coefficients[4] ?? 0;
  	const r2 = point.x * point.x + point.y * point.y;
  	const radial = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2;
  	return {
  		x: point.x * radial + 2 * p1 * point.x * point.y + p2 * (r2 + 2 * point.x * point.x),
  		y: point.y * radial + p1 * (r2 + 2 * point.y * point.y) + 2 * p2 * point.x * point.y
  	};
  }
  /**
  * Removes distortion by iterating the forward model.
  *
  * There is no closed form, so the observed point is used as the first guess and
  * corrected until it stops moving. Twenty steps is far more than the handful a
  * lens needs; the loop stops early once it converges.
  */
  function undistort(point, coefficients) {
  	let current = point;
  	for (let step = 0; step < UNDISTORT_ITERATIONS; step += 1) {
  		const forward = applyDistortion(current, coefficients);
  		const dx = forward.x - point.x;
  		const dy = forward.y - point.y;
  		current = {
  			x: current.x - dx,
  			y: current.y - dy
  		};
  		if (dx * dx + dy * dy < UNDISTORT_TOLERANCE) break;
  	}
  	return current;
  }
  /**
  * Reads a camera model document, refusing anything that does not state its lens fully.
  *
  * The accepted shape is `{intrinsics: {fx, fy, cx, cy, skew}, distortion:
  * {model, coefficients}}`, optionally with `intrinsicProfileId`, `imageWidth`
  * and `imageHeight`; the pattern corner blocks produce exactly that.
  *
  * Camera Source's `camera intrinsics JSON` is refused with
  * `unsupported-distortion-model`. It carries the pinhole numbers adapted to the
  * frame but no distortion, and reading its absence as "no distortion" would
  * move every pose solved through a webcam lens while the residual stayed small.
  * The distortion is in the profile Camera Source holds, so the model is built
  * on the camera's own computer, where both are available.
  */
  function parseCameraModel(value) {
  	if (typeof value !== "object" || value === null) return {
  		ok: false,
  		code: "invalid-payload",
  		message: "A camera model must be a JSON object."
  	};
  	const record = value;
  	if (record.intrinsics === void 0 && typeof record.fx === "number") return {
  		ok: false,
  		code: "unsupported-distortion-model",
  		message: "These intrinsics state no distortion model. Use the camera model JSON block on the camera computer, which adds the distortion from the registered profile."
  	};
  	const intrinsics = record.intrinsics;
  	if (typeof intrinsics !== "object" || intrinsics === null || ![
  		"fx",
  		"fy",
  		"cx",
  		"cy",
  		"skew"
  	].every((key) => typeof intrinsics[key] === "number" && Number.isFinite(intrinsics[key])) || !(intrinsics.fx > 0) || !(intrinsics.fy > 0)) return {
  		ok: false,
  		code: "invalid-payload",
  		message: "The intrinsics need finite fx, fy, cx, cy and skew."
  	};
  	const distortion = record.distortion;
  	if (typeof distortion !== "object" || distortion === null || typeof distortion.model !== "string") return {
  		ok: false,
  		code: "unsupported-distortion-model",
  		message: "The camera model states no distortion model."
  	};
  	const coefficients = distortion.coefficients;
  	if (!Array.isArray(coefficients) || !coefficients.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return {
  		ok: false,
  		code: "invalid-payload",
  		message: "Distortion coefficients must be finite numbers."
  	};
  	const profileId = record.intrinsicProfileId;
  	if (profileId !== void 0 && (typeof profileId !== "string" || profileId.length === 0)) return {
  		ok: false,
  		code: "invalid-payload",
  		message: "intrinsicProfileId must be a non-empty string."
  	};
  	for (const key of ["imageWidth", "imageHeight"]) {
  		const size = record[key];
  		if (size !== void 0 && !(Number.isInteger(size) && size > 0)) return {
  			ok: false,
  			code: "invalid-payload",
  			message: `${key} must be a positive integer.`
  		};
  	}
  	return {
  		ok: true,
  		intrinsics: {
  			fx: intrinsics.fx,
  			fy: intrinsics.fy,
  			cx: intrinsics.cx,
  			cy: intrinsics.cy,
  			skew: intrinsics.skew
  		},
  		distortion: {
  			model: distortion.model,
  			coefficients: [...coefficients]
  		},
  		...profileId === void 0 ? {} : { intrinsicProfileId: profileId },
  		...record.imageWidth === void 0 ? {} : { imageWidth: record.imageWidth },
  		...record.imageHeight === void 0 ? {} : { imageHeight: record.imageHeight }
  	};
  }
  //#endregion
  //#region src/placement/reference.ts
  function toPlanarReference(definition) {
  	const points = definition.points;
  	if (points.length < 4) return {
  		ok: false,
  		message: "A reference needs at least four measured points."
  	};
  	const origin = centroidOf(points);
  	const { vectors } = symmetricEigen(scatterOf(points, origin), 3);
  	const normal = columnOf(vectors, 3, 0);
  	const axisU = columnOf(vectors, 3, 2);
  	const axisV = columnOf(vectors, 3, 1);
  	const planar = points.map((point) => ({
  		u: dot$1(subtract(point, origin), axisU),
  		v: dot$1(subtract(point, origin), axisV)
  	}));
  	const planarityResidualMeters = Math.max(...points.map((point) => Math.abs(dot$1(subtract(point, origin), normal))));
  	let extentMeters = 0;
  	for (let i = 0; i < planar.length; i += 1) for (let j = i + 1; j < planar.length; j += 1) {
  		const a = planar[i];
  		const b = planar[j];
  		extentMeters = Math.max(extentMeters, Math.hypot(a.u - b.u, a.v - b.v));
  	}
  	if (!(extentMeters > 0)) return {
  		ok: false,
  		message: "The reference points are all in the same place."
  	};
  	return {
  		ok: true,
  		reference: {
  			referenceId: definition.referenceId,
  			ids: points.map((point) => point.id),
  			planar,
  			origin,
  			axisU,
  			axisV,
  			normal,
  			planarityResidualMeters,
  			sigmaMeters: points.reduce((total, point) => total + point.sigmaMeters, 0) / points.length,
  			extentMeters
  		}
  	};
  }
  function centroidOf(points) {
  	const sum = [
  		0,
  		0,
  		0
  	];
  	for (const point of points) {
  		sum[0] = (sum[0] ?? 0) + point.x;
  		sum[1] = (sum[1] ?? 0) + point.y;
  		sum[2] = (sum[2] ?? 0) + point.z;
  	}
  	return sum.map((value) => value / points.length);
  }
  function scatterOf(points, origin) {
  	const matrix = new Array(9).fill(0);
  	for (const point of points) {
  		const d = subtract(point, origin);
  		for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) matrix[row * 3 + column] = (matrix[row * 3 + column] ?? 0) + (d[row] ?? 0) * (d[column] ?? 0);
  	}
  	return matrix;
  }
  function subtract(point, origin) {
  	return [
  		point.x - (origin[0] ?? 0),
  		point.y - (origin[1] ?? 0),
  		point.z - (origin[2] ?? 0)
  	];
  }
  function dot$1(left, right) {
  	return (left[0] ?? 0) * (right[0] ?? 0) + (left[1] ?? 0) * (right[1] ?? 0) + (left[2] ?? 0) * (right[2] ?? 0);
  }
  //#endregion
  //#region src/placement/planar-pose.ts
  var REFINE_STEPS = 60;
  /**
  * How well a point can be placed in the image, in pixels.
  *
  * An operator clicking a projected corner, or a detector finding one, lands
  * within about half a pixel on a good day. It is an assumption and it is stated
  * as one, rather than being left implicit in a residual that happens to be
  * small.
  */
  var DEFAULT_IMAGE_SIGMA_PX = .5;
  /**
  * How far apart two poses must be before they count as different solutions.
  *
  * Refining from the reflected start does not always reach a second minimum: for
  * a target showing plenty of perspective there is none, and the refinement
  * slides back onto the first. That case has to be told from a genuine second
  * solution, because both leave the two residuals equal and the ratio alone
  * cannot say which happened.
  */
  var DISTINCT_SOLUTION_DEG = 1;
  function solvePlanarPose(planar, image, intrinsics, distortion, imageSigmaPx = DEFAULT_IMAGE_SIGMA_PX) {
  	if (planar.length < 4 || planar.length !== image.length) return void 0;
  	const homography = homographyFrom(planar, image.map((point) => normalize(point, intrinsics, distortion)));
  	if (!homography) return void 0;
  	const initial = poseFromHomography(homography);
  	if (!initial) return void 0;
  	const first = refine(initial, planar, image, intrinsics, distortion);
  	const mirrored = reflectAboutLineOfSight(first, planar);
  	const second = mirrored ? refine(mirrored, planar, image, intrinsics, distortion) : void 0;
  	const ordered = second && second.reprojectionRmsPx < first.reprojectionRmsPx ? [second, first] : [first, second];
  	const best = ordered[0];
  	const other = ordered[1];
  	const alternative = other !== void 0 && angleBetweenDeg(best.rotation, other.rotation) > DISTINCT_SOLUTION_DEG ? other : void 0;
  	const floor = Math.max(best.reprojectionRmsPx, imageSigmaPx);
  	return {
  		best,
  		alternative,
  		errorRatio: alternative === void 0 ? Number.POSITIVE_INFINITY : Math.max(alternative.reprojectionRmsPx, imageSigmaPx) / floor,
  		pointCount: planar.length
  	};
  }
  /**
  * The homography taking plane coordinates to normalised image coordinates.
  *
  * Both sets are conditioned first. Without it the rows of the design matrix
  * differ by the square of the target's size in metres, and the smallest
  * eigenvector of a matrix with that spread is dominated by rounding rather than
  * by the measurement.
  */
  function homographyFrom(planar, normalized) {
  	const source = conditionPlanar(planar);
  	const target = conditionNormalized(normalized);
  	const rows = [];
  	for (let index = 0; index < planar.length; index += 1) {
  		const s = source.points[index];
  		const t = target.points[index];
  		rows.push(-s.u, -s.v, -1, 0, 0, 0, t.x * s.u, t.x * s.v, t.x);
  		rows.push(0, 0, 0, -s.u, -s.v, -1, t.y * s.u, t.y * s.v, t.y);
  	}
  	const a = rows;
  	const count = planar.length * 2;
  	const { vectors } = symmetricEigen(multiply(transpose(a, count, 9), a, 9, count, 9), 9);
  	const h = columnOf(vectors, 9, 0);
  	if (!h.every((value) => Number.isFinite(value))) return void 0;
  	const undone = multiply(multiply(target.inverse, h, 3, 3, 3), source.matrix, 3, 3, 3);
  	const scale = undone[8] ?? 0;
  	if (scale === 0 || !Number.isFinite(scale)) return void 0;
  	return undone.map((value) => value / scale);
  }
  /**
  * Splits a homography into a rotation and a translation.
  *
  * The first two columns are the images of the plane's axes, so they carry the
  * same scale as the translation; the third rotation column is their cross
  * product. The result is only approximately orthonormal, so it is squared up
  * before use and refined afterwards.
  */
  function poseFromHomography(homography) {
  	const h1 = [
  		homography[0] ?? 0,
  		homography[3] ?? 0,
  		homography[6] ?? 0
  	];
  	const h2 = [
  		homography[1] ?? 0,
  		homography[4] ?? 0,
  		homography[7] ?? 0
  	];
  	const h3 = [
  		homography[2] ?? 0,
  		homography[5] ?? 0,
  		homography[8] ?? 0
  	];
  	const norm1 = length(h1);
  	const norm2 = length(h2);
  	if (!(norm1 > 0) || !(norm2 > 0)) return void 0;
  	const scale = 2 / (norm1 + norm2);
  	let r1 = h1.map((value) => value * scale);
  	let r2 = h2.map((value) => value * scale);
  	let t = h3.map((value) => value * scale);
  	if ((t[2] ?? 0) < 0) {
  		r1 = r1.map((value) => -value);
  		r2 = r2.map((value) => -value);
  		t = t.map((value) => -value);
  	}
  	const rotation = orthonormalize(r1, r2);
  	return rotation ? {
  		rotation,
  		translation: t
  	} : void 0;
  }
  /**
  * The other pose a planar target allows.
  *
  * Two board orientations project a plane almost identically: tilted one way
  * about an axis lying in the image, and tilted the same amount the other way.
  * The second is built by reflecting the board's normal about the ray through
  * its centre and turning the board by the smallest rotation that does it, which
  * leaves the in-plane orientation alone. The board's centre is held where it
  * was, so the two solutions differ in tilt and not in where the thing is.
  *
  * As the tilt goes to zero the reflected normal converges on the original and
  * the second solution becomes the first. That is not a failure of the
  * construction but the shape of the problem: a target showing little
  * perspective does not determine which way it leans.
  */
  function reflectAboutLineOfSight(pose, planar) {
  	const centre = centroidInCamera(pose, planar);
  	const view = normalizeVector(centre);
  	if (!view) return void 0;
  	const normal = [
  		pose.rotation[2] ?? 0,
  		pose.rotation[5] ?? 0,
  		pose.rotation[8] ?? 0
  	];
  	const projection = dot(normal, view);
  	const turn = rotationBetween(normal, normal.map((value, index) => 2 * projection * (view[index] ?? 0) - value));
  	if (!turn) return void 0;
  	const rotation = multiply(turn, pose.rotation, 3, 3, 3);
  	const planarCentre = planarCentroid(planar);
  	return {
  		rotation,
  		translation: [
  			0,
  			1,
  			2
  		].map((row) => (centre[row] ?? 0) - ((rotation[row * 3] ?? 0) * planarCentre.u + (rotation[row * 3 + 1] ?? 0) * planarCentre.v))
  	};
  }
  /** The smallest rotation taking one unit vector onto another. */
  function rotationBetween(from, to) {
  	const a = normalizeVector(from);
  	const b = normalizeVector(to);
  	if (!a || !b) return void 0;
  	const axis = cross(a, b);
  	const sine = length(axis);
  	const cosine = Math.min(1, Math.max(-1, dot(a, b)));
  	if (sine < 1e-12) return cosine > 0 ? [
  		1,
  		0,
  		0,
  		0,
  		1,
  		0,
  		0,
  		0,
  		1
  	] : void 0;
  	return rotationMatrix(axis.map((value) => value / sine * Math.atan2(sine, cosine)));
  }
  function planarCentroid(planar) {
  	let u = 0;
  	let v = 0;
  	for (const point of planar) {
  		u += point.u;
  		v += point.v;
  	}
  	return {
  		u: u / planar.length,
  		v: v / planar.length
  	};
  }
  /**
  * Levenberg-Marquardt on the six pose parameters.
  *
  * The Jacobian is taken numerically. With six parameters and a handful of
  * points the cost is nothing, and a hand-written analytic Jacobian is a place
  * for a sign error to hide where it would look like a slightly worse fit.
  */
  function refine(initial, planar, image, intrinsics, distortion) {
  	let parameters = [...rotationVector(initial.rotation), ...initial.translation];
  	let lambda = .001;
  	let current = residualsOf(parameters, planar, image, intrinsics, distortion);
  	let cost = sumSquares(current);
  	for (let step = 0; step < REFINE_STEPS; step += 1) {
  		const jacobian = jacobianOf(parameters, planar, image, intrinsics, distortion);
  		const jt = transpose(jacobian, current.length, 6);
  		const jtj = multiply(jt, jacobian, 6, current.length, 6);
  		const jtr = multiply(jt, current, 6, current.length, 1);
  		let applied = false;
  		for (let attempt = 0; attempt < 8; attempt += 1) {
  			const damped = [...jtj];
  			for (let index = 0; index < 6; index += 1) damped[index * 6 + index] = (damped[index * 6 + index] ?? 0) * (1 + lambda);
  			const delta = solveSymmetric(damped, jtr, 6);
  			if (!delta) {
  				lambda *= 10;
  				continue;
  			}
  			const candidate = parameters.map((value, index) => value - (delta[index] ?? 0));
  			const candidateResiduals = residualsOf(candidate, planar, image, intrinsics, distortion);
  			const candidateCost = sumSquares(candidateResiduals);
  			if (candidateCost < cost) {
  				parameters = candidate;
  				current = candidateResiduals;
  				cost = candidateCost;
  				lambda = Math.max(lambda / 10, 1e-12);
  				applied = true;
  				break;
  			}
  			lambda *= 10;
  		}
  		if (!applied) break;
  	}
  	const rotation = rotationMatrix(parameters.slice(0, 3));
  	const translation = parameters.slice(3, 6);
  	const errors = pointErrors(current);
  	return {
  		rotation,
  		translation,
  		reprojectionRmsPx: Math.sqrt(cost / Math.max(1, errors.length)),
  		reprojectionMaxPx: errors.length === 0 ? 0 : Math.max(...errors)
  	};
  }
  /**
  * How much the marking accuracy of the points could have moved the pose.
  *
  * The inverse of JᵀJ scaled by a measurement variance is the usual covariance,
  * and a flat minimum -- the near square-on view -- turns a small marking error
  * into a large pose error, which is what this is for.
  *
  * The variance is the larger of what the residuals show and what the points
  * were marked to. Taking only the residuals reports certainty that does not
  * exist: a solve fitted to points placed by hand can leave almost no residual
  * and still be a guess, and synthetic points leave none at all.
  */
  function poseUncertainty(pose, planar, image, intrinsics, distortion, imageSigmaPx = DEFAULT_IMAGE_SIGMA_PX) {
  	const parameters = [...rotationVector(pose.rotation), ...pose.translation];
  	const residuals = residualsOf(parameters, planar, image, intrinsics, distortion);
  	const degreesOfFreedom = Math.max(1, residuals.length - 6);
  	const variance = Math.max(sumSquares(residuals) / degreesOfFreedom, imageSigmaPx ** 2);
  	const jacobian = jacobianOf(parameters, planar, image, intrinsics, distortion);
  	const { values, vectors } = symmetricEigen(multiply(transpose(jacobian, residuals.length, 6), jacobian, 6, residuals.length, 6), 6);
  	let rotationVariance = 0;
  	let translationVariance = 0;
  	for (let mode = 0; mode < 6; mode += 1) {
  		const eigenvalue = values[mode] ?? 0;
  		if (!(eigenvalue > 1e-12)) return {
  			translationSigmaMeters: Number.POSITIVE_INFINITY,
  			rotationSigmaDeg: Number.POSITIVE_INFINITY
  		};
  		const vector = columnOf(vectors, 6, mode);
  		const share = variance / eigenvalue;
  		for (let index = 0; index < 3; index += 1) {
  			rotationVariance += share * (vector[index] ?? 0) ** 2;
  			translationVariance += share * (vector[index + 3] ?? 0) ** 2;
  		}
  	}
  	return {
  		translationSigmaMeters: Math.sqrt(translationVariance),
  		rotationSigmaDeg: Math.sqrt(rotationVariance) * 180 / Math.PI
  	};
  }
  function rigidFromPose(pose) {
  	const r = pose.rotation;
  	const t = pose.translation;
  	return [
  		r[0] ?? 0,
  		r[1] ?? 0,
  		r[2] ?? 0,
  		t[0] ?? 0,
  		r[3] ?? 0,
  		r[4] ?? 0,
  		r[5] ?? 0,
  		t[1] ?? 0,
  		r[6] ?? 0,
  		r[7] ?? 0,
  		r[8] ?? 0,
  		t[2] ?? 0,
  		0,
  		0,
  		0,
  		1
  	];
  }
  function residualsOf(parameters, planar, image, intrinsics, distortion) {
  	const rotation = rotationMatrix(parameters.slice(0, 3));
  	const translation = parameters.slice(3, 6);
  	const residuals = [];
  	for (let index = 0; index < planar.length; index += 1) {
  		const point = planar[index];
  		const observed = image[index];
  		const camera = [
  			(rotation[0] ?? 0) * point.u + (rotation[1] ?? 0) * point.v + (translation[0] ?? 0),
  			(rotation[3] ?? 0) * point.u + (rotation[4] ?? 0) * point.v + (translation[1] ?? 0),
  			(rotation[6] ?? 0) * point.u + (rotation[7] ?? 0) * point.v + (translation[2] ?? 0)
  		];
  		const z = camera[2] ?? 0;
  		if (!(Math.abs(z) > 1e-9)) {
  			residuals.push(1e6, 1e6);
  			continue;
  		}
  		const projected = project({
  			x: (camera[0] ?? 0) / z,
  			y: (camera[1] ?? 0) / z
  		}, intrinsics, distortion);
  		residuals.push(projected.u - observed.u, projected.v - observed.v);
  	}
  	return residuals;
  }
  function jacobianOf(parameters, planar, image, intrinsics, distortion) {
  	const rows = planar.length * 2;
  	const jacobian = new Array(rows * 6).fill(0);
  	for (let column = 0; column < 6; column += 1) {
  		const step = column < 3 ? 1e-7 : 1e-7 * Math.max(1, Math.abs(parameters[column] ?? 0));
  		const forward = [...parameters];
  		const backward = [...parameters];
  		forward[column] = (forward[column] ?? 0) + step;
  		backward[column] = (backward[column] ?? 0) - step;
  		const plus = residualsOf(forward, planar, image, intrinsics, distortion);
  		const minus = residualsOf(backward, planar, image, intrinsics, distortion);
  		for (let row = 0; row < rows; row += 1) jacobian[row * 6 + column] = ((plus[row] ?? 0) - (minus[row] ?? 0)) / (2 * step);
  	}
  	return jacobian;
  }
  function pointErrors(residuals) {
  	const errors = [];
  	for (let index = 0; index < residuals.length; index += 2) errors.push(Math.hypot(residuals[index] ?? 0, residuals[index + 1] ?? 0));
  	return errors;
  }
  function sumSquares(values) {
  	return values.reduce((total, value) => total + value * value, 0);
  }
  /** The angle of the rotation taking one orientation onto the other. */
  function angleBetweenDeg(left, right) {
  	let trace = 0;
  	for (let index = 0; index < 3; index += 1) for (let k = 0; k < 3; k += 1) if (index === 0) trace += 0;
  	trace = 0;
  	for (let index = 0; index < 3; index += 1) {
  		let total = 0;
  		for (let k = 0; k < 3; k += 1) total += (left[k * 3 + index] ?? 0) * (right[k * 3 + index] ?? 0);
  		trace += total;
  	}
  	const cosine = Math.min(1, Math.max(-1, (trace - 1) / 2));
  	return Math.acos(cosine) * 180 / Math.PI;
  }
  function centroidInCamera(pose, planar) {
  	let u = 0;
  	let v = 0;
  	for (const point of planar) {
  		u += point.u;
  		v += point.v;
  	}
  	u /= planar.length;
  	v /= planar.length;
  	const r = pose.rotation;
  	const t = pose.translation;
  	return [
  		(r[0] ?? 0) * u + (r[1] ?? 0) * v + (t[0] ?? 0),
  		(r[3] ?? 0) * u + (r[4] ?? 0) * v + (t[1] ?? 0),
  		(r[6] ?? 0) * u + (r[7] ?? 0) * v + (t[2] ?? 0)
  	];
  }
  function orthonormalize(r1, r2) {
  	const a = normalizeVector(r1);
  	if (!a) return void 0;
  	const projection = dot(r2, a);
  	const b = normalizeVector(r2.map((value, index) => value - projection * (a[index] ?? 0)));
  	if (!b) return void 0;
  	const c = cross(a, b);
  	return [
  		a[0] ?? 0,
  		b[0] ?? 0,
  		c[0] ?? 0,
  		a[1] ?? 0,
  		b[1] ?? 0,
  		c[1] ?? 0,
  		a[2] ?? 0,
  		b[2] ?? 0,
  		c[2] ?? 0
  	];
  }
  function rotationVector(rotation) {
  	const trace = (rotation[0] ?? 0) + (rotation[4] ?? 0) + (rotation[8] ?? 0);
  	const cosine = Math.min(1, Math.max(-1, (trace - 1) / 2));
  	const angle = Math.acos(cosine);
  	if (angle < 1e-9) return [
  		0,
  		0,
  		0
  	];
  	const sine = Math.sin(angle);
  	if (Math.abs(sine) < 1e-9) return [
  		Math.sqrt(Math.max(0, ((rotation[0] ?? 0) + 1) / 2)),
  		Math.sqrt(Math.max(0, ((rotation[4] ?? 0) + 1) / 2)),
  		Math.sqrt(Math.max(0, ((rotation[8] ?? 0) + 1) / 2))
  	].map((value) => value * angle);
  	const factor = angle / (2 * sine);
  	return [
  		((rotation[7] ?? 0) - (rotation[5] ?? 0)) * factor,
  		((rotation[2] ?? 0) - (rotation[6] ?? 0)) * factor,
  		((rotation[3] ?? 0) - (rotation[1] ?? 0)) * factor
  	];
  }
  function rotationMatrix(vector) {
  	const angle = length(vector);
  	if (angle < 1e-12) return [
  		1,
  		0,
  		0,
  		0,
  		1,
  		0,
  		0,
  		0,
  		1
  	];
  	const axis = vector.map((value) => value / angle);
  	const c = Math.cos(angle);
  	const s = Math.sin(angle);
  	const t = 1 - c;
  	const [x, y, z] = [
  		axis[0] ?? 0,
  		axis[1] ?? 0,
  		axis[2] ?? 0
  	];
  	return [
  		t * x * x + c,
  		t * x * y - s * z,
  		t * x * z + s * y,
  		t * x * y + s * z,
  		t * y * y + c,
  		t * y * z - s * x,
  		t * x * z - s * y,
  		t * y * z + s * x,
  		t * z * z + c
  	];
  }
  function conditionPlanar(points) {
  	let cu = 0;
  	let cv = 0;
  	for (const point of points) {
  		cu += point.u;
  		cv += point.v;
  	}
  	cu /= points.length;
  	cv /= points.length;
  	let spread = 0;
  	for (const point of points) spread += Math.hypot(point.u - cu, point.v - cv);
  	const scale = spread > 0 ? points.length * Math.SQRT2 / spread : 1;
  	return {
  		points: points.map((point) => ({
  			u: (point.u - cu) * scale,
  			v: (point.v - cv) * scale
  		})),
  		matrix: [
  			scale,
  			0,
  			-scale * cu,
  			0,
  			scale,
  			-scale * cv,
  			0,
  			0,
  			1
  		]
  	};
  }
  function conditionNormalized(points) {
  	let cx = 0;
  	let cy = 0;
  	for (const point of points) {
  		cx += point.x;
  		cy += point.y;
  	}
  	cx /= points.length;
  	cy /= points.length;
  	let spread = 0;
  	for (const point of points) spread += Math.hypot(point.x - cx, point.y - cy);
  	const scale = spread > 0 ? points.length * Math.SQRT2 / spread : 1;
  	return {
  		points: points.map((point) => ({
  			x: (point.x - cx) * scale,
  			y: (point.y - cy) * scale
  		})),
  		inverse: [
  			1 / scale,
  			0,
  			cx,
  			0,
  			1 / scale,
  			cy,
  			0,
  			0,
  			1
  		]
  	};
  }
  function normalizeVector(vector) {
  	const norm = length(vector);
  	return norm > 0 ? vector.map((value) => value / norm) : void 0;
  }
  function cross(a, b) {
  	return [
  		(a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0),
  		(a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
  		(a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0)
  	];
  }
  function dot(a, b) {
  	return (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
  }
  function length(vector) {
  	return Math.sqrt(dot(vector, vector));
  }
  //#endregion
  //#region src/placement/solve.ts
  var DEFAULT_MINIMUM_ERROR_RATIO = 2;
  /**
  * Places every camera that saw the reference, and the cameras against each other.
  *
  * A pose is refused when the two planar solutions fit within a factor of each
  * other, however small the residual is. A residual says the pose explains the
  * image; it does not say the image picked that pose out of the alternatives,
  * and for a target showing little perspective it does not.
  */
  function solvePlacement(options) {
  	const planar = toPlanarReference(options.reference);
  	if (!planar.ok) return {
  		ok: false,
  		code: "reference-unknown",
  		message: planar.message
  	};
  	const reference = planar.reference;
  	const byId = new Map(reference.ids.map((id, index) => [id, index]));
  	const minimumRatio = options.minimumErrorRatio ?? DEFAULT_MINIMUM_ERROR_RATIO;
  	const cameras = [];
  	const poses = /* @__PURE__ */ new Map();
  	const notes = [];
  	let degraded = false;
  	for (const observation of options.observations) {
  		if (observation.referenceId !== reference.referenceId) return {
  			ok: false,
  			code: "reference-unknown",
  			message: `Camera ${observation.cameraId} observed ${observation.referenceId}, not ${reference.referenceId}.`
  		};
  		const model = options.models[observation.cameraId];
  		if (!model) return {
  			ok: false,
  			code: "intrinsic-profile-mismatch",
  			message: `No camera model was supplied for ${observation.cameraId}.`
  		};
  		requireSupportedDistortion(model.distortion);
  		if (model.intrinsicProfileId !== void 0 && model.intrinsicProfileId !== observation.intrinsicProfileId) return {
  			ok: false,
  			code: "intrinsic-profile-mismatch",
  			message: `Camera ${observation.cameraId} was observed through profile ${observation.intrinsicProfileId} but its model comes from ${model.intrinsicProfileId}.`
  		};
  		if (model.imageWidth !== void 0 && model.imageWidth !== observation.imageWidth || model.imageHeight !== void 0 && model.imageHeight !== observation.imageHeight) return {
  			ok: false,
  			code: "intrinsic-profile-mismatch",
  			message: `Camera ${observation.cameraId} was observed at ${observation.imageWidth}x${observation.imageHeight} but its model describes ${model.imageWidth}x${model.imageHeight}.`
  		};
  		const paired = pairPoints(observation, byId, reference);
  		if (!paired) return {
  			ok: false,
  			code: "insufficient-points",
  			message: `Camera ${observation.cameraId} did not mark at least four of the reference points.`
  		};
  		const solution = solvePlanarPose(paired.planar, paired.image, model.intrinsics, model.distortion, options.imageSigmaPx);
  		if (!solution) return {
  			ok: false,
  			code: "degenerate-view",
  			message: `Camera ${observation.cameraId} produced no pose: its marks may be collinear.`
  		};
  		if (solution.errorRatio < minimumRatio) return {
  			ok: false,
  			code: "degenerate-view",
  			message: `Camera ${observation.cameraId} fits two poses about equally well (${solution.errorRatio.toFixed(2)}x apart), so the measurement does not choose between them. Tilt the reference or bring it closer.`
  		};
  		const sigma = poseUncertainty(solution.best, paired.planar, paired.image, model.intrinsics, model.distortion, options.imageSigmaPx);
  		const scaleShare = reference.extentMeters > 0 ? reference.sigmaMeters / reference.extentMeters * Math.hypot(...solution.best.translation) : 0;
  		const cameraFromReference = composeRigidTransforms(rigidFromPose(solution.best), planarFromReference(reference));
  		poses.set(observation.cameraId, cameraFromReference);
  		cameras.push({
  			cameraId: observation.cameraId,
  			cameraFromReference,
  			reprojectionRmsPx: round(solution.best.reprojectionRmsPx),
  			reprojectionMaxPx: round(solution.best.reprojectionMaxPx),
  			pointCount: paired.planar.length,
  			...Number.isFinite(solution.errorRatio) ? { ippeErrorRatio: round(solution.errorRatio) } : {},
  			translationSigmaMeters: round(Math.hypot(sigma.translationSigmaMeters, scaleShare)),
  			rotationSigmaDeg: round(sigma.rotationSigmaDeg)
  		});
  	}
  	if (cameras.length === 0) return {
  		ok: false,
  		code: "insufficient-points",
  		message: "No camera observed the reference."
  	};
  	if (reference.planarityResidualMeters > reference.sigmaMeters * 5) {
  		degraded = true;
  		notes.push(`The reference points sit up to ${reference.planarityResidualMeters.toFixed(4)} m off their best plane, which is beyond how well they were measured.`);
  	}
  	const pairs = [];
  	const ids = [...poses.keys()];
  	for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
  		const from = ids[i];
  		const to = ids[j];
  		const fromPose = poses.get(from);
  		const toPose = poses.get(to);
  		const toFromFrom = composeRigidTransforms(toPose, invertRigidTransform(fromPose));
  		const baseline = baselineMeters(fromPose, toPose);
  		const sigmaFrom = cameras.find((entry) => entry.cameraId === from)?.translationSigmaMeters ?? 0;
  		const sigmaTo = cameras.find((entry) => entry.cameraId === to)?.translationSigmaMeters ?? 0;
  		pairs.push({
  			from,
  			to,
  			toFromFrom: toFromFrom.map(round),
  			baselineMeters: round(baseline),
  			baselineSigmaMeters: round(Math.hypot(sigmaFrom, sigmaTo))
  		});
  	}
  	const verification = [];
  	for (const check of options.verification ?? []) {
  		const fromPose = poses.get(check.a);
  		const toPose = poses.get(check.b);
  		if (!fromPose || !toPose) return {
  			ok: false,
  			code: "verification-failed",
  			message: `The distance check names ${check.a} and ${check.b}, and one of them has no placement.`
  		};
  		const measured = baselineMeters(fromPose, toPose);
  		verification.push({
  			kind: "distance",
  			a: check.a,
  			b: check.b,
  			expectedMeters: check.expectedMeters,
  			measuredMeters: round(measured),
  			residualMeters: round(measured - check.expectedMeters)
  		});
  	}
  	return {
  		ok: true,
  		result: {
  			schema: PLACEMENT_RESULT_SCHEMA,
  			version: 1,
  			referenceId: reference.referenceId,
  			rigId: options.rigId,
  			cameras,
  			pairs,
  			verification,
  			degraded,
  			notes
  		}
  	};
  }
  /**
  * The rigid map from reference coordinates into the plane's own basis.
  *
  * A planar pose treats the plane as z = 0 with its third axis the cross product
  * of the two in-plane axes. The fitted plane normal is only known up to sign, so
  * it is not used here: taking it as found would make the map a reflection for
  * half of all references, and a reflected pose still reprojects perfectly.
  */
  function planarFromReference(reference) {
  	const u = reference.axisU;
  	const v = reference.axisV;
  	const rows = [
  		u,
  		v,
  		[
  			(u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
  			(u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
  			(u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0)
  		]
  	];
  	const o = reference.origin;
  	return [
  		...rows.flatMap((row) => [
  			row[0] ?? 0,
  			row[1] ?? 0,
  			row[2] ?? 0,
  			-((row[0] ?? 0) * (o[0] ?? 0) + (row[1] ?? 0) * (o[1] ?? 0) + (row[2] ?? 0) * (o[2] ?? 0))
  		]),
  		0,
  		0,
  		0,
  		1
  	];
  }
  /**
  * Matches marked image points to measured reference points by name.
  *
  * Only the points both sides name are used. A mark whose name is not in the
  * reference is dropped rather than matched by position: matching by order is
  * how a mislabelled corner becomes a rotated placement that still reprojects
  * neatly.
  */
  function pairPoints(observation, byId, reference) {
  	const planar = [];
  	const image = [];
  	for (const mark of observation.imagePoints) {
  		const index = byId.get(mark.id);
  		if (index === void 0) continue;
  		const point = reference.planar[index];
  		if (!point) continue;
  		planar.push({
  			u: point.u,
  			v: point.v
  		});
  		image.push({
  			u: mark.u,
  			v: mark.v
  		});
  	}
  	return planar.length >= 4 ? {
  		planar,
  		image
  	} : void 0;
  }
  /**
  * Trims the published numbers to a precision a camera could support.
  *
  * Nine decimals on a metre is a nanometre, which is not a measurement but the
  * tail of an iterative solve, and it differs between machines that agree about
  * everything that matters. Six is a micrometre: far finer than any of this can
  * see, and stable.
  */
  function round(value) {
  	return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
  }
  //#endregion
  //#region src/placement/pattern-reference.ts
  /**
  * The reference a projected time pattern provides, from four tape measurements.
  *
  * The pattern's outer corners are what `measurePatternCorners` finds in each
  * camera, and they are named the same way here: `tl`, `tr`, `br`, `bl`, the
  * outer corners of the four lit corner cells in the orientation the pattern is
  * drawn. They are listed individually because a projection onto a wall is a
  * general quadrilateral; see ReferenceDefinition.
  */
  var PATTERN_REFERENCE_POINT_IDS = [
  	"tl",
  	"tr",
  	"br",
  	"bl"
  ];
  /**
  * Builds and validates the reference, or returns undefined.
  *
  * The wall is the plane z = 0 and the two in-plane axes are the operator's
  * choice -- x right and y up, or y down -- as long as they are at right angles
  * and in metres. Both choices describe the same physical corners; the solve
  * works in the plane's own basis and reports poses in whichever was given.
  *
  * Refused rather than repaired: four corners that are not numbers, do not form
  * a simple convex outline, or fail the placement-reference contract give
  * undefined. A reference quietly completed from a malformed measurement is a
  * wrong scale that nothing downstream can detect.
  */
  function buildPatternReference(input) {
  	const corners = parseCorners(input.corners);
  	if (!corners || !isConvexQuadrilateral(corners)) return void 0;
  	if (!Number.isFinite(input.sigmaMeters)) return void 0;
  	const parsed = parseReferenceDefinition({
  		schema: PLACEMENT_REFERENCE_SCHEMA,
  		version: 1,
  		referenceId: input.referenceId.trim(),
  		kind: "projection",
  		points: corners.map((corner, index) => ({
  			id: PATTERN_REFERENCE_POINT_IDS[index],
  			x: corner.x,
  			y: corner.y,
  			z: 0,
  			sigmaMeters: input.sigmaMeters
  		})),
  		planarityResidualMeters: 0,
  		rectangularityResidualMeters: roundMeters(rectangularityResidual(corners)),
  		measuredBy: input.measuredBy.trim(),
  		notes: ["Outer corners of the lit corner cells of the projected time pattern, named in the orientation it is drawn."]
  	});
  	return parsed.ok ? parsed.value : void 0;
  }
  function parseCorners(text) {
  	const parts = text.split(";");
  	if (parts.length !== 4) return void 0;
  	const corners = [];
  	for (const part of parts) {
  		const values = part.split(",");
  		if (values.length !== 2) return void 0;
  		const [x, y] = values.map((value) => value.trim() === "" ? NaN : Number(value));
  		if (!Number.isFinite(x) || !Number.isFinite(y)) return void 0;
  		corners.push({
  			x,
  			y
  		});
  	}
  	return corners;
  }
  /**
  * Whether the corners, in the order given, trace a simple convex outline.
  *
  * Every turn has the same sense and none is straight. A crossed order -- two
  * corners swapped -- turns both ways, and a solve against it would fit a pose
  * to corners that were never where they are said to be.
  */
  function isConvexQuadrilateral(corners) {
  	let sign = 0;
  	for (let index = 0; index < 4; index += 1) {
  		const a = corners[index];
  		const b = corners[(index + 1) % 4];
  		const c = corners[(index + 2) % 4];
  		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  		if (!(Math.abs(cross) > 0)) return false;
  		const turn = Math.sign(cross);
  		if (sign === 0) sign = turn;
  		else if (turn !== sign) return false;
  	}
  	return true;
  }
  /**
  * How far the outline departs from a rectangle, in metres.
  *
  * The largest distance from a measured corner to the matching corner of the
  * rectangle that fits all four best in the least squares sense, with its
  * centre, rotation, width and height all free. It is zero exactly when the
  * corners form a rectangle, it is in the same units as the tape, and it does
  * not depend on where the axes were put. A diagonal difference, the obvious
  * alternative, is zero for any isosceles trapezoid, which is the shape a
  * projector tilted up at a wall throws.
  *
  * The fit has a closed form. With the centroid removed, the corners are
  * compared with `±w/2 e1 ± h/2 e2`, signs fixed by the corner names. For a
  * given direction e1 the best width and height are projections, and the
  * direction that leaves least error is the principal eigenvector of a 2x2
  * matrix built from two sign-weighted sums of the corners.
  */
  function rectangularityResidual(corners) {
  	const centre = {
  		x: corners.reduce((total, corner) => total + corner.x, 0) / 4,
  		y: corners.reduce((total, corner) => total + corner.y, 0) / 4
  	};
  	const q = corners.map((corner) => ({
  		x: corner.x - centre.x,
  		y: corner.y - centre.y
  	}));
  	const signs = [
  		[-1, -1],
  		[1, -1],
  		[1, 1],
  		[-1, 1]
  	];
  	let X = {
  		x: 0,
  		y: 0
  	};
  	let Y = {
  		x: 0,
  		y: 0
  	};
  	q.forEach((point, index) => {
  		const [sx, sy] = signs[index];
  		X = {
  			x: X.x + sx * point.x,
  			y: X.y + sx * point.y
  		};
  		Y = {
  			x: Y.x + sy * point.x,
  			y: Y.y + sy * point.y
  		};
  	});
  	const Z = {
  		x: Y.y,
  		y: -Y.x
  	};
  	const m00 = X.x * X.x + Z.x * Z.x;
  	const m01 = X.x * X.y + Z.x * Z.y;
  	const m11 = X.y * X.y + Z.y * Z.y;
  	const angle = .5 * Math.atan2(2 * m01, m00 - m11);
  	const e1 = {
  		x: Math.cos(angle),
  		y: Math.sin(angle)
  	};
  	const e2 = {
  		x: -e1.y,
  		y: e1.x
  	};
  	const halfWidth = (X.x * e1.x + X.y * e1.y) / 4;
  	const halfHeight = (Y.x * e2.x + Y.y * e2.y) / 4;
  	let worst = 0;
  	q.forEach((point, index) => {
  		const [sx, sy] = signs[index];
  		const fitX = sx * halfWidth * e1.x + sy * halfHeight * e2.x;
  		const fitY = sx * halfWidth * e1.y + sy * halfHeight * e2.y;
  		worst = Math.max(worst, Math.hypot(point.x - fitX, point.y - fitY));
  	});
  	return worst;
  }
  /** A micrometre: well below what a tape can resolve, and stable across machines. */
  function roundMeters(value) {
  	return Number(value.toFixed(6));
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
  /**
  * The profiles a project may choose between, by the id each one publishes.
  *
  * Listed explicitly rather than accepting a profile document: a display and a
  * decoder on different computers only agree if both chose from the same fixed
  * set, and an id is what travels in every observation.
  */
  var PATTERN_PROFILES = new Map([PATTERN_PROFILE_V1, PATTERN_PROFILE_V2].map((profile) => [profile.id, profile]));
  var TimeSpaceSyncExtension = class {
  	constructor(options = {}) {
  		this.profileErrorCode = "";
  		this.cornerErrorCode = "";
  		this.cornerSpread = 0;
  		this.correspondenceError = "";
  		this.placementObservations = [];
  		this.cameraModels = /* @__PURE__ */ new Map();
  		this.placementErrorCode = "";
  		this.runtime = options.runtime ?? Scratch.vm?.runtime ?? {};
  		this.opticalTimeEnabled = options.opticalTimeEnabled ?? featureFlags.opticalTimeSyncV1;
  		this.placementEnabled = options.placementEnabled ?? featureFlags.placementSolveV1;
  		this.defaultProfile = options.profile ?? PATTERN_PROFILE_V1;
  		this.profile = this.defaultProfile;
  		this.clock = options.clock ?? new SessionClock(new LocalMonotonicClock());
  		this.display = options.display;
  		this.controller = options.controller;
  		this.injectedDisplay = options.display !== void 0;
  		this.injectedController = options.controller !== void 0;
  		this.createFramePump = options.createFramePump;
  		this.createRegionReader = options.createRegionReader;
  		this.schedule = options.schedule;
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
  	/**
  	* Chooses the pattern the display draws and the decoder reads.
  	*
  	* Only before either exists. A display already drawing one pattern, or a
  	* decoder already calibrated against it, would otherwise carry on with the
  	* old one while the reporter named the new one -- and a display and decoder
  	* on different profiles decode nothing, with no error to say why. A refusal
  	* changes nothing and leaves its reason in `time pattern profile error`.
  	*/
  	setTimePatternProfile(args) {
  		this.requireOpticalTime();
  		const id = Scratch.Cast.toString(args.PROFILE_ID).trim();
  		const profile = PATTERN_PROFILES.get(id);
  		if (!profile) {
  			this.profileErrorCode = "unknown-pattern-profile";
  			return;
  		}
  		if ([this.display?.patternProfile(), this.controller?.patternProfile()].find((existing) => existing !== void 0 && existing.id !== profile.id)) {
  			this.profileErrorCode = "pattern-profile-in-use";
  			return;
  		}
  		this.profile = profile;
  		this.profileErrorCode = "";
  	}
  	timePatternProfileError() {
  		return this.profileErrorCode;
  	}
  	async startOpticalTimeDecoder(args) {
  		this.requireOpticalTime();
  		await this.requireController().start({
  			cameraId: Scratch.Cast.toString(args.CAMERA_ID),
  			referenceId: Scratch.Cast.toString(args.REFERENCE_ID),
  			calibrationSeconds: Scratch.Cast.toNumber(args.SECONDS),
  			displayRefreshUs: Math.round(Scratch.Cast.toNumber(args.REFRESH_US)),
  			refreshUncertaintyUs: this.refreshUncertaintyUs()
  		});
  	}
  	async calibrateOpticalTimeDecoder(args) {
  		this.requireOpticalTime();
  		await this.requireController().recalibrate(Scratch.Cast.toNumber(args.SECONDS));
  	}
  	async stopOpticalTimeDecoder() {
  		this.cancelCornerMeasurement("The optical time decoder was stopped.");
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
  	estimateTimeCorrespondence() {
  		this.requireOpticalTime();
  		const controller = this.requireController();
  		const result = estimateTimeCorrespondence(controller.drainObservations(), {
  			nowUs: this.clock.nowUs(),
  			decodeRate: controller.decodeRate(),
  			droppedCount: controller.droppedCount(),
  			rejectedCount: controller.rejectedCount()
  		});
  		if (result.ok) {
  			this.correspondence = result.correspondence;
  			this.correspondenceError = "";
  			return;
  		}
  		this.correspondence = void 0;
  		this.correspondenceError = result.code;
  	}
  	timeCorrespondenceJson() {
  		return this.correspondence ? JSON.stringify(this.correspondence) : "";
  	}
  	timeCorrespondenceError() {
  		return this.correspondenceError;
  	}
  	displayToTimestampDelayUs() {
  		return this.correspondence?.displayToTimestampDelayUs ?? 0;
  	}
  	timeCorrespondenceUncertaintyUs() {
  		return this.correspondence?.uncertaintyUs ?? 0;
  	}
  	timeCorrespondenceCurrent() {
  		const correspondence = this.correspondence;
  		return correspondence !== void 0 && isCurrent(correspondence, this.clock.nowUs());
  	}
  	opticalTimeMinimumCalibrationSeconds() {
  		return this.requireController().minimumCalibrationSeconds();
  	}
  	defineReference(args) {
  		this.requirePlacement();
  		const parsed = parseReferenceDefinition(readJson(args.REFERENCE_JSON));
  		if (!parsed.ok) {
  			this.placementErrorCode = "invalid-payload";
  			return;
  		}
  		this.reference = parsed.value;
  		this.placementErrorCode = "";
  	}
  	addPlacementObservation(args) {
  		this.requirePlacement();
  		const parsed = parsePlacementObservation(readJson(args.OBSERVATION_JSON));
  		if (!parsed.ok) {
  			this.placementErrorCode = "invalid-payload";
  			return;
  		}
  		const index = this.placementObservations.findIndex((entry) => entry.cameraId === parsed.value.cameraId);
  		if (index >= 0) this.placementObservations.splice(index, 1);
  		this.placementObservations.push(parsed.value);
  		this.placementErrorCode = "";
  	}
  	setCameraModel(args) {
  		this.requirePlacement();
  		const cameraId = Scratch.Cast.toString(args.CAMERA_ID).trim();
  		if (!cameraId) {
  			this.placementErrorCode = "invalid-payload";
  			return;
  		}
  		const parsed = parseCameraModel(readJson(args.MODEL_JSON));
  		if (!parsed.ok) {
  			this.placementErrorCode = parsed.code;
  			return;
  		}
  		const model = {
  			intrinsics: parsed.intrinsics,
  			distortion: parsed.distortion,
  			...parsed.intrinsicProfileId === void 0 ? {} : { intrinsicProfileId: parsed.intrinsicProfileId },
  			...parsed.imageWidth === void 0 ? {} : { imageWidth: parsed.imageWidth },
  			...parsed.imageHeight === void 0 ? {} : { imageHeight: parsed.imageHeight }
  		};
  		try {
  			requireSupportedDistortion(model.distortion);
  		} catch (error) {
  			this.placementErrorCode = errorCodeOf(error);
  			return;
  		}
  		this.cameraModels.set(cameraId, model);
  		this.placementErrorCode = "";
  	}
  	/**
  	* The camera model for `set camera model`, built from Camera Source's calibration.
  	*
  	* Camera Source's own `camera intrinsics JSON` gives the pinhole numbers
  	* adapted to the current frame but leaves the distortion in the profile, so
  	* the two are joined here, on the computer that holds both, along with the
  	* profile id and frame size a solve checks observations against. Empty when
  	* Camera Source publishes no calibration, has no profile for the camera, or
  	* cannot adapt it to the frame being delivered.
  	*/
  	cameraModelJson(args) {
  		const cameraId = Scratch.Cast.toString(args.CAMERA_ID).trim();
  		const calibration = readCameraCalibration(this.runtime);
  		const profile = calibration?.profileFor(cameraId);
  		const intrinsics = calibration?.intrinsicsFor(cameraId);
  		if (!profile || !intrinsics) return "";
  		return JSON.stringify({
  			intrinsics: {
  				fx: intrinsics.fx,
  				fy: intrinsics.fy,
  				cx: intrinsics.cx,
  				cy: intrinsics.cy,
  				skew: intrinsics.skew
  			},
  			distortion: profile.distortion,
  			intrinsicProfileId: profile.profileId,
  			imageWidth: intrinsics.width,
  			imageHeight: intrinsics.height
  		});
  	}
  	/**
  	* Measures the pattern's four outer corners in this camera's full-resolution image.
  	*
  	* Needs the decoder running on a profile with corner fiducials, and a
  	* calibration profile for the camera in Camera Source: an observation is
  	* useless to a solve without the lens it was seen through. Never throws for a
  	* failed measurement; the reason is left in `pattern corner error`, and the
  	* previous observation is cleared so a stale one cannot be sent on as fresh.
  	*/
  	async measurePatternCorners(args) {
  		this.requirePlacement();
  		this.cancelCornerMeasurement("A new corner measurement replaced this one.");
  		this.cornerObservation = void 0;
  		this.cornerSpread = 0;
  		this.cornerErrorCode = "";
  		const controller = this.controller;
  		if (!controller || controller.state() !== "ready") {
  			this.cornerErrorCode = "decoder-not-running";
  			return;
  		}
  		const profile = controller.patternProfile();
  		if (profile.fiducials.length === 0) {
  			this.cornerErrorCode = "profile-without-fiducials";
  			return;
  		}
  		const cameraId = controller.cameraId();
  		const referenceId = controller.referenceId();
  		const intrinsicProfile = readCameraCalibration(this.runtime)?.profileFor(cameraId);
  		if (!intrinsicProfile) {
  			this.cornerErrorCode = "intrinsic-profile-missing";
  			return;
  		}
  		const element = controller.frameElement();
  		const running = measurePatternCorners({
  			source: controller,
  			profile,
  			seconds: Scratch.Cast.toNumber(args.SECONDS),
  			clock: this.clock.monotonic(),
  			createReader: () => this.createRegionReader ? this.createRegionReader(element) : new VideoRegionReader({ element: requireElement(element) }),
  			...this.schedule ? { schedule: this.schedule } : {}
  		});
  		this.cornerMeasurement = running;
  		const result = await running.result;
  		if (this.cornerMeasurement !== running) return;
  		this.cornerMeasurement = void 0;
  		if (!result.ok) {
  			this.cornerErrorCode = result.code;
  			this.cornerSpread = result.spreadPx ?? 0;
  			return;
  		}
  		const { measurement } = result;
  		this.cornerSpread = roundPixels(measurement.spreadPx);
  		const calibration = readCameraCalibration(this.runtime);
  		const profileNow = calibration?.profileFor(cameraId);
  		if (!profileNow) {
  			this.cornerErrorCode = "intrinsic-profile-missing";
  			return;
  		}
  		const intrinsics = calibration?.intrinsicsFor(cameraId);
  		if (profileNow.profileId !== intrinsicProfile.profileId || !intrinsics || intrinsics.width !== measurement.sourceWidth || intrinsics.height !== measurement.sourceHeight) {
  			this.cornerErrorCode = "intrinsic-profile-mismatch";
  			return;
  		}
  		const conditions = element ? readCaptureConditions(element) : {};
  		const parsed = parsePlacementObservation({
  			schema: PLACEMENT_OBSERVATION_SCHEMA,
  			version: 1,
  			cameraId,
  			referenceId,
  			intrinsicProfileId: profileNow.profileId,
  			imagePoints: measurement.corners.map((corner, index) => ({
  				id: PATTERN_CORNER_IDS[index],
  				u: roundPixels(corner.x),
  				v: roundPixels(corner.y)
  			})),
  			imageWidth: measurement.sourceWidth,
  			imageHeight: measurement.sourceHeight,
  			capturedAtUs: measurement.capturedAtUs,
  			conditions: {
  				...conditions.frameRate === void 0 ? {} : { frameRate: conditions.frameRate },
  				...conditions.exposureTimeUs === void 0 ? {} : { exposureTimeUs: conditions.exposureTimeUs }
  			}
  		});
  		if (!parsed.ok) {
  			this.cornerErrorCode = "invalid-payload";
  			return;
  		}
  		this.cornerObservation = parsed.value;
  	}
  	patternCornerObservationJson() {
  		return this.cornerObservation ? JSON.stringify(this.cornerObservation) : "";
  	}
  	patternCornerError() {
  		return this.cornerErrorCode;
  	}
  	patternCornerSpreadPx() {
  		return this.cornerSpread;
  	}
  	/**
  	* The reference the pattern's corners are measured against, from a tape.
  	*
  	* Empty when any corner is not a number, the four do not trace a convex
  	* outline in the order given, or the result would fail the contract.
  	*/
  	patternReferenceJson(args) {
  		this.requirePlacement();
  		const reference = buildPatternReference({
  			referenceId: Scratch.Cast.toString(args.REFERENCE_ID),
  			corners: Scratch.Cast.toString(args.CORNERS),
  			sigmaMeters: readFiniteNumber(args.SIGMA_METERS),
  			measuredBy: Scratch.Cast.toString(args.MEASURED_BY)
  		});
  		return reference ? JSON.stringify(reference) : "";
  	}
  	cancelCornerMeasurement(message) {
  		const running = this.cornerMeasurement;
  		if (!running) return;
  		this.cornerMeasurement = void 0;
  		running.cancel("decoder-not-running", message);
  		this.cornerErrorCode = "decoder-not-running";
  		this.cornerObservation = void 0;
  	}
  	solvePlacement(args) {
  		this.requirePlacement();
  		const reference = this.reference;
  		if (!reference) {
  			this.placementErrorCode = "reference-unknown";
  			return;
  		}
  		let result;
  		try {
  			result = solvePlacement({
  				reference,
  				observations: this.placementObservations,
  				models: Object.fromEntries(this.cameraModels),
  				rigId: Scratch.Cast.toString(args.RIG_ID)
  			});
  		} catch (error) {
  			this.placement = void 0;
  			this.placementErrorCode = errorCodeOf(error);
  			return;
  		}
  		if (result.ok) {
  			this.placement = result.result;
  			this.placementErrorCode = "";
  			return;
  		}
  		this.placement = void 0;
  		this.placementErrorCode = result.code;
  	}
  	placementResultJson() {
  		return this.placement ? JSON.stringify(this.placement) : "";
  	}
  	placementError() {
  		return this.placementErrorCode;
  	}
  	placementReprojectionRms(args) {
  		const cameraId = Scratch.Cast.toString(args.CAMERA_ID);
  		return this.placement?.cameras.find((camera) => camera.cameraId === cameraId)?.reprojectionRmsPx ?? 0;
  	}
  	clearPlacement() {
  		this.reference = void 0;
  		this.placementObservations.length = 0;
  		this.cameraModels.clear();
  		this.placement = void 0;
  		this.placementErrorCode = "";
  	}
  	requirePlacement() {
  		if (!this.placementEnabled) throw new TimeSpaceSyncError("invalid-payload", "Placement solve v1 is disabled. Enable it before the project starts.");
  	}
  	/**
  	* How well the display's refresh interval is known.
  	*
  	* When the pattern is being shown from this machine the display has measured
  	* the spread of its own frames and that figure is used. When it is not -- the
  	* display is on another computer and the interval arrived as a block argument
  	* -- nothing here measured anything, and the honest floor is one pattern
  	* step: the displayed value is quantised to that, so the moment a code
  	* appeared cannot be stated more precisely however well the refresh is known.
  	* Reporting zero would claim an exactness no part of this run established.
  	*/
  	refreshUncertaintyUs() {
  		return this.display?.refreshUncertaintyUs() ?? this.profile.stepUs;
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
  		if (!this.controller) {
  			const size = {
  				width: ANALYSIS_WIDTH,
  				height: ANALYSIS_HEIGHT
  			};
  			this.controller = new OpticalTimeController({
  				runtime: this.runtime,
  				clock: this.clock,
  				profile: this.profile,
  				analysisWidth: ANALYSIS_WIDTH,
  				analysisHeight: ANALYSIS_HEIGHT,
  				createFramePump: (lease) => this.createFramePump ? this.createFramePump(lease, size) : new VideoFramePump({
  					element: lease.getFrameSource().element,
  					width: ANALYSIS_WIDTH,
  					height: ANALYSIS_HEIGHT,
  					clock: this.clock,
  					monotonic: this.clock.monotonic()
  				})
  			});
  		}
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
  			const measuring = this.cornerMeasurement !== void 0;
  			this.cancelCornerMeasurement("The project stopped.");
  			if (!measuring) this.cornerErrorCode = "";
  			this.cornerObservation = void 0;
  			this.cornerSpread = 0;
  			this.controller?.stop().catch(() => void 0);
  			this.display?.hide();
  			if (!this.injectedController) this.controller = void 0;
  			if (!this.injectedDisplay) this.display = void 0;
  			this.profile = this.defaultProfile;
  			this.profileErrorCode = "";
  			this.observation = void 0;
  			this.correspondence = void 0;
  			this.correspondenceError = "";
  			this.clearPlacement();
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
  function requireElement(element) {
  	if (!element) throw new TimeSpaceSyncError("camera-unavailable", "The decoder holds no camera to read corners from.");
  	return element;
  }
  /** Thousandths of a pixel: finer than any corner here is measured, and stable to print. */
  function roundPixels(value) {
  	return Math.round(value * 1e3) / 1e3;
  }
  /** A number from a block argument, or NaN for empty text rather than Scratch's zero. */
  function readFiniteNumber(value) {
  	const text = Scratch.Cast.toString(value).trim();
  	return text === "" ? NaN : Number(text);
  }
  /** Parses block text as JSON, treating anything unparseable as absent. */
  function readJson(value) {
  	try {
  		return JSON.parse(Scratch.Cast.toString(value));
  	} catch {
  		return;
  	}
  }
  //#endregion
  //#region src/index.ts
  if (extensionConfig.unsandboxed && !Scratch.extensions.unsandboxed) throw new Error(`${extensionConfig.name} must run unsandboxed.`);
  Scratch.extensions.register(new TimeSpaceSyncExtension());
  //#endregion

})(Scratch);
