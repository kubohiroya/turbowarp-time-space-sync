import {describe, expect, it} from 'vitest';
import {
  describeIssues,
  enumOf,
  finite,
  identifier,
  integer,
  nullable,
  object,
  toJsonSchema,
  tuple,
  validate
} from '../src/contracts/spec.js';

describe('contract descriptors', () => {
  it('rejects non-finite numbers', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = validate(object({value: finite()}), {value});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(describeIssues(result.issues)).toContain('finite');
    }
  });

  it('rejects an explicit undefined for an optional property', () => {
    const spec = object({present: identifier(), maybe: identifier()}, ['maybe']);
    expect(validate(spec, {present: 'a'}).ok).toBe(true);
    const result = validate(spec, {present: 'a', maybe: undefined});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(describeIssues(result.issues)).toContain('must not be undefined');
  });

  it('rejects unknown properties', () => {
    const result = validate(object({a: identifier()}), {a: 'x', b: 1});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(describeIssues(result.issues)).toContain('b: is not a known property');
  });

  it('reports the path of a nested failure', () => {
    const spec = object({items: {kind: 'array', items: object({n: integer()})}});
    const result = validate(spec, {items: [{n: 1}, {n: 1.5}]});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe('items[1].n');
  });

  it('accepts null only where the contract allows it', () => {
    expect(validate(nullable(identifier()), null).ok).toBe(true);
    expect(validate(identifier(), null).ok).toBe(false);
  });

  it('derives a JSON Schema that marks optional properties as not required', () => {
    const schema = toJsonSchema(object({a: identifier(), b: integer()}, ['b']));
    expect(schema.required).toEqual(['a']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('derives integer, enum and tuple constraints', () => {
    expect(toJsonSchema(integer({minimum: 0})).type).toBe('integer');
    expect(toJsonSchema(enumOf(['a', 'b'])).enum).toEqual(['a', 'b']);
    expect(toJsonSchema(tuple(finite(), 16))).toMatchObject({minItems: 16, maxItems: 16});
  });
});
