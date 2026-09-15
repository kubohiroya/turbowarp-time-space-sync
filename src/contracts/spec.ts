/**
 * A small descriptor language shared by the runtime validators and the
 * published JSON Schema files.
 *
 * The contracts in this package cross process and repository boundaries, so a
 * reader has to be able to check a payload it did not produce. Writing the
 * validator and the schema separately lets them drift, and a drift here is
 * invisible: both sides keep accepting their own output. Describing a contract
 * once and deriving both is the only arrangement that cannot drift.
 *
 * The language stays deliberately small. It carries what these contracts need
 * and nothing else, so it can be hand written without a runtime dependency.
 * TurboWarp extensions ship as a single bundle, so every runtime dependency is
 * paid for by everyone who loads the extension.
 */

export type Spec =
  | {readonly kind: 'const'; readonly value: string | number | boolean}
  | {readonly kind: 'boolean'}
  | {
      readonly kind: 'string';
      readonly minLength?: number;
      readonly maxLength?: number;
      readonly pattern?: string;
    }
  | {readonly kind: 'enum'; readonly values: readonly string[]}
  | {
      readonly kind: 'number';
      readonly integer?: boolean;
      readonly minimum?: number;
      readonly maximum?: number;
      readonly exclusiveMinimum?: number;
    }
  | {
      readonly kind: 'array';
      readonly items: Spec;
      readonly minItems?: number;
      readonly maxItems?: number;
    }
  | {readonly kind: 'tuple'; readonly items: Spec; readonly length: number}
  | {
      readonly kind: 'object';
      readonly properties: Readonly<Record<string, Spec>>;
      readonly optional?: readonly string[];
    }
  | {readonly kind: 'nullable'; readonly inner: Spec};

export interface ValidationIssue {
  /** Dotted path to the offending value, `''` for the payload itself. */
  readonly path: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | {readonly ok: true; readonly value: T}
  | {readonly ok: false; readonly issues: readonly ValidationIssue[]};

const IDENTIFIER_PATTERN = '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$';

/** An opaque, stable identifier: a camera slot, a reference, a profile. */
export function identifier(): Spec {
  return {kind: 'string', minLength: 1, maxLength: 128, pattern: IDENTIFIER_PATTERN};
}

export function text(maxLength = 1024): Spec {
  return {kind: 'string', maxLength};
}

/**
 * A finite number. `Number.isFinite` is the point of this helper: a NaN or an
 * infinity that reaches a solver produces a result that looks like a number,
 * and the contracts must reject it before anything changes state.
 */
export function finite(bounds: {minimum?: number; maximum?: number; exclusiveMinimum?: number} = {}): Spec {
  return {kind: 'number', ...bounds};
}

/** A whole number of microseconds. Timestamps are integers by contract. */
export function integer(bounds: {minimum?: number; maximum?: number} = {}): Spec {
  return {kind: 'number', integer: true, ...bounds};
}

/**
 * A duration that cannot be negative, in microseconds.
 *
 * A negative duration is always a bug in the producer, never a measurement, so
 * it is rejected rather than clamped. Clamping would hide the producer's bug
 * behind a plausible zero.
 */
export function durationUs(): Spec {
  return {kind: 'number', integer: true, minimum: 0};
}

export function timestampUs(): Spec {
  return {kind: 'number', integer: true};
}

export function enumOf(values: readonly string[]): Spec {
  return {kind: 'enum', values};
}

export function tuple(items: Spec, length: number): Spec {
  return {kind: 'tuple', items, length};
}

export function object(
  properties: Readonly<Record<string, Spec>>,
  optional: readonly string[] = []
): Spec {
  return {kind: 'object', properties, optional};
}

export function nullable(inner: Spec): Spec {
  return {kind: 'nullable', inner};
}

export function validate<T>(spec: Spec, value: unknown): ValidationResult<T> {
  const issues: ValidationIssue[] = [];
  check(spec, value, '', issues);
  if (issues.length > 0) return {ok: false, issues};
  return {ok: true, value: value as T};
}

/** Formats issues for an error message a block reporter can surface. */
export function describeIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map((issue) => (issue.path === '' ? issue.message : `${issue.path}: ${issue.message}`))
    .join('; ');
}

function check(spec: Spec, value: unknown, path: string, issues: ValidationIssue[]): void {
  switch (spec.kind) {
    case 'const':
      if (value !== spec.value) {
        issues.push({path, message: `must be ${JSON.stringify(spec.value)}`});
      }
      return;
    case 'boolean':
      if (typeof value !== 'boolean') issues.push({path, message: 'must be a boolean'});
      return;
    case 'string':
      checkString(spec, value, path, issues);
      return;
    case 'enum':
      if (typeof value !== 'string' || !spec.values.includes(value)) {
        issues.push({path, message: `must be one of ${spec.values.join(', ')}`});
      }
      return;
    case 'number':
      checkNumber(spec, value, path, issues);
      return;
    case 'array':
      checkArray(spec, value, path, issues);
      return;
    case 'tuple':
      checkTuple(spec, value, path, issues);
      return;
    case 'object':
      checkObject(spec, value, path, issues);
      return;
    case 'nullable':
      if (value !== null) check(spec.inner, value, path, issues);
      return;
  }
}

function checkString(
  spec: Extract<Spec, {kind: 'string'}>,
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'string') {
    issues.push({path, message: 'must be a string'});
    return;
  }
  if (spec.minLength !== undefined && value.length < spec.minLength) {
    issues.push({path, message: `must be at least ${spec.minLength} characters`});
  }
  if (spec.maxLength !== undefined && value.length > spec.maxLength) {
    issues.push({path, message: `must be at most ${spec.maxLength} characters`});
  }
  if (spec.pattern !== undefined && !new RegExp(spec.pattern).test(value)) {
    issues.push({path, message: `must match ${spec.pattern}`});
  }
}

function checkNumber(
  spec: Extract<Spec, {kind: 'number'}>,
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({path, message: 'must be a finite number'});
    return;
  }
  if (spec.integer === true && !Number.isSafeInteger(value)) {
    issues.push({path, message: 'must be a safe integer'});
    return;
  }
  if (spec.minimum !== undefined && value < spec.minimum) {
    issues.push({path, message: `must be at least ${spec.minimum}`});
  }
  if (spec.exclusiveMinimum !== undefined && value <= spec.exclusiveMinimum) {
    issues.push({path, message: `must be greater than ${spec.exclusiveMinimum}`});
  }
  if (spec.maximum !== undefined && value > spec.maximum) {
    issues.push({path, message: `must be at most ${spec.maximum}`});
  }
}

function checkArray(
  spec: Extract<Spec, {kind: 'array'}>,
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    issues.push({path, message: 'must be an array'});
    return;
  }
  if (spec.minItems !== undefined && value.length < spec.minItems) {
    issues.push({path, message: `must have at least ${spec.minItems} items`});
  }
  if (spec.maxItems !== undefined && value.length > spec.maxItems) {
    issues.push({path, message: `must have at most ${spec.maxItems} items`});
  }
  value.forEach((item, index) => check(spec.items, item, `${path}[${index}]`, issues));
}

function checkTuple(
  spec: Extract<Spec, {kind: 'tuple'}>,
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(value) || value.length !== spec.length) {
    issues.push({path, message: `must be an array of ${spec.length} items`});
    return;
  }
  value.forEach((item, index) => check(spec.items, item, `${path}[${index}]`, issues));
}

function checkObject(
  spec: Extract<Spec, {kind: 'object'}>,
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push({path, message: 'must be an object'});
    return;
  }
  const record = value as Record<string, unknown>;
  const optional = new Set(spec.optional ?? []);
  for (const [name, property] of Object.entries(spec.properties)) {
    const child = path === '' ? name : `${path}.${name}`;
    if (!(name in record)) {
      if (!optional.has(name)) issues.push({path: child, message: 'is required'});
      continue;
    }
    // An explicit `undefined` is not the same as an absent optional property:
    // it usually means the producer meant to write a value and computed one it
    // could not represent. Rejecting it keeps that mistake visible.
    if (record[name] === undefined) {
      issues.push({path: child, message: 'must not be undefined'});
      continue;
    }
    check(property, record[name], child, issues);
  }
  for (const name of Object.keys(record)) {
    if (!(name in spec.properties)) {
      const child = path === '' ? name : `${path}.${name}`;
      issues.push({path: child, message: 'is not a known property'});
    }
  }
}

/** Renders one spec as a JSON Schema 2020-12 fragment. */
export function toJsonSchema(spec: Spec): Record<string, unknown> {
  switch (spec.kind) {
    case 'const':
      return {const: spec.value};
    case 'boolean':
      return {type: 'boolean'};
    case 'string':
      return {
        type: 'string',
        ...(spec.minLength === undefined ? {} : {minLength: spec.minLength}),
        ...(spec.maxLength === undefined ? {} : {maxLength: spec.maxLength}),
        ...(spec.pattern === undefined ? {} : {pattern: spec.pattern})
      };
    case 'enum':
      return {type: 'string', enum: [...spec.values]};
    case 'number':
      return {
        type: spec.integer === true ? 'integer' : 'number',
        ...(spec.minimum === undefined ? {} : {minimum: spec.minimum}),
        ...(spec.exclusiveMinimum === undefined ? {} : {exclusiveMinimum: spec.exclusiveMinimum}),
        ...(spec.maximum === undefined ? {} : {maximum: spec.maximum})
      };
    case 'array':
      return {
        type: 'array',
        items: toJsonSchema(spec.items),
        ...(spec.minItems === undefined ? {} : {minItems: spec.minItems}),
        ...(spec.maxItems === undefined ? {} : {maxItems: spec.maxItems})
      };
    case 'tuple':
      return {
        type: 'array',
        items: toJsonSchema(spec.items),
        minItems: spec.length,
        maxItems: spec.length
      };
    case 'object':
      return {
        type: 'object',
        additionalProperties: false,
        required: Object.keys(spec.properties).filter(
          (name) => !(spec.optional ?? []).includes(name)
        ),
        properties: Object.fromEntries(
          Object.entries(spec.properties).map(([name, property]) => [
            name,
            toJsonSchema(property)
          ])
        )
      };
    case 'nullable':
      return {anyOf: [toJsonSchema(spec.inner), {type: 'null'}]};
  }
}
