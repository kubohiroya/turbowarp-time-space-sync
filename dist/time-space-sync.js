// Name: TurboWarp-Time-Space-Sync
// ID: kubohiroyatimespacesync
// Description: Optical time correspondence and camera placement calibration.
// By: Hiroya Kubo
// License: MPL-2.0

(function (Scratch) {
  'use strict';

  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esmMin = (fn, res, err) => () => {
  	if (err) throw err[0];
  	try {
  		return fn && (res = fn(fn = 0)), res;
  	} catch (e) {
  		throw err = [e], e;
  	}
  };
  var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
  var __exportAll = (all, no_symbols) => {
  	let target = {};
  	for (var name in all) __defProp(target, name, {
  		get: all[name],
  		enumerable: true
  	});
  	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
  	return target;
  };
  var __copyProps = (to, from, except, desc) => {
  	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
  		key = keys[i];
  		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
  			get: ((k) => from[k]).bind(null, key),
  			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
  		});
  	}
  	return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
  	value: mod,
  	enumerable: true
  }) : target, mod));
  var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
  var JsonSnapshotError = class extends Error {
  	constructor(kind, dataPath) {
  		super("JSON snapshot failed.");
  		this.kind = kind;
  		this.dataPath = dataPath;
  	}
  };
  function appendPointer(path, key) {
  	return `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
  }
  /** Copy JSON values without invoking accessors, toJSON, or input iterators. */
  function snapshotJson(value) {
  	const active = /* @__PURE__ */ new WeakSet();
  	let remaining = 1e5;
  	const visit = (input, path, depth) => {
  		if (--remaining < 0 || depth > 128) throw new JsonSnapshotError("limit", path);
  		if (input === null || typeof input === "string" || typeof input === "boolean") return input;
  		if (typeof input === "number" && Number.isFinite(input)) return input;
  		if (typeof input !== "object" || input === null || active.has(input)) throw new JsonSnapshotError("invalid", path);
  		const array = Array.isArray(input);
  		const prototype = Object.getPrototypeOf(input);
  		if (!array && prototype !== null && prototype !== Object.prototype) throw new JsonSnapshotError("invalid", path);
  		if (Object.getOwnPropertySymbols(input).length) throw new JsonSnapshotError("invalid", path);
  		active.add(input);
  		try {
  			if (array) {
  				const length = input.length;
  				if (!Number.isSafeInteger(length) || length > remaining) throw new JsonSnapshotError("limit", path);
  				const result = [];
  				for (let i = 0; i < length; i++) {
  					const child = appendPointer(path, String(i));
  					const descriptor = Object.getOwnPropertyDescriptor(input, i);
  					if (!descriptor || !("value" in descriptor)) throw new JsonSnapshotError("invalid", child);
  					result.push(visit(descriptor.value, child, depth + 1));
  				}
  				for (const key of Object.keys(input)) if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length) throw new JsonSnapshotError("invalid", appendPointer(path, key));
  				return result;
  			}
  			const result = {};
  			for (const key of Object.keys(input)) {
  				const child = appendPointer(path, key);
  				const descriptor = Object.getOwnPropertyDescriptor(input, key);
  				if (!descriptor || !("value" in descriptor)) throw new JsonSnapshotError("invalid", child);
  				Object.defineProperty(result, key, {
  					value: visit(descriptor.value, child, depth + 1),
  					enumerable: true,
  					writable: true,
  					configurable: true
  				});
  			}
  			return result;
  		} finally {
  			active.delete(input);
  		}
  	};
  	return visit(value, "", 0);
  }
  function isJsonRecord(value) {
  	return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  var require_code$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
  	var _CodeOrName = class {};
  	exports._CodeOrName = _CodeOrName;
  	exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  	var Name = class extends _CodeOrName {
  		constructor(s) {
  			super();
  			if (!exports.IDENTIFIER.test(s)) throw new Error("CodeGen: name must be a valid identifier");
  			this.str = s;
  		}
  		toString() {
  			return this.str;
  		}
  		emptyStr() {
  			return false;
  		}
  		get names() {
  			return { [this.str]: 1 };
  		}
  	};
  	exports.Name = Name;
  	var _Code = class extends _CodeOrName {
  		constructor(code) {
  			super();
  			this._items = typeof code === "string" ? [code] : code;
  		}
  		toString() {
  			return this.str;
  		}
  		emptyStr() {
  			if (this._items.length > 1) return false;
  			const item = this._items[0];
  			return item === "" || item === "\"\"";
  		}
  		get str() {
  			var _a;
  			return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
  		}
  		get names() {
  			var _a;
  			return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
  				if (c instanceof Name) names[c.str] = (names[c.str] || 0) + 1;
  				return names;
  			}, {});
  		}
  	};
  	exports._Code = _Code;
  	exports.nil = new _Code("");
  	function _(strs, ...args) {
  		const code = [strs[0]];
  		let i = 0;
  		while (i < args.length) {
  			addCodeArg(code, args[i]);
  			code.push(strs[++i]);
  		}
  		return new _Code(code);
  	}
  	exports._ = _;
  	var plus = new _Code("+");
  	function str(strs, ...args) {
  		const expr = [safeStringify(strs[0])];
  		let i = 0;
  		while (i < args.length) {
  			expr.push(plus);
  			addCodeArg(expr, args[i]);
  			expr.push(plus, safeStringify(strs[++i]));
  		}
  		optimize(expr);
  		return new _Code(expr);
  	}
  	exports.str = str;
  	function addCodeArg(code, arg) {
  		if (arg instanceof _Code) code.push(...arg._items);
  		else if (arg instanceof Name) code.push(arg);
  		else code.push(interpolate(arg));
  	}
  	exports.addCodeArg = addCodeArg;
  	function optimize(expr) {
  		let i = 1;
  		while (i < expr.length - 1) {
  			if (expr[i] === plus) {
  				const res = mergeExprItems(expr[i - 1], expr[i + 1]);
  				if (res !== void 0) {
  					expr.splice(i - 1, 3, res);
  					continue;
  				}
  				expr[i++] = "+";
  			}
  			i++;
  		}
  	}
  	function mergeExprItems(a, b) {
  		if (b === "\"\"") return a;
  		if (a === "\"\"") return b;
  		if (typeof a == "string") {
  			if (b instanceof Name || a[a.length - 1] !== "\"") return;
  			if (typeof b != "string") return `${a.slice(0, -1)}${b}"`;
  			if (b[0] === "\"") return a.slice(0, -1) + b.slice(1);
  			return;
  		}
  		if (typeof b == "string" && b[0] === "\"" && !(a instanceof Name)) return `"${a}${b.slice(1)}`;
  	}
  	function strConcat(c1, c2) {
  		return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  	}
  	exports.strConcat = strConcat;
  	function interpolate(x) {
  		return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  	}
  	function stringify(x) {
  		return new _Code(safeStringify(x));
  	}
  	exports.stringify = stringify;
  	function safeStringify(x) {
  		return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  	}
  	exports.safeStringify = safeStringify;
  	function getProperty(key) {
  		return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  	}
  	exports.getProperty = getProperty;
  	function getEsmExportName(key) {
  		if (typeof key == "string" && exports.IDENTIFIER.test(key)) return new _Code(`${key}`);
  		throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  	}
  	exports.getEsmExportName = getEsmExportName;
  	function regexpCode(rx) {
  		return new _Code(rx.toString());
  	}
  	exports.regexpCode = regexpCode;
  }));
  var require_scope = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
  	var code_1 = require_code$1();
  	var ValueError = class extends Error {
  		constructor(name) {
  			super(`CodeGen: "code" for ${name} not defined`);
  			this.value = name.value;
  		}
  	};
  	var UsedValueState;
  	(function(UsedValueState) {
  		UsedValueState[UsedValueState["Started"] = 0] = "Started";
  		UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
  	})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
  	exports.varKinds = {
  		const: new code_1.Name("const"),
  		let: new code_1.Name("let"),
  		var: new code_1.Name("var")
  	};
  	var Scope = class {
  		constructor({ prefixes, parent } = {}) {
  			this._names = {};
  			this._prefixes = prefixes;
  			this._parent = parent;
  		}
  		toName(nameOrPrefix) {
  			return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
  		}
  		name(prefix) {
  			return new code_1.Name(this._newName(prefix));
  		}
  		_newName(prefix) {
  			const ng = this._names[prefix] || this._nameGroup(prefix);
  			return `${prefix}${ng.index++}`;
  		}
  		_nameGroup(prefix) {
  			var _a, _b;
  			if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
  			return this._names[prefix] = {
  				prefix,
  				index: 0
  			};
  		}
  	};
  	exports.Scope = Scope;
  	var ValueScopeName = class extends code_1.Name {
  		constructor(prefix, nameStr) {
  			super(nameStr);
  			this.prefix = prefix;
  		}
  		setValue(value, { property, itemIndex }) {
  			this.value = value;
  			this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
  		}
  	};
  	exports.ValueScopeName = ValueScopeName;
  	var line = (0, code_1._)`\n`;
  	var ValueScope = class extends Scope {
  		constructor(opts) {
  			super(opts);
  			this._values = {};
  			this._scope = opts.scope;
  			this.opts = {
  				...opts,
  				_n: opts.lines ? line : code_1.nil
  			};
  		}
  		get() {
  			return this._scope;
  		}
  		name(prefix) {
  			return new ValueScopeName(prefix, this._newName(prefix));
  		}
  		value(nameOrPrefix, value) {
  			var _a;
  			if (value.ref === void 0) throw new Error("CodeGen: ref must be passed in value");
  			const name = this.toName(nameOrPrefix);
  			const { prefix } = name;
  			const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
  			let vs = this._values[prefix];
  			if (vs) {
  				const _name = vs.get(valueKey);
  				if (_name) return _name;
  			} else vs = this._values[prefix] = /* @__PURE__ */ new Map();
  			vs.set(valueKey, name);
  			const s = this._scope[prefix] || (this._scope[prefix] = []);
  			const itemIndex = s.length;
  			s[itemIndex] = value.ref;
  			name.setValue(value, {
  				property: prefix,
  				itemIndex
  			});
  			return name;
  		}
  		getValue(prefix, keyOrRef) {
  			const vs = this._values[prefix];
  			if (!vs) return;
  			return vs.get(keyOrRef);
  		}
  		scopeRefs(scopeName, values = this._values) {
  			return this._reduceValues(values, (name) => {
  				if (name.scopePath === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
  				return (0, code_1._)`${scopeName}${name.scopePath}`;
  			});
  		}
  		scopeCode(values = this._values, usedValues, getCode) {
  			return this._reduceValues(values, (name) => {
  				if (name.value === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
  				return name.value.code;
  			}, usedValues, getCode);
  		}
  		_reduceValues(values, valueCode, usedValues = {}, getCode) {
  			let code = code_1.nil;
  			for (const prefix in values) {
  				const vs = values[prefix];
  				if (!vs) continue;
  				const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
  				vs.forEach((name) => {
  					if (nameSet.has(name)) return;
  					nameSet.set(name, UsedValueState.Started);
  					let c = valueCode(name);
  					if (c) {
  						const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
  						code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
  					} else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) code = (0, code_1._)`${code}${c}${this.opts._n}`;
  					else throw new ValueError(name);
  					nameSet.set(name, UsedValueState.Completed);
  				});
  			}
  			return code;
  		}
  	};
  	exports.ValueScope = ValueScope;
  }));
  var require_codegen = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
  	var code_1 = require_code$1();
  	var scope_1 = require_scope();
  	var code_2 = require_code$1();
  	Object.defineProperty(exports, "_", {
  		enumerable: true,
  		get: function() {
  			return code_2._;
  		}
  	});
  	Object.defineProperty(exports, "str", {
  		enumerable: true,
  		get: function() {
  			return code_2.str;
  		}
  	});
  	Object.defineProperty(exports, "strConcat", {
  		enumerable: true,
  		get: function() {
  			return code_2.strConcat;
  		}
  	});
  	Object.defineProperty(exports, "nil", {
  		enumerable: true,
  		get: function() {
  			return code_2.nil;
  		}
  	});
  	Object.defineProperty(exports, "getProperty", {
  		enumerable: true,
  		get: function() {
  			return code_2.getProperty;
  		}
  	});
  	Object.defineProperty(exports, "stringify", {
  		enumerable: true,
  		get: function() {
  			return code_2.stringify;
  		}
  	});
  	Object.defineProperty(exports, "regexpCode", {
  		enumerable: true,
  		get: function() {
  			return code_2.regexpCode;
  		}
  	});
  	Object.defineProperty(exports, "Name", {
  		enumerable: true,
  		get: function() {
  			return code_2.Name;
  		}
  	});
  	var scope_2 = require_scope();
  	Object.defineProperty(exports, "Scope", {
  		enumerable: true,
  		get: function() {
  			return scope_2.Scope;
  		}
  	});
  	Object.defineProperty(exports, "ValueScope", {
  		enumerable: true,
  		get: function() {
  			return scope_2.ValueScope;
  		}
  	});
  	Object.defineProperty(exports, "ValueScopeName", {
  		enumerable: true,
  		get: function() {
  			return scope_2.ValueScopeName;
  		}
  	});
  	Object.defineProperty(exports, "varKinds", {
  		enumerable: true,
  		get: function() {
  			return scope_2.varKinds;
  		}
  	});
  	exports.operators = {
  		GT: new code_1._Code(">"),
  		GTE: new code_1._Code(">="),
  		LT: new code_1._Code("<"),
  		LTE: new code_1._Code("<="),
  		EQ: new code_1._Code("==="),
  		NEQ: new code_1._Code("!=="),
  		NOT: new code_1._Code("!"),
  		OR: new code_1._Code("||"),
  		AND: new code_1._Code("&&"),
  		ADD: new code_1._Code("+")
  	};
  	var Node = class {
  		optimizeNodes() {
  			return this;
  		}
  		optimizeNames(_names, _constants) {
  			return this;
  		}
  	};
  	var Def = class extends Node {
  		constructor(varKind, name, rhs) {
  			super();
  			this.varKind = varKind;
  			this.name = name;
  			this.rhs = rhs;
  		}
  		render({ es5, _n }) {
  			const varKind = es5 ? scope_1.varKinds.var : this.varKind;
  			const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
  			return `${varKind} ${this.name}${rhs};` + _n;
  		}
  		optimizeNames(names, constants) {
  			if (!names[this.name.str]) return;
  			if (this.rhs) this.rhs = optimizeExpr(this.rhs, names, constants);
  			return this;
  		}
  		get names() {
  			return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
  		}
  	};
  	var Assign = class extends Node {
  		constructor(lhs, rhs, sideEffects) {
  			super();
  			this.lhs = lhs;
  			this.rhs = rhs;
  			this.sideEffects = sideEffects;
  		}
  		render({ _n }) {
  			return `${this.lhs} = ${this.rhs};` + _n;
  		}
  		optimizeNames(names, constants) {
  			if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects) return;
  			this.rhs = optimizeExpr(this.rhs, names, constants);
  			return this;
  		}
  		get names() {
  			return addExprNames(this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names }, this.rhs);
  		}
  	};
  	var AssignOp = class extends Assign {
  		constructor(lhs, op, rhs, sideEffects) {
  			super(lhs, rhs, sideEffects);
  			this.op = op;
  		}
  		render({ _n }) {
  			return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
  		}
  	};
  	var Label = class extends Node {
  		constructor(label) {
  			super();
  			this.label = label;
  			this.names = {};
  		}
  		render({ _n }) {
  			return `${this.label}:` + _n;
  		}
  	};
  	var Break = class extends Node {
  		constructor(label) {
  			super();
  			this.label = label;
  			this.names = {};
  		}
  		render({ _n }) {
  			return `break${this.label ? ` ${this.label}` : ""};` + _n;
  		}
  	};
  	var Throw = class extends Node {
  		constructor(error) {
  			super();
  			this.error = error;
  		}
  		render({ _n }) {
  			return `throw ${this.error};` + _n;
  		}
  		get names() {
  			return this.error.names;
  		}
  	};
  	var AnyCode = class extends Node {
  		constructor(code) {
  			super();
  			this.code = code;
  		}
  		render({ _n }) {
  			return `${this.code};` + _n;
  		}
  		optimizeNodes() {
  			return `${this.code}` ? this : void 0;
  		}
  		optimizeNames(names, constants) {
  			this.code = optimizeExpr(this.code, names, constants);
  			return this;
  		}
  		get names() {
  			return this.code instanceof code_1._CodeOrName ? this.code.names : {};
  		}
  	};
  	var ParentNode = class extends Node {
  		constructor(nodes = []) {
  			super();
  			this.nodes = nodes;
  		}
  		render(opts) {
  			return this.nodes.reduce((code, n) => code + n.render(opts), "");
  		}
  		optimizeNodes() {
  			const { nodes } = this;
  			let i = nodes.length;
  			while (i--) {
  				const n = nodes[i].optimizeNodes();
  				if (Array.isArray(n)) nodes.splice(i, 1, ...n);
  				else if (n) nodes[i] = n;
  				else nodes.splice(i, 1);
  			}
  			return nodes.length > 0 ? this : void 0;
  		}
  		optimizeNames(names, constants) {
  			const { nodes } = this;
  			let i = nodes.length;
  			while (i--) {
  				const n = nodes[i];
  				if (n.optimizeNames(names, constants)) continue;
  				subtractNames(names, n.names);
  				nodes.splice(i, 1);
  			}
  			return nodes.length > 0 ? this : void 0;
  		}
  		get names() {
  			return this.nodes.reduce((names, n) => addNames(names, n.names), {});
  		}
  	};
  	var BlockNode = class extends ParentNode {
  		render(opts) {
  			return "{" + opts._n + super.render(opts) + "}" + opts._n;
  		}
  	};
  	var Root = class extends ParentNode {};
  	var Else = class extends BlockNode {};
  	Else.kind = "else";
  	var If = class If extends BlockNode {
  		constructor(condition, nodes) {
  			super(nodes);
  			this.condition = condition;
  		}
  		render(opts) {
  			let code = `if(${this.condition})` + super.render(opts);
  			if (this.else) code += "else " + this.else.render(opts);
  			return code;
  		}
  		optimizeNodes() {
  			super.optimizeNodes();
  			const cond = this.condition;
  			if (cond === true) return this.nodes;
  			let e = this.else;
  			if (e) {
  				const ns = e.optimizeNodes();
  				e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
  			}
  			if (e) {
  				if (cond === false) return e instanceof If ? e : e.nodes;
  				if (this.nodes.length) return this;
  				return new If(not(cond), e instanceof If ? [e] : e.nodes);
  			}
  			if (cond === false || !this.nodes.length) return void 0;
  			return this;
  		}
  		optimizeNames(names, constants) {
  			var _a;
  			this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
  			if (!(super.optimizeNames(names, constants) || this.else)) return;
  			this.condition = optimizeExpr(this.condition, names, constants);
  			return this;
  		}
  		get names() {
  			const names = super.names;
  			addExprNames(names, this.condition);
  			if (this.else) addNames(names, this.else.names);
  			return names;
  		}
  	};
  	If.kind = "if";
  	var For = class extends BlockNode {};
  	For.kind = "for";
  	var ForLoop = class extends For {
  		constructor(iteration) {
  			super();
  			this.iteration = iteration;
  		}
  		render(opts) {
  			return `for(${this.iteration})` + super.render(opts);
  		}
  		optimizeNames(names, constants) {
  			if (!super.optimizeNames(names, constants)) return;
  			this.iteration = optimizeExpr(this.iteration, names, constants);
  			return this;
  		}
  		get names() {
  			return addNames(super.names, this.iteration.names);
  		}
  	};
  	var ForRange = class extends For {
  		constructor(varKind, name, from, to) {
  			super();
  			this.varKind = varKind;
  			this.name = name;
  			this.from = from;
  			this.to = to;
  		}
  		render(opts) {
  			const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
  			const { name, from, to } = this;
  			return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
  		}
  		get names() {
  			return addExprNames(addExprNames(super.names, this.from), this.to);
  		}
  	};
  	var ForIter = class extends For {
  		constructor(loop, varKind, name, iterable) {
  			super();
  			this.loop = loop;
  			this.varKind = varKind;
  			this.name = name;
  			this.iterable = iterable;
  		}
  		render(opts) {
  			return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
  		}
  		optimizeNames(names, constants) {
  			if (!super.optimizeNames(names, constants)) return;
  			this.iterable = optimizeExpr(this.iterable, names, constants);
  			return this;
  		}
  		get names() {
  			return addNames(super.names, this.iterable.names);
  		}
  	};
  	var Func = class extends BlockNode {
  		constructor(name, args, async) {
  			super();
  			this.name = name;
  			this.args = args;
  			this.async = async;
  		}
  		render(opts) {
  			return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(opts);
  		}
  	};
  	Func.kind = "func";
  	var Return = class extends ParentNode {
  		render(opts) {
  			return "return " + super.render(opts);
  		}
  	};
  	Return.kind = "return";
  	var Try = class extends BlockNode {
  		render(opts) {
  			let code = "try" + super.render(opts);
  			if (this.catch) code += this.catch.render(opts);
  			if (this.finally) code += this.finally.render(opts);
  			return code;
  		}
  		optimizeNodes() {
  			var _a, _b;
  			super.optimizeNodes();
  			(_a = this.catch) === null || _a === void 0 || _a.optimizeNodes();
  			(_b = this.finally) === null || _b === void 0 || _b.optimizeNodes();
  			return this;
  		}
  		optimizeNames(names, constants) {
  			var _a, _b;
  			super.optimizeNames(names, constants);
  			(_a = this.catch) === null || _a === void 0 || _a.optimizeNames(names, constants);
  			(_b = this.finally) === null || _b === void 0 || _b.optimizeNames(names, constants);
  			return this;
  		}
  		get names() {
  			const names = super.names;
  			if (this.catch) addNames(names, this.catch.names);
  			if (this.finally) addNames(names, this.finally.names);
  			return names;
  		}
  	};
  	var Catch = class extends BlockNode {
  		constructor(error) {
  			super();
  			this.error = error;
  		}
  		render(opts) {
  			return `catch(${this.error})` + super.render(opts);
  		}
  	};
  	Catch.kind = "catch";
  	var Finally = class extends BlockNode {
  		render(opts) {
  			return "finally" + super.render(opts);
  		}
  	};
  	Finally.kind = "finally";
  	var CodeGen = class {
  		constructor(extScope, opts = {}) {
  			this._values = {};
  			this._blockStarts = [];
  			this._constants = {};
  			this.opts = {
  				...opts,
  				_n: opts.lines ? "\n" : ""
  			};
  			this._extScope = extScope;
  			this._scope = new scope_1.Scope({ parent: extScope });
  			this._nodes = [new Root()];
  		}
  		toString() {
  			return this._root.render(this.opts);
  		}
  		name(prefix) {
  			return this._scope.name(prefix);
  		}
  		scopeName(prefix) {
  			return this._extScope.name(prefix);
  		}
  		scopeValue(prefixOrName, value) {
  			const name = this._extScope.value(prefixOrName, value);
  			(this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set())).add(name);
  			return name;
  		}
  		getScopeValue(prefix, keyOrRef) {
  			return this._extScope.getValue(prefix, keyOrRef);
  		}
  		scopeRefs(scopeName) {
  			return this._extScope.scopeRefs(scopeName, this._values);
  		}
  		scopeCode() {
  			return this._extScope.scopeCode(this._values);
  		}
  		_def(varKind, nameOrPrefix, rhs, constant) {
  			const name = this._scope.toName(nameOrPrefix);
  			if (rhs !== void 0 && constant) this._constants[name.str] = rhs;
  			this._leafNode(new Def(varKind, name, rhs));
  			return name;
  		}
  		const(nameOrPrefix, rhs, _constant) {
  			return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
  		}
  		let(nameOrPrefix, rhs, _constant) {
  			return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
  		}
  		var(nameOrPrefix, rhs, _constant) {
  			return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
  		}
  		assign(lhs, rhs, sideEffects) {
  			return this._leafNode(new Assign(lhs, rhs, sideEffects));
  		}
  		add(lhs, rhs) {
  			return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
  		}
  		code(c) {
  			if (typeof c == "function") c();
  			else if (c !== code_1.nil) this._leafNode(new AnyCode(c));
  			return this;
  		}
  		object(...keyValues) {
  			const code = ["{"];
  			for (const [key, value] of keyValues) {
  				if (code.length > 1) code.push(",");
  				code.push(key);
  				if (key !== value || this.opts.es5) {
  					code.push(":");
  					(0, code_1.addCodeArg)(code, value);
  				}
  			}
  			code.push("}");
  			return new code_1._Code(code);
  		}
  		if(condition, thenBody, elseBody) {
  			this._blockNode(new If(condition));
  			if (thenBody && elseBody) this.code(thenBody).else().code(elseBody).endIf();
  			else if (thenBody) this.code(thenBody).endIf();
  			else if (elseBody) throw new Error("CodeGen: \"else\" body without \"then\" body");
  			return this;
  		}
  		elseIf(condition) {
  			return this._elseNode(new If(condition));
  		}
  		else() {
  			return this._elseNode(new Else());
  		}
  		endIf() {
  			return this._endBlockNode(If, Else);
  		}
  		_for(node, forBody) {
  			this._blockNode(node);
  			if (forBody) this.code(forBody).endFor();
  			return this;
  		}
  		for(iteration, forBody) {
  			return this._for(new ForLoop(iteration), forBody);
  		}
  		forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
  			const name = this._scope.toName(nameOrPrefix);
  			return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
  		}
  		forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
  			const name = this._scope.toName(nameOrPrefix);
  			if (this.opts.es5) {
  				const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
  				return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
  					this.var(name, (0, code_1._)`${arr}[${i}]`);
  					forBody(name);
  				});
  			}
  			return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
  		}
  		forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
  			if (this.opts.ownProperties) return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
  			const name = this._scope.toName(nameOrPrefix);
  			return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
  		}
  		endFor() {
  			return this._endBlockNode(For);
  		}
  		label(label) {
  			return this._leafNode(new Label(label));
  		}
  		break(label) {
  			return this._leafNode(new Break(label));
  		}
  		return(value) {
  			const node = new Return();
  			this._blockNode(node);
  			this.code(value);
  			if (node.nodes.length !== 1) throw new Error("CodeGen: \"return\" should have one node");
  			return this._endBlockNode(Return);
  		}
  		try(tryBody, catchCode, finallyCode) {
  			if (!catchCode && !finallyCode) throw new Error("CodeGen: \"try\" without \"catch\" and \"finally\"");
  			const node = new Try();
  			this._blockNode(node);
  			this.code(tryBody);
  			if (catchCode) {
  				const error = this.name("e");
  				this._currNode = node.catch = new Catch(error);
  				catchCode(error);
  			}
  			if (finallyCode) {
  				this._currNode = node.finally = new Finally();
  				this.code(finallyCode);
  			}
  			return this._endBlockNode(Catch, Finally);
  		}
  		throw(error) {
  			return this._leafNode(new Throw(error));
  		}
  		block(body, nodeCount) {
  			this._blockStarts.push(this._nodes.length);
  			if (body) this.code(body).endBlock(nodeCount);
  			return this;
  		}
  		endBlock(nodeCount) {
  			const len = this._blockStarts.pop();
  			if (len === void 0) throw new Error("CodeGen: not in self-balancing block");
  			const toClose = this._nodes.length - len;
  			if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
  			this._nodes.length = len;
  			return this;
  		}
  		func(name, args = code_1.nil, async, funcBody) {
  			this._blockNode(new Func(name, args, async));
  			if (funcBody) this.code(funcBody).endFunc();
  			return this;
  		}
  		endFunc() {
  			return this._endBlockNode(Func);
  		}
  		optimize(n = 1) {
  			while (n-- > 0) {
  				this._root.optimizeNodes();
  				this._root.optimizeNames(this._root.names, this._constants);
  			}
  		}
  		_leafNode(node) {
  			this._currNode.nodes.push(node);
  			return this;
  		}
  		_blockNode(node) {
  			this._currNode.nodes.push(node);
  			this._nodes.push(node);
  		}
  		_endBlockNode(N1, N2) {
  			const n = this._currNode;
  			if (n instanceof N1 || N2 && n instanceof N2) {
  				this._nodes.pop();
  				return this;
  			}
  			throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
  		}
  		_elseNode(node) {
  			const n = this._currNode;
  			if (!(n instanceof If)) throw new Error("CodeGen: \"else\" without \"if\"");
  			this._currNode = n.else = node;
  			return this;
  		}
  		get _root() {
  			return this._nodes[0];
  		}
  		get _currNode() {
  			const ns = this._nodes;
  			return ns[ns.length - 1];
  		}
  		set _currNode(node) {
  			const ns = this._nodes;
  			ns[ns.length - 1] = node;
  		}
  	};
  	exports.CodeGen = CodeGen;
  	function addNames(names, from) {
  		for (const n in from) names[n] = (names[n] || 0) + (from[n] || 0);
  		return names;
  	}
  	function addExprNames(names, from) {
  		return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
  	}
  	function optimizeExpr(expr, names, constants) {
  		if (expr instanceof code_1.Name) return replaceName(expr);
  		if (!canOptimize(expr)) return expr;
  		return new code_1._Code(expr._items.reduce((items, c) => {
  			if (c instanceof code_1.Name) c = replaceName(c);
  			if (c instanceof code_1._Code) items.push(...c._items);
  			else items.push(c);
  			return items;
  		}, []));
  		function replaceName(n) {
  			const c = constants[n.str];
  			if (c === void 0 || names[n.str] !== 1) return n;
  			delete names[n.str];
  			return c;
  		}
  		function canOptimize(e) {
  			return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
  		}
  	}
  	function subtractNames(names, from) {
  		for (const n in from) names[n] = (names[n] || 0) - (from[n] || 0);
  	}
  	function not(x) {
  		return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
  	}
  	exports.not = not;
  	var andCode = mappend(exports.operators.AND);
  	function and(...args) {
  		return args.reduce(andCode);
  	}
  	exports.and = and;
  	var orCode = mappend(exports.operators.OR);
  	function or(...args) {
  		return args.reduce(orCode);
  	}
  	exports.or = or;
  	function mappend(op) {
  		return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
  	}
  	function par(x) {
  		return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
  	}
  }));
  var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
  	var codegen_1 = require_codegen();
  	var code_1 = require_code$1();
  	function toHash(arr) {
  		const hash = {};
  		for (const item of arr) hash[item] = true;
  		return hash;
  	}
  	exports.toHash = toHash;
  	function alwaysValidSchema(it, schema) {
  		if (typeof schema == "boolean") return schema;
  		if (Object.keys(schema).length === 0) return true;
  		checkUnknownRules(it, schema);
  		return !schemaHasRules(schema, it.self.RULES.all);
  	}
  	exports.alwaysValidSchema = alwaysValidSchema;
  	function checkUnknownRules(it, schema = it.schema) {
  		const { opts, self } = it;
  		if (!opts.strictSchema) return;
  		if (typeof schema === "boolean") return;
  		const rules = self.RULES.keywords;
  		for (const key in schema) if (!rules[key]) checkStrictMode(it, `unknown keyword: "${key}"`);
  	}
  	exports.checkUnknownRules = checkUnknownRules;
  	function schemaHasRules(schema, rules) {
  		if (typeof schema == "boolean") return !schema;
  		for (const key in schema) if (rules[key]) return true;
  		return false;
  	}
  	exports.schemaHasRules = schemaHasRules;
  	function schemaHasRulesButRef(schema, RULES) {
  		if (typeof schema == "boolean") return !schema;
  		for (const key in schema) if (key !== "$ref" && RULES.all[key]) return true;
  		return false;
  	}
  	exports.schemaHasRulesButRef = schemaHasRulesButRef;
  	function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
  		if (!$data) {
  			if (typeof schema == "number" || typeof schema == "boolean") return schema;
  			if (typeof schema == "string") return (0, codegen_1._)`${schema}`;
  		}
  		return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
  	}
  	exports.schemaRefOrVal = schemaRefOrVal;
  	function unescapeFragment(str) {
  		return unescapeJsonPointer(decodeURIComponent(str));
  	}
  	exports.unescapeFragment = unescapeFragment;
  	function escapeFragment(str) {
  		return encodeURIComponent(escapeJsonPointer(str));
  	}
  	exports.escapeFragment = escapeFragment;
  	function escapeJsonPointer(str) {
  		if (typeof str == "number") return `${str}`;
  		return str.replace(/~/g, "~0").replace(/\//g, "~1");
  	}
  	exports.escapeJsonPointer = escapeJsonPointer;
  	function unescapeJsonPointer(str) {
  		return str.replace(/~1/g, "/").replace(/~0/g, "~");
  	}
  	exports.unescapeJsonPointer = unescapeJsonPointer;
  	function eachItem(xs, f) {
  		if (Array.isArray(xs)) for (const x of xs) f(x);
  		else f(xs);
  	}
  	exports.eachItem = eachItem;
  	function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
  		return (gen, from, to, toName) => {
  			const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
  			return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
  		};
  	}
  	exports.mergeEvaluated = {
  		props: makeMergeEvaluated({
  			mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
  				gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
  			}),
  			mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
  				if (from === true) gen.assign(to, true);
  				else {
  					gen.assign(to, (0, codegen_1._)`${to} || {}`);
  					setEvaluated(gen, to, from);
  				}
  			}),
  			mergeValues: (from, to) => from === true ? true : {
  				...from,
  				...to
  			},
  			resultToName: evaluatedPropsToName
  		}),
  		items: makeMergeEvaluated({
  			mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
  			mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
  			mergeValues: (from, to) => from === true ? true : Math.max(from, to),
  			resultToName: (gen, items) => gen.var("items", items)
  		})
  	};
  	function evaluatedPropsToName(gen, ps) {
  		if (ps === true) return gen.var("props", true);
  		const props = gen.var("props", (0, codegen_1._)`{}`);
  		if (ps !== void 0) setEvaluated(gen, props, ps);
  		return props;
  	}
  	exports.evaluatedPropsToName = evaluatedPropsToName;
  	function setEvaluated(gen, props, ps) {
  		Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
  	}
  	exports.setEvaluated = setEvaluated;
  	var snippets = {};
  	function useFunc(gen, f) {
  		return gen.scopeValue("func", {
  			ref: f,
  			code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
  		});
  	}
  	exports.useFunc = useFunc;
  	var Type;
  	(function(Type) {
  		Type[Type["Num"] = 0] = "Num";
  		Type[Type["Str"] = 1] = "Str";
  	})(Type || (exports.Type = Type = {}));
  	function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
  		if (dataProp instanceof codegen_1.Name) {
  			const isNumber = dataPropType === Type.Num;
  			return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  		}
  		return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
  	}
  	exports.getErrorPath = getErrorPath;
  	function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
  		if (!mode) return;
  		msg = `strict mode: ${msg}`;
  		if (mode === true) throw new Error(msg);
  		it.self.logger.warn(msg);
  	}
  	exports.checkStrictMode = checkStrictMode;
  }));
  var require_names = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	exports.default = {
  		data: new codegen_1.Name("data"),
  		valCxt: new codegen_1.Name("valCxt"),
  		instancePath: new codegen_1.Name("instancePath"),
  		parentData: new codegen_1.Name("parentData"),
  		parentDataProperty: new codegen_1.Name("parentDataProperty"),
  		rootData: new codegen_1.Name("rootData"),
  		dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
  		vErrors: new codegen_1.Name("vErrors"),
  		errors: new codegen_1.Name("errors"),
  		this: new codegen_1.Name("this"),
  		self: new codegen_1.Name("self"),
  		scope: new codegen_1.Name("scope"),
  		json: new codegen_1.Name("json"),
  		jsonPos: new codegen_1.Name("jsonPos"),
  		jsonLen: new codegen_1.Name("jsonLen"),
  		jsonPart: new codegen_1.Name("jsonPart")
  	};
  }));
  var require_errors = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var names_1 = require_names();
  	exports.keywordError = { message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation` };
  	exports.keyword$DataError = { message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)` };
  	function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
  		const { it } = cxt;
  		const { gen, compositeRule, allErrors } = it;
  		const errObj = errorObjectCode(cxt, error, errorPaths);
  		if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) addError(gen, errObj);
  		else returnErrors(it, (0, codegen_1._)`[${errObj}]`);
  	}
  	exports.reportError = reportError;
  	function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
  		const { it } = cxt;
  		const { gen, compositeRule, allErrors } = it;
  		addError(gen, errorObjectCode(cxt, error, errorPaths));
  		if (!(compositeRule || allErrors)) returnErrors(it, names_1.default.vErrors);
  	}
  	exports.reportExtraError = reportExtraError;
  	function resetErrorsCount(gen, errsCount) {
  		gen.assign(names_1.default.errors, errsCount);
  		gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
  	}
  	exports.resetErrorsCount = resetErrorsCount;
  	function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
  		/* istanbul ignore if */
  		if (errsCount === void 0) throw new Error("ajv implementation error");
  		const err = gen.name("err");
  		gen.forRange("i", errsCount, names_1.default.errors, (i) => {
  			gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
  			gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
  			gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
  			if (it.opts.verbose) {
  				gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
  				gen.assign((0, codegen_1._)`${err}.data`, data);
  			}
  		});
  	}
  	exports.extendErrors = extendErrors;
  	function addError(gen, errObj) {
  		const err = gen.const("err", errObj);
  		gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
  		gen.code((0, codegen_1._)`${names_1.default.errors}++`);
  	}
  	function returnErrors(it, errs) {
  		const { gen, validateName, schemaEnv } = it;
  		if (schemaEnv.$async) gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
  		else {
  			gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
  			gen.return(false);
  		}
  	}
  	var E = {
  		keyword: new codegen_1.Name("keyword"),
  		schemaPath: new codegen_1.Name("schemaPath"),
  		params: new codegen_1.Name("params"),
  		propertyName: new codegen_1.Name("propertyName"),
  		message: new codegen_1.Name("message"),
  		schema: new codegen_1.Name("schema"),
  		parentSchema: new codegen_1.Name("parentSchema")
  	};
  	function errorObjectCode(cxt, error, errorPaths) {
  		const { createErrors } = cxt.it;
  		if (createErrors === false) return (0, codegen_1._)`{}`;
  		return errorObject(cxt, error, errorPaths);
  	}
  	function errorObject(cxt, error, errorPaths = {}) {
  		const { gen, it } = cxt;
  		const keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
  		extraErrorProps(cxt, error, keyValues);
  		return gen.object(...keyValues);
  	}
  	function errorInstancePath({ errorPath }, { instancePath }) {
  		const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
  		return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
  	}
  	function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
  		let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
  		if (schemaPath) schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
  		return [E.schemaPath, schPath];
  	}
  	function extraErrorProps(cxt, { params, message }, keyValues) {
  		const { keyword, data, schemaValue, it } = cxt;
  		const { opts, propertyName, topSchemaRef, schemaPath } = it;
  		keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
  		if (opts.messages) keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
  		if (opts.verbose) keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
  		if (propertyName) keyValues.push([E.propertyName, propertyName]);
  	}
  }));
  var require_boolSchema = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
  	var errors_1 = require_errors();
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var boolError = { message: "boolean schema is false" };
  	function topBoolOrEmptySchema(it) {
  		const { gen, schema, validateName } = it;
  		if (schema === false) falseSchemaError(it, false);
  		else if (typeof schema == "object" && schema.$async === true) gen.return(names_1.default.data);
  		else {
  			gen.assign((0, codegen_1._)`${validateName}.errors`, null);
  			gen.return(true);
  		}
  	}
  	exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
  	function boolOrEmptySchema(it, valid) {
  		const { gen, schema } = it;
  		if (schema === false) {
  			gen.var(valid, false);
  			falseSchemaError(it);
  		} else gen.var(valid, true);
  	}
  	exports.boolOrEmptySchema = boolOrEmptySchema;
  	function falseSchemaError(it, overrideAllErrors) {
  		const { gen, data } = it;
  		const cxt = {
  			gen,
  			keyword: "false schema",
  			data,
  			schema: false,
  			schemaCode: false,
  			schemaValue: false,
  			params: {},
  			it
  		};
  		(0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
  	}
  }));
  var require_rules = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.getRules = exports.isJSONType = void 0;
  	var jsonTypes = /* @__PURE__ */ new Set([
  		"string",
  		"number",
  		"integer",
  		"boolean",
  		"null",
  		"object",
  		"array"
  	]);
  	function isJSONType(x) {
  		return typeof x == "string" && jsonTypes.has(x);
  	}
  	exports.isJSONType = isJSONType;
  	function getRules() {
  		const groups = {
  			number: {
  				type: "number",
  				rules: []
  			},
  			string: {
  				type: "string",
  				rules: []
  			},
  			array: {
  				type: "array",
  				rules: []
  			},
  			object: {
  				type: "object",
  				rules: []
  			}
  		};
  		return {
  			types: {
  				...groups,
  				integer: true,
  				boolean: true,
  				null: true
  			},
  			rules: [
  				{ rules: [] },
  				groups.number,
  				groups.string,
  				groups.array,
  				groups.object
  			],
  			post: { rules: [] },
  			all: {},
  			keywords: {}
  		};
  	}
  	exports.getRules = getRules;
  }));
  var require_applicability = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
  	function schemaHasRulesForType({ schema, self }, type) {
  		const group = self.RULES.types[type];
  		return group && group !== true && shouldUseGroup(schema, group);
  	}
  	exports.schemaHasRulesForType = schemaHasRulesForType;
  	function shouldUseGroup(schema, group) {
  		return group.rules.some((rule) => shouldUseRule(schema, rule));
  	}
  	exports.shouldUseGroup = shouldUseGroup;
  	function shouldUseRule(schema, rule) {
  		var _a;
  		return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
  	}
  	exports.shouldUseRule = shouldUseRule;
  }));
  var require_dataType = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
  	var rules_1 = require_rules();
  	var applicability_1 = require_applicability();
  	var errors_1 = require_errors();
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var DataType;
  	(function(DataType) {
  		DataType[DataType["Correct"] = 0] = "Correct";
  		DataType[DataType["Wrong"] = 1] = "Wrong";
  	})(DataType || (exports.DataType = DataType = {}));
  	function getSchemaTypes(schema) {
  		const types = getJSONTypes(schema.type);
  		if (types.includes("null")) {
  			if (schema.nullable === false) throw new Error("type: null contradicts nullable: false");
  		} else {
  			if (!types.length && schema.nullable !== void 0) throw new Error("\"nullable\" cannot be used without \"type\"");
  			if (schema.nullable === true) types.push("null");
  		}
  		return types;
  	}
  	exports.getSchemaTypes = getSchemaTypes;
  	function getJSONTypes(ts) {
  		const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
  		if (types.every(rules_1.isJSONType)) return types;
  		throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
  	}
  	exports.getJSONTypes = getJSONTypes;
  	function coerceAndCheckDataType(it, types) {
  		const { gen, data, opts } = it;
  		const coerceTo = coerceToTypes(types, opts.coerceTypes);
  		const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
  		if (checkTypes) {
  			const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
  			gen.if(wrongType, () => {
  				if (coerceTo.length) coerceData(it, types, coerceTo);
  				else reportTypeError(it);
  			});
  		}
  		return checkTypes;
  	}
  	exports.coerceAndCheckDataType = coerceAndCheckDataType;
  	var COERCIBLE = /* @__PURE__ */ new Set([
  		"string",
  		"number",
  		"integer",
  		"boolean",
  		"null"
  	]);
  	function coerceToTypes(types, coerceTypes) {
  		return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
  	}
  	function coerceData(it, types, coerceTo) {
  		const { gen, data, opts } = it;
  		const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
  		const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
  		if (opts.coerceTypes === "array") gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
  		gen.if((0, codegen_1._)`${coerced} !== undefined`);
  		for (const t of coerceTo) if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") coerceSpecificType(t);
  		gen.else();
  		reportTypeError(it);
  		gen.endIf();
  		gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
  			gen.assign(data, coerced);
  			assignParentData(it, coerced);
  		});
  		function coerceSpecificType(t) {
  			switch (t) {
  				case "string":
  					gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
  					return;
  				case "number":
  					gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
                || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
  					return;
  				case "integer":
  					gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
                || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
  					return;
  				case "boolean":
  					gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
  					return;
  				case "null":
  					gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
  					gen.assign(coerced, null);
  					return;
  				case "array": gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
                || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
  			}
  		}
  	}
  	function assignParentData({ gen, parentData, parentDataProperty }, expr) {
  		gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
  	}
  	function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
  		const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
  		let cond;
  		switch (dataType) {
  			case "null": return (0, codegen_1._)`${data} ${EQ} null`;
  			case "array":
  				cond = (0, codegen_1._)`Array.isArray(${data})`;
  				break;
  			case "object":
  				cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
  				break;
  			case "integer":
  				cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
  				break;
  			case "number":
  				cond = numCond();
  				break;
  			default: return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
  		}
  		return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
  		function numCond(_cond = codegen_1.nil) {
  			return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
  		}
  	}
  	exports.checkDataType = checkDataType;
  	function checkDataTypes(dataTypes, data, strictNums, correct) {
  		if (dataTypes.length === 1) return checkDataType(dataTypes[0], data, strictNums, correct);
  		let cond;
  		const types = (0, util_1.toHash)(dataTypes);
  		if (types.array && types.object) {
  			const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
  			cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
  			delete types.null;
  			delete types.array;
  			delete types.object;
  		} else cond = codegen_1.nil;
  		if (types.number) delete types.integer;
  		for (const t in types) cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
  		return cond;
  	}
  	exports.checkDataTypes = checkDataTypes;
  	var typeError = {
  		message: ({ schema }) => `must be ${schema}`,
  		params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
  	};
  	function reportTypeError(it) {
  		const cxt = getTypeErrorContext(it);
  		(0, errors_1.reportError)(cxt, typeError);
  	}
  	exports.reportTypeError = reportTypeError;
  	function getTypeErrorContext(it) {
  		const { gen, data, schema } = it;
  		const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
  		return {
  			gen,
  			keyword: "type",
  			data,
  			schema: schema.type,
  			schemaCode,
  			schemaValue: schemaCode,
  			parentSchema: schema,
  			params: {},
  			it
  		};
  	}
  }));
  var require_defaults = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.assignDefaults = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	function assignDefaults(it, ty) {
  		const { properties, items } = it.schema;
  		if (ty === "object" && properties) for (const key in properties) assignDefault(it, key, properties[key].default);
  		else if (ty === "array" && Array.isArray(items)) items.forEach((sch, i) => assignDefault(it, i, sch.default));
  	}
  	exports.assignDefaults = assignDefaults;
  	function assignDefault(it, prop, defaultValue) {
  		const { gen, compositeRule, data, opts } = it;
  		if (defaultValue === void 0) return;
  		const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
  		if (compositeRule) {
  			(0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
  			return;
  		}
  		let condition = (0, codegen_1._)`${childData} === undefined`;
  		if (opts.useDefaults === "empty") condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
  		gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
  	}
  }));
  var require_code = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var names_1 = require_names();
  	var util_2 = require_util();
  	function checkReportMissingProp(cxt, prop) {
  		const { gen, data, it } = cxt;
  		gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
  			cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
  			cxt.error();
  		});
  	}
  	exports.checkReportMissingProp = checkReportMissingProp;
  	function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
  		return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
  	}
  	exports.checkMissingProp = checkMissingProp;
  	function reportMissingProp(cxt, missing) {
  		cxt.setParams({ missingProperty: missing }, true);
  		cxt.error();
  	}
  	exports.reportMissingProp = reportMissingProp;
  	function hasPropFunc(gen) {
  		return gen.scopeValue("func", {
  			ref: Object.prototype.hasOwnProperty,
  			code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
  		});
  	}
  	exports.hasPropFunc = hasPropFunc;
  	function isOwnProperty(gen, data, property) {
  		return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
  	}
  	exports.isOwnProperty = isOwnProperty;
  	function propertyInData(gen, data, property, ownProperties) {
  		const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
  		return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
  	}
  	exports.propertyInData = propertyInData;
  	function noPropertyInData(gen, data, property, ownProperties) {
  		const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
  		return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
  	}
  	exports.noPropertyInData = noPropertyInData;
  	function allSchemaProperties(schemaMap) {
  		return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  	}
  	exports.allSchemaProperties = allSchemaProperties;
  	function schemaProperties(it, schemaMap) {
  		return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
  	}
  	exports.schemaProperties = schemaProperties;
  	function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
  		const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
  		const valCxt = [
  			[names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
  			[names_1.default.parentData, it.parentData],
  			[names_1.default.parentDataProperty, it.parentDataProperty],
  			[names_1.default.rootData, names_1.default.rootData]
  		];
  		if (it.opts.dynamicRef) valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
  		const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
  		return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
  	}
  	exports.callValidateCode = callValidateCode;
  	var newRegExp = (0, codegen_1._)`new RegExp`;
  	function usePattern({ gen, it: { opts } }, pattern) {
  		const u = opts.unicodeRegExp ? "u" : "";
  		const { regExp } = opts.code;
  		const rx = regExp(pattern, u);
  		return gen.scopeValue("pattern", {
  			key: rx.toString(),
  			ref: rx,
  			code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
  		});
  	}
  	exports.usePattern = usePattern;
  	function validateArray(cxt) {
  		const { gen, data, keyword, it } = cxt;
  		const valid = gen.name("valid");
  		if (it.allErrors) {
  			const validArr = gen.let("valid", true);
  			validateItems(() => gen.assign(validArr, false));
  			return validArr;
  		}
  		gen.var(valid, true);
  		validateItems(() => gen.break());
  		return valid;
  		function validateItems(notValid) {
  			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
  			gen.forRange("i", 0, len, (i) => {
  				cxt.subschema({
  					keyword,
  					dataProp: i,
  					dataPropType: util_1.Type.Num
  				}, valid);
  				gen.if((0, codegen_1.not)(valid), notValid);
  			});
  		}
  	}
  	exports.validateArray = validateArray;
  	function validateUnion(cxt) {
  		const { gen, schema, keyword, it } = cxt;
  		/* istanbul ignore if */
  		if (!Array.isArray(schema)) throw new Error("ajv implementation error");
  		if (schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch)) && !it.opts.unevaluated) return;
  		const valid = gen.let("valid", false);
  		const schValid = gen.name("_valid");
  		gen.block(() => schema.forEach((_sch, i) => {
  			const schCxt = cxt.subschema({
  				keyword,
  				schemaProp: i,
  				compositeRule: true
  			}, schValid);
  			gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
  			if (!cxt.mergeValidEvaluated(schCxt, schValid)) gen.if((0, codegen_1.not)(valid));
  		}));
  		cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
  	}
  	exports.validateUnion = validateUnion;
  }));
  var require_keyword = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var code_1 = require_code();
  	var errors_1 = require_errors();
  	function macroKeywordCode(cxt, def) {
  		const { gen, keyword, schema, parentSchema, it } = cxt;
  		const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
  		const schemaRef = useKeyword(gen, keyword, macroSchema);
  		if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true);
  		const valid = gen.name("valid");
  		cxt.subschema({
  			schema: macroSchema,
  			schemaPath: codegen_1.nil,
  			errSchemaPath: `${it.errSchemaPath}/${keyword}`,
  			topSchemaRef: schemaRef,
  			compositeRule: true
  		}, valid);
  		cxt.pass(valid, () => cxt.error(true));
  	}
  	exports.macroKeywordCode = macroKeywordCode;
  	function funcKeywordCode(cxt, def) {
  		var _a;
  		const { gen, keyword, schema, parentSchema, $data, it } = cxt;
  		checkAsyncKeyword(it, def);
  		const validateRef = useKeyword(gen, keyword, !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate);
  		const valid = gen.let("valid");
  		cxt.block$data(valid, validateKeyword);
  		cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
  		function validateKeyword() {
  			if (def.errors === false) {
  				assignValid();
  				if (def.modifying) modifyData(cxt);
  				reportErrs(() => cxt.error());
  			} else {
  				const ruleErrs = def.async ? validateAsync() : validateSync();
  				if (def.modifying) modifyData(cxt);
  				reportErrs(() => addErrs(cxt, ruleErrs));
  			}
  		}
  		function validateAsync() {
  			const ruleErrs = gen.let("ruleErrs", null);
  			gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
  			return ruleErrs;
  		}
  		function validateSync() {
  			const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
  			gen.assign(validateErrs, null);
  			assignValid(codegen_1.nil);
  			return validateErrs;
  		}
  		function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
  			const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
  			const passSchema = !("compile" in def && !$data || def.schema === false);
  			gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
  		}
  		function reportErrs(errors) {
  			var _a;
  			gen.if((0, codegen_1.not)((_a = def.valid) !== null && _a !== void 0 ? _a : valid), errors);
  		}
  	}
  	exports.funcKeywordCode = funcKeywordCode;
  	function modifyData(cxt) {
  		const { gen, data, it } = cxt;
  		gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
  	}
  	function addErrs(cxt, errs) {
  		const { gen } = cxt;
  		gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
  			gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
  			(0, errors_1.extendErrors)(cxt);
  		}, () => cxt.error());
  	}
  	function checkAsyncKeyword({ schemaEnv }, def) {
  		if (def.async && !schemaEnv.$async) throw new Error("async keyword in sync schema");
  	}
  	function useKeyword(gen, keyword, result) {
  		if (result === void 0) throw new Error(`keyword "${keyword}" failed to compile`);
  		return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : {
  			ref: result,
  			code: (0, codegen_1.stringify)(result)
  		});
  	}
  	function validSchemaType(schema, schemaType, allowUndefined = false) {
  		return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
  	}
  	exports.validSchemaType = validSchemaType;
  	function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
  		/* istanbul ignore if */
  		if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) throw new Error("ajv implementation error");
  		const deps = def.dependencies;
  		if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
  		if (def.validateSchema) {
  			if (!def.validateSchema(schema[keyword])) {
  				const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
  				if (opts.validateSchema === "log") self.logger.error(msg);
  				else throw new Error(msg);
  			}
  		}
  	}
  	exports.validateKeywordUsage = validateKeywordUsage;
  }));
  var require_subschema = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
  		if (keyword !== void 0 && schema !== void 0) throw new Error("both \"keyword\" and \"schema\" passed, only one allowed");
  		if (keyword !== void 0) {
  			const sch = it.schema[keyword];
  			return schemaProp === void 0 ? {
  				schema: sch,
  				schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
  				errSchemaPath: `${it.errSchemaPath}/${keyword}`
  			} : {
  				schema: sch[schemaProp],
  				schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
  				errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
  			};
  		}
  		if (schema !== void 0) {
  			if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) throw new Error("\"schemaPath\", \"errSchemaPath\" and \"topSchemaRef\" are required with \"schema\"");
  			return {
  				schema,
  				schemaPath,
  				topSchemaRef,
  				errSchemaPath
  			};
  		}
  		throw new Error("either \"keyword\" or \"schema\" must be passed");
  	}
  	exports.getSubschema = getSubschema;
  	function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
  		if (data !== void 0 && dataProp !== void 0) throw new Error("both \"data\" and \"dataProp\" passed, only one allowed");
  		const { gen } = it;
  		if (dataProp !== void 0) {
  			const { errorPath, dataPathArr, opts } = it;
  			dataContextProps(gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true));
  			subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
  			subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
  			subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
  		}
  		if (data !== void 0) {
  			dataContextProps(data instanceof codegen_1.Name ? data : gen.let("data", data, true));
  			if (propertyName !== void 0) subschema.propertyName = propertyName;
  		}
  		if (dataTypes) subschema.dataTypes = dataTypes;
  		function dataContextProps(_nextData) {
  			subschema.data = _nextData;
  			subschema.dataLevel = it.dataLevel + 1;
  			subschema.dataTypes = [];
  			it.definedProperties = /* @__PURE__ */ new Set();
  			subschema.parentData = it.data;
  			subschema.dataNames = [...it.dataNames, _nextData];
  		}
  	}
  	exports.extendSubschemaData = extendSubschemaData;
  	function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
  		if (compositeRule !== void 0) subschema.compositeRule = compositeRule;
  		if (createErrors !== void 0) subschema.createErrors = createErrors;
  		if (allErrors !== void 0) subschema.allErrors = allErrors;
  		subschema.jtdDiscriminator = jtdDiscriminator;
  		subschema.jtdMetadata = jtdMetadata;
  	}
  	exports.extendSubschemaMode = extendSubschemaMode;
  }));
  var require_fast_deep_equal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	module.exports = function equal(a, b) {
  		if (a === b) return true;
  		if (a && b && typeof a == "object" && typeof b == "object") {
  			if (a.constructor !== b.constructor) return false;
  			var length, i, keys;
  			if (Array.isArray(a)) {
  				length = a.length;
  				if (length != b.length) return false;
  				for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
  				return true;
  			}
  			if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
  			if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
  			if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
  			keys = Object.keys(a);
  			length = keys.length;
  			if (length !== Object.keys(b).length) return false;
  			for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
  			for (i = length; i-- !== 0;) {
  				var key = keys[i];
  				if (!equal(a[key], b[key])) return false;
  			}
  			return true;
  		}
  		return a !== a && b !== b;
  	};
  }));
  var require_json_schema_traverse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	var traverse = module.exports = function(schema, opts, cb) {
  		if (typeof opts == "function") {
  			cb = opts;
  			opts = {};
  		}
  		cb = opts.cb || cb;
  		var pre = typeof cb == "function" ? cb : cb.pre || function() {};
  		var post = cb.post || function() {};
  		_traverse(opts, pre, post, schema, "", schema);
  	};
  	traverse.keywords = {
  		additionalItems: true,
  		items: true,
  		contains: true,
  		additionalProperties: true,
  		propertyNames: true,
  		not: true,
  		if: true,
  		then: true,
  		else: true
  	};
  	traverse.arrayKeywords = {
  		items: true,
  		allOf: true,
  		anyOf: true,
  		oneOf: true
  	};
  	traverse.propsKeywords = {
  		$defs: true,
  		definitions: true,
  		properties: true,
  		patternProperties: true,
  		dependencies: true
  	};
  	traverse.skipKeywords = {
  		default: true,
  		enum: true,
  		const: true,
  		required: true,
  		maximum: true,
  		minimum: true,
  		exclusiveMaximum: true,
  		exclusiveMinimum: true,
  		multipleOf: true,
  		maxLength: true,
  		minLength: true,
  		pattern: true,
  		format: true,
  		maxItems: true,
  		minItems: true,
  		uniqueItems: true,
  		maxProperties: true,
  		minProperties: true
  	};
  	function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  		if (schema && typeof schema == "object" && !Array.isArray(schema)) {
  			pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  			for (var key in schema) {
  				var sch = schema[key];
  				if (Array.isArray(sch)) {
  					if (key in traverse.arrayKeywords) for (var i = 0; i < sch.length; i++) _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
  				} else if (key in traverse.propsKeywords) {
  					if (sch && typeof sch == "object") for (var prop in sch) _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
  				} else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
  			}
  			post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  		}
  	}
  	function escapeJsonPtr(str) {
  		return str.replace(/~/g, "~0").replace(/\//g, "~1");
  	}
  }));
  var require_resolve = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
  	var util_1 = require_util();
  	var equal = require_fast_deep_equal();
  	var traverse = require_json_schema_traverse();
  	var SIMPLE_INLINED = /* @__PURE__ */ new Set([
  		"type",
  		"format",
  		"pattern",
  		"maxLength",
  		"minLength",
  		"maxProperties",
  		"minProperties",
  		"maxItems",
  		"minItems",
  		"maximum",
  		"minimum",
  		"uniqueItems",
  		"multipleOf",
  		"required",
  		"enum",
  		"const"
  	]);
  	function inlineRef(schema, limit = true) {
  		if (typeof schema == "boolean") return true;
  		if (limit === true) return !hasRef(schema);
  		if (!limit) return false;
  		return countKeys(schema) <= limit;
  	}
  	exports.inlineRef = inlineRef;
  	var REF_KEYWORDS = /* @__PURE__ */ new Set([
  		"$ref",
  		"$recursiveRef",
  		"$recursiveAnchor",
  		"$dynamicRef",
  		"$dynamicAnchor"
  	]);
  	function hasRef(schema) {
  		for (const key in schema) {
  			if (REF_KEYWORDS.has(key)) return true;
  			const sch = schema[key];
  			if (Array.isArray(sch) && sch.some(hasRef)) return true;
  			if (typeof sch == "object" && hasRef(sch)) return true;
  		}
  		return false;
  	}
  	function countKeys(schema) {
  		let count = 0;
  		for (const key in schema) {
  			if (key === "$ref") return Infinity;
  			count++;
  			if (SIMPLE_INLINED.has(key)) continue;
  			if (typeof schema[key] == "object") (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
  			if (count === Infinity) return Infinity;
  		}
  		return count;
  	}
  	function getFullPath(resolver, id = "", normalize) {
  		if (normalize !== false) id = normalizeId(id);
  		return _getFullPath(resolver, resolver.parse(id));
  	}
  	exports.getFullPath = getFullPath;
  	function _getFullPath(resolver, p) {
  		return resolver.serialize(p).split("#")[0] + "#";
  	}
  	exports._getFullPath = _getFullPath;
  	var TRAILING_SLASH_HASH = /#\/?$/;
  	function normalizeId(id) {
  		return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
  	}
  	exports.normalizeId = normalizeId;
  	function resolveUrl(resolver, baseId, id) {
  		id = normalizeId(id);
  		return resolver.resolve(baseId, id);
  	}
  	exports.resolveUrl = resolveUrl;
  	var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
  	function getSchemaRefs(schema, baseId) {
  		if (typeof schema == "boolean") return {};
  		const { schemaId, uriResolver } = this.opts;
  		const schId = normalizeId(schema[schemaId] || baseId);
  		const baseIds = { "": schId };
  		const pathPrefix = getFullPath(uriResolver, schId, false);
  		const localRefs = {};
  		const schemaRefs = /* @__PURE__ */ new Set();
  		traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
  			if (parentJsonPtr === void 0) return;
  			const fullPath = pathPrefix + jsonPtr;
  			let innerBaseId = baseIds[parentJsonPtr];
  			if (typeof sch[schemaId] == "string") innerBaseId = addRef.call(this, sch[schemaId]);
  			addAnchor.call(this, sch.$anchor);
  			addAnchor.call(this, sch.$dynamicAnchor);
  			baseIds[jsonPtr] = innerBaseId;
  			function addRef(ref) {
  				const _resolve = this.opts.uriResolver.resolve;
  				ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
  				if (schemaRefs.has(ref)) throw ambiguos(ref);
  				schemaRefs.add(ref);
  				let schOrRef = this.refs[ref];
  				if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef];
  				if (typeof schOrRef == "object") checkAmbiguosRef(sch, schOrRef.schema, ref);
  				else if (ref !== normalizeId(fullPath)) {
  					if (ref[0] === "#") {
  						checkAmbiguosRef(sch, localRefs[ref], ref);
  						localRefs[ref] = sch;
  					} else this.refs[ref] = fullPath;
  				}
  				return ref;
  			}
  			function addAnchor(anchor) {
  				if (typeof anchor == "string") {
  					if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`);
  					addRef.call(this, `#${anchor}`);
  				}
  			}
  		});
  		return localRefs;
  		function checkAmbiguosRef(sch1, sch2, ref) {
  			if (sch2 !== void 0 && !equal(sch1, sch2)) throw ambiguos(ref);
  		}
  		function ambiguos(ref) {
  			return /* @__PURE__ */ new Error(`reference "${ref}" resolves to more than one schema`);
  		}
  	}
  	exports.getSchemaRefs = getSchemaRefs;
  }));
  var require_validate = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
  	var boolSchema_1 = require_boolSchema();
  	var dataType_1 = require_dataType();
  	var applicability_1 = require_applicability();
  	var dataType_2 = require_dataType();
  	var defaults_1 = require_defaults();
  	var keyword_1 = require_keyword();
  	var subschema_1 = require_subschema();
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var resolve_1 = require_resolve();
  	var util_1 = require_util();
  	var errors_1 = require_errors();
  	function validateFunctionCode(it) {
  		if (isSchemaObj(it)) {
  			checkKeywords(it);
  			if (schemaCxtHasRules(it)) {
  				topSchemaObjCode(it);
  				return;
  			}
  		}
  		validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
  	}
  	exports.validateFunctionCode = validateFunctionCode;
  	function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
  		if (opts.code.es5) gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
  			gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
  			destructureValCxtES5(gen, opts);
  			gen.code(body);
  		});
  		else gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
  	}
  	function destructureValCxt(opts) {
  		return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
  	}
  	function destructureValCxtES5(gen, opts) {
  		gen.if(names_1.default.valCxt, () => {
  			gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
  			gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
  			gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
  			gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
  			if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
  		}, () => {
  			gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
  			gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
  			gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
  			gen.var(names_1.default.rootData, names_1.default.data);
  			if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
  		});
  	}
  	function topSchemaObjCode(it) {
  		const { schema, opts, gen } = it;
  		validateFunction(it, () => {
  			if (opts.$comment && schema.$comment) commentKeyword(it);
  			checkNoDefault(it);
  			gen.let(names_1.default.vErrors, null);
  			gen.let(names_1.default.errors, 0);
  			if (opts.unevaluated) resetEvaluated(it);
  			typeAndKeywords(it);
  			returnResults(it);
  		});
  	}
  	function resetEvaluated(it) {
  		const { gen, validateName } = it;
  		it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
  		gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
  		gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
  	}
  	function funcSourceUrl(schema, opts) {
  		const schId = typeof schema == "object" && schema[opts.schemaId];
  		return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
  	}
  	function subschemaCode(it, valid) {
  		if (isSchemaObj(it)) {
  			checkKeywords(it);
  			if (schemaCxtHasRules(it)) {
  				subSchemaObjCode(it, valid);
  				return;
  			}
  		}
  		(0, boolSchema_1.boolOrEmptySchema)(it, valid);
  	}
  	function schemaCxtHasRules({ schema, self }) {
  		if (typeof schema == "boolean") return !schema;
  		for (const key in schema) if (self.RULES.all[key]) return true;
  		return false;
  	}
  	function isSchemaObj(it) {
  		return typeof it.schema != "boolean";
  	}
  	function subSchemaObjCode(it, valid) {
  		const { schema, gen, opts } = it;
  		if (opts.$comment && schema.$comment) commentKeyword(it);
  		updateContext(it);
  		checkAsyncSchema(it);
  		const errsCount = gen.const("_errs", names_1.default.errors);
  		typeAndKeywords(it, errsCount);
  		gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
  	}
  	function checkKeywords(it) {
  		(0, util_1.checkUnknownRules)(it);
  		checkRefsAndKeywords(it);
  	}
  	function typeAndKeywords(it, errsCount) {
  		if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount);
  		const types = (0, dataType_1.getSchemaTypes)(it.schema);
  		schemaKeywords(it, types, !(0, dataType_1.coerceAndCheckDataType)(it, types), errsCount);
  	}
  	function checkRefsAndKeywords(it) {
  		const { schema, errSchemaPath, opts, self } = it;
  		if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  	}
  	function checkNoDefault(it) {
  		const { schema, opts } = it;
  		if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
  	}
  	function updateContext(it) {
  		const schId = it.schema[it.opts.schemaId];
  		if (schId) it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
  	}
  	function checkAsyncSchema(it) {
  		if (it.schema.$async && !it.schemaEnv.$async) throw new Error("async schema in sync schema");
  	}
  	function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
  		const msg = schema.$comment;
  		if (opts.$comment === true) gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
  		else if (typeof opts.$comment == "function") {
  			const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
  			const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
  			gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
  		}
  	}
  	function returnResults(it) {
  		const { gen, schemaEnv, validateName, ValidationError, opts } = it;
  		if (schemaEnv.$async) gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
  		else {
  			gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
  			if (opts.unevaluated) assignEvaluated(it);
  			gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
  		}
  	}
  	function assignEvaluated({ gen, evaluated, props, items }) {
  		if (props instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.props`, props);
  		if (items instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.items`, items);
  	}
  	function schemaKeywords(it, types, typeErrors, errsCount) {
  		const { gen, schema, data, allErrors, opts, self } = it;
  		const { RULES } = self;
  		if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
  			gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
  			return;
  		}
  		if (!opts.jtd) checkStrictTypes(it, types);
  		gen.block(() => {
  			for (const group of RULES.rules) groupKeywords(group);
  			groupKeywords(RULES.post);
  		});
  		function groupKeywords(group) {
  			if (!(0, applicability_1.shouldUseGroup)(schema, group)) return;
  			if (group.type) {
  				gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
  				iterateKeywords(it, group);
  				if (types.length === 1 && types[0] === group.type && typeErrors) {
  					gen.else();
  					(0, dataType_2.reportTypeError)(it);
  				}
  				gen.endIf();
  			} else iterateKeywords(it, group);
  			if (!allErrors) gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
  		}
  	}
  	function iterateKeywords(it, group) {
  		const { gen, schema, opts: { useDefaults } } = it;
  		if (useDefaults) (0, defaults_1.assignDefaults)(it, group.type);
  		gen.block(() => {
  			for (const rule of group.rules) if ((0, applicability_1.shouldUseRule)(schema, rule)) keywordCode(it, rule.keyword, rule.definition, group.type);
  		});
  	}
  	function checkStrictTypes(it, types) {
  		if (it.schemaEnv.meta || !it.opts.strictTypes) return;
  		checkContextTypes(it, types);
  		if (!it.opts.allowUnionTypes) checkMultipleTypes(it, types);
  		checkKeywordTypes(it, it.dataTypes);
  	}
  	function checkContextTypes(it, types) {
  		if (!types.length) return;
  		if (!it.dataTypes.length) {
  			it.dataTypes = types;
  			return;
  		}
  		types.forEach((t) => {
  			if (!includesType(it.dataTypes, t)) strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
  		});
  		narrowSchemaTypes(it, types);
  	}
  	function checkMultipleTypes(it, ts) {
  		if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) strictTypesError(it, "use allowUnionTypes to allow union type keyword");
  	}
  	function checkKeywordTypes(it, ts) {
  		const rules = it.self.RULES.all;
  		for (const keyword in rules) {
  			const rule = rules[keyword];
  			if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
  				const { type } = rule.definition;
  				if (type.length && !type.some((t) => hasApplicableType(ts, t))) strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
  			}
  		}
  	}
  	function hasApplicableType(schTs, kwdT) {
  		return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
  	}
  	function includesType(ts, t) {
  		return ts.includes(t) || t === "integer" && ts.includes("number");
  	}
  	function narrowSchemaTypes(it, withTypes) {
  		const ts = [];
  		for (const t of it.dataTypes) if (includesType(withTypes, t)) ts.push(t);
  		else if (withTypes.includes("integer") && t === "number") ts.push("integer");
  		it.dataTypes = ts;
  	}
  	function strictTypesError(it, msg) {
  		const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
  		msg += ` at "${schemaPath}" (strictTypes)`;
  		(0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
  	}
  	var KeywordCxt = class {
  		constructor(it, def, keyword) {
  			(0, keyword_1.validateKeywordUsage)(it, def, keyword);
  			this.gen = it.gen;
  			this.allErrors = it.allErrors;
  			this.keyword = keyword;
  			this.data = it.data;
  			this.schema = it.schema[keyword];
  			this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
  			this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
  			this.schemaType = def.schemaType;
  			this.parentSchema = it.schema;
  			this.params = {};
  			this.it = it;
  			this.def = def;
  			if (this.$data) this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
  			else {
  				this.schemaCode = this.schemaValue;
  				if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
  			}
  			if ("code" in def ? def.trackErrors : def.errors !== false) this.errsCount = it.gen.const("_errs", names_1.default.errors);
  		}
  		result(condition, successAction, failAction) {
  			this.failResult((0, codegen_1.not)(condition), successAction, failAction);
  		}
  		failResult(condition, successAction, failAction) {
  			this.gen.if(condition);
  			if (failAction) failAction();
  			else this.error();
  			if (successAction) {
  				this.gen.else();
  				successAction();
  				if (this.allErrors) this.gen.endIf();
  			} else if (this.allErrors) this.gen.endIf();
  			else this.gen.else();
  		}
  		pass(condition, failAction) {
  			this.failResult((0, codegen_1.not)(condition), void 0, failAction);
  		}
  		fail(condition) {
  			if (condition === void 0) {
  				this.error();
  				if (!this.allErrors) this.gen.if(false);
  				return;
  			}
  			this.gen.if(condition);
  			this.error();
  			if (this.allErrors) this.gen.endIf();
  			else this.gen.else();
  		}
  		fail$data(condition) {
  			if (!this.$data) return this.fail(condition);
  			const { schemaCode } = this;
  			this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
  		}
  		error(append, errorParams, errorPaths) {
  			if (errorParams) {
  				this.setParams(errorParams);
  				this._error(append, errorPaths);
  				this.setParams({});
  				return;
  			}
  			this._error(append, errorPaths);
  		}
  		_error(append, errorPaths) {
  			(append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
  		}
  		$dataError() {
  			(0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
  		}
  		reset() {
  			if (this.errsCount === void 0) throw new Error("add \"trackErrors\" to keyword definition");
  			(0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
  		}
  		ok(cond) {
  			if (!this.allErrors) this.gen.if(cond);
  		}
  		setParams(obj, assign) {
  			if (assign) Object.assign(this.params, obj);
  			else this.params = obj;
  		}
  		block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
  			this.gen.block(() => {
  				this.check$data(valid, $dataValid);
  				codeBlock();
  			});
  		}
  		check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
  			if (!this.$data) return;
  			const { gen, schemaCode, schemaType, def } = this;
  			gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
  			if (valid !== codegen_1.nil) gen.assign(valid, true);
  			if (schemaType.length || def.validateSchema) {
  				gen.elseIf(this.invalid$data());
  				this.$dataError();
  				if (valid !== codegen_1.nil) gen.assign(valid, false);
  			}
  			gen.else();
  		}
  		invalid$data() {
  			const { gen, schemaCode, schemaType, def, it } = this;
  			return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
  			function wrong$DataType() {
  				if (schemaType.length) {
  					/* istanbul ignore if */
  					if (!(schemaCode instanceof codegen_1.Name)) throw new Error("ajv implementation error");
  					const st = Array.isArray(schemaType) ? schemaType : [schemaType];
  					return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
  				}
  				return codegen_1.nil;
  			}
  			function invalid$DataSchema() {
  				if (def.validateSchema) {
  					const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
  					return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
  				}
  				return codegen_1.nil;
  			}
  		}
  		subschema(appl, valid) {
  			const subschema = (0, subschema_1.getSubschema)(this.it, appl);
  			(0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
  			(0, subschema_1.extendSubschemaMode)(subschema, appl);
  			const nextContext = {
  				...this.it,
  				...subschema,
  				items: void 0,
  				props: void 0
  			};
  			subschemaCode(nextContext, valid);
  			return nextContext;
  		}
  		mergeEvaluated(schemaCxt, toName) {
  			const { it, gen } = this;
  			if (!it.opts.unevaluated) return;
  			if (it.props !== true && schemaCxt.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
  			if (it.items !== true && schemaCxt.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
  		}
  		mergeValidEvaluated(schemaCxt, valid) {
  			const { it, gen } = this;
  			if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
  				gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
  				return true;
  			}
  		}
  	};
  	exports.KeywordCxt = KeywordCxt;
  	function keywordCode(it, keyword, def, ruleType) {
  		const cxt = new KeywordCxt(it, def, keyword);
  		if ("code" in def) def.code(cxt, ruleType);
  		else if (cxt.$data && def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
  		else if ("macro" in def) (0, keyword_1.macroKeywordCode)(cxt, def);
  		else if (def.compile || def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
  	}
  	var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  	var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  	function getData($data, { dataLevel, dataNames, dataPathArr }) {
  		let jsonPointer;
  		let data;
  		if ($data === "") return names_1.default.rootData;
  		if ($data[0] === "/") {
  			if (!JSON_POINTER.test($data)) throw new Error(`Invalid JSON-pointer: ${$data}`);
  			jsonPointer = $data;
  			data = names_1.default.rootData;
  		} else {
  			const matches = RELATIVE_JSON_POINTER.exec($data);
  			if (!matches) throw new Error(`Invalid JSON-pointer: ${$data}`);
  			const up = +matches[1];
  			jsonPointer = matches[2];
  			if (jsonPointer === "#") {
  				if (up >= dataLevel) throw new Error(errorMsg("property/index", up));
  				return dataPathArr[dataLevel - up];
  			}
  			if (up > dataLevel) throw new Error(errorMsg("data", up));
  			data = dataNames[dataLevel - up];
  			if (!jsonPointer) return data;
  		}
  		let expr = data;
  		const segments = jsonPointer.split("/");
  		for (const segment of segments) if (segment) {
  			data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
  			expr = (0, codegen_1._)`${expr} && ${data}`;
  		}
  		return expr;
  		function errorMsg(pointerType, up) {
  			return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
  		}
  	}
  	exports.getData = getData;
  }));
  var require_validation_error = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var ValidationError = class extends Error {
  		constructor(errors) {
  			super("validation failed");
  			this.errors = errors;
  			this.ajv = this.validation = true;
  		}
  	};
  	exports.default = ValidationError;
  }));
  var require_ref_error = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var resolve_1 = require_resolve();
  	var MissingRefError = class extends Error {
  		constructor(resolver, baseId, ref, msg) {
  			super(msg || `can't resolve reference ${ref} from id ${baseId}`);
  			this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
  			this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
  		}
  	};
  	exports.default = MissingRefError;
  }));
  var require_compile = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
  	var codegen_1 = require_codegen();
  	var validation_error_1 = require_validation_error();
  	var names_1 = require_names();
  	var resolve_1 = require_resolve();
  	var util_1 = require_util();
  	var validate_1 = require_validate();
  	var SchemaEnv = class {
  		constructor(env) {
  			var _a;
  			this.refs = {};
  			this.dynamicAnchors = {};
  			let schema;
  			if (typeof env.schema == "object") schema = env.schema;
  			this.schema = env.schema;
  			this.schemaId = env.schemaId;
  			this.root = env.root || this;
  			this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
  			this.schemaPath = env.schemaPath;
  			this.localRefs = env.localRefs;
  			this.meta = env.meta;
  			this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
  			this.refs = {};
  		}
  	};
  	exports.SchemaEnv = SchemaEnv;
  	function compileSchema(sch) {
  		const _sch = getCompilingSchema.call(this, sch);
  		if (_sch) return _sch;
  		const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
  		const { es5, lines } = this.opts.code;
  		const { ownProperties } = this.opts;
  		const gen = new codegen_1.CodeGen(this.scope, {
  			es5,
  			lines,
  			ownProperties
  		});
  		let _ValidationError;
  		if (sch.$async) _ValidationError = gen.scopeValue("Error", {
  			ref: validation_error_1.default,
  			code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
  		});
  		const validateName = gen.scopeName("validate");
  		sch.validateName = validateName;
  		const schemaCxt = {
  			gen,
  			allErrors: this.opts.allErrors,
  			data: names_1.default.data,
  			parentData: names_1.default.parentData,
  			parentDataProperty: names_1.default.parentDataProperty,
  			dataNames: [names_1.default.data],
  			dataPathArr: [codegen_1.nil],
  			dataLevel: 0,
  			dataTypes: [],
  			definedProperties: /* @__PURE__ */ new Set(),
  			topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? {
  				ref: sch.schema,
  				code: (0, codegen_1.stringify)(sch.schema)
  			} : { ref: sch.schema }),
  			validateName,
  			ValidationError: _ValidationError,
  			schema: sch.schema,
  			schemaEnv: sch,
  			rootId,
  			baseId: sch.baseId || rootId,
  			schemaPath: codegen_1.nil,
  			errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
  			errorPath: (0, codegen_1._)`""`,
  			opts: this.opts,
  			self: this
  		};
  		let sourceCode;
  		try {
  			this._compilations.add(sch);
  			(0, validate_1.validateFunctionCode)(schemaCxt);
  			gen.optimize(this.opts.code.optimize);
  			const validateCode = gen.toString();
  			sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
  			if (this.opts.code.process) sourceCode = this.opts.code.process(sourceCode, sch);
  			const validate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode)(this, this.scope.get());
  			this.scope.value(validateName, { ref: validate });
  			validate.errors = null;
  			validate.schema = sch.schema;
  			validate.schemaEnv = sch;
  			if (sch.$async) validate.$async = true;
  			if (this.opts.code.source === true) validate.source = {
  				validateName,
  				validateCode,
  				scopeValues: gen._values
  			};
  			if (this.opts.unevaluated) {
  				const { props, items } = schemaCxt;
  				validate.evaluated = {
  					props: props instanceof codegen_1.Name ? void 0 : props,
  					items: items instanceof codegen_1.Name ? void 0 : items,
  					dynamicProps: props instanceof codegen_1.Name,
  					dynamicItems: items instanceof codegen_1.Name
  				};
  				if (validate.source) validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
  			}
  			sch.validate = validate;
  			return sch;
  		} catch (e) {
  			delete sch.validate;
  			delete sch.validateName;
  			if (sourceCode) this.logger.error("Error compiling schema, function code:", sourceCode);
  			throw e;
  		} finally {
  			this._compilations.delete(sch);
  		}
  	}
  	exports.compileSchema = compileSchema;
  	function resolveRef(root, baseId, ref) {
  		var _a;
  		ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
  		const schOrFunc = root.refs[ref];
  		if (schOrFunc) return schOrFunc;
  		let _sch = resolve.call(this, root, ref);
  		if (_sch === void 0) {
  			const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
  			const { schemaId } = this.opts;
  			if (schema) _sch = new SchemaEnv({
  				schema,
  				schemaId,
  				root,
  				baseId
  			});
  		}
  		if (_sch === void 0) return;
  		return root.refs[ref] = inlineOrCompile.call(this, _sch);
  	}
  	exports.resolveRef = resolveRef;
  	function inlineOrCompile(sch) {
  		if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs)) return sch.schema;
  		return sch.validate ? sch : compileSchema.call(this, sch);
  	}
  	function getCompilingSchema(schEnv) {
  		for (const sch of this._compilations) if (sameSchemaEnv(sch, schEnv)) return sch;
  	}
  	exports.getCompilingSchema = getCompilingSchema;
  	function sameSchemaEnv(s1, s2) {
  		return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
  	}
  	function resolve(root, ref) {
  		let sch;
  		while (typeof (sch = this.refs[ref]) == "string") ref = sch;
  		return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
  	}
  	function resolveSchema(root, ref) {
  		const p = this.opts.uriResolver.parse(ref);
  		const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
  		let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
  		if (Object.keys(root.schema).length > 0 && refPath === baseId) return getJsonPointer.call(this, p, root);
  		const id = (0, resolve_1.normalizeId)(refPath);
  		const schOrRef = this.refs[id] || this.schemas[id];
  		if (typeof schOrRef == "string") {
  			const sch = resolveSchema.call(this, root, schOrRef);
  			if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object") return;
  			return getJsonPointer.call(this, p, sch);
  		}
  		if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object") return;
  		if (!schOrRef.validate) compileSchema.call(this, schOrRef);
  		if (id === (0, resolve_1.normalizeId)(ref)) {
  			const { schema } = schOrRef;
  			const { schemaId } = this.opts;
  			const schId = schema[schemaId];
  			if (schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
  			return new SchemaEnv({
  				schema,
  				schemaId,
  				root,
  				baseId
  			});
  		}
  		return getJsonPointer.call(this, p, schOrRef);
  	}
  	exports.resolveSchema = resolveSchema;
  	var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
  		"properties",
  		"patternProperties",
  		"enum",
  		"dependencies",
  		"definitions"
  	]);
  	function getJsonPointer(parsedRef, { baseId, schema, root }) {
  		var _a;
  		if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/") return;
  		for (const part of parsedRef.fragment.slice(1).split("/")) {
  			if (typeof schema === "boolean") return;
  			const partSchema = schema[(0, util_1.unescapeFragment)(part)];
  			if (partSchema === void 0) return;
  			schema = partSchema;
  			const schId = typeof schema === "object" && schema[this.opts.schemaId];
  			if (!PREVENT_SCOPE_CHANGE.has(part) && schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
  		}
  		let env;
  		if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
  			const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
  			env = resolveSchema.call(this, root, $ref);
  		}
  		const { schemaId } = this.opts;
  		env = env || new SchemaEnv({
  			schema,
  			schemaId,
  			root,
  			baseId
  		});
  		if (env.schema !== env.root.schema) return env;
  	}
  }));
  var data_exports = /* @__PURE__ */ __exportAll({
  	$id: () => $id$13,
  	additionalProperties: () => false,
  	default: () => data_default,
  	description: () => description,
  	properties: () => properties$12,
  	required: () => required$3,
  	type: () => type$12
  }), $id$13, description, type$12, required$3, properties$12, data_default;
  var init_data = __esmMin((() => {
  	$id$13 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
  	description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
  	type$12 = "object";
  	required$3 = ["$data"];
  	properties$12 = { "$data": {
  		"type": "string",
  		"anyOf": [{ "format": "relative-json-pointer" }, { "format": "json-pointer" }]
  	} };
  	data_default = {
  		$id: $id$13,
  		description,
  		type: type$12,
  		required: required$3,
  		properties: properties$12,
  		additionalProperties: false
  	};
  }));
  var require_utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	/** @type {(value: string) => boolean} */
  	var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
  	/** @type {(value: string) => boolean} */
  	var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
  	/** @type {(value: string) => boolean} */
  	var isPort = RegExp.prototype.test.bind(/^\d*$/u);
  	/** @type {(value: string) => boolean} */
  	var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
  	/** @type {(value: string) => boolean} */
  	var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
  	/** @type {(value: string) => boolean} */
  	var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
  	/** @type {(value: string) => boolean} */
  	var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
  	/** @type {(value: string) => boolean} */
  	var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
  	var BYTE_HEX = new Array(256);
  	{
  		const HEX_DIGITS = "0123456789ABCDEF";
  		for (let i = 0; i < 256; i++) BYTE_HEX[i] = "%" + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 15];
  	}
  	function percentEncodeNonAscii(cp) {
  		if (cp < 2048) return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
  		if (cp < 65536) return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
  		return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
  	}
  	/**
  	* @param {Array<string>} input
  	* @returns {string}
  	*/
  	function stringArrayToHexStripped(input) {
  		let acc = "";
  		let code = 0;
  		let i = 0;
  		for (i = 0; i < input.length; i++) {
  			code = input[i].charCodeAt(0);
  			if (code === 48) continue;
  			if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
  			acc += input[i];
  			break;
  		}
  		for (i += 1; i < input.length; i++) {
  			code = input[i].charCodeAt(0);
  			if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
  			acc += input[i];
  		}
  		return acc;
  	}
  	/** @type {(value: string) => boolean} */
  	var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
  	/** @type {(value: string) => boolean} */
  	var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
  	/** @type {(value: string) => boolean} */
  	var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
  	/**
  	* @param {string} value
  	* @returns {boolean}
  	*/
  	var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
  	/**
  	* @param {string} zone
  	* @returns {boolean}
  	*/
  	function isZoneIdentifier(zone) {
  		if (zone.length === 0) return false;
  		for (let i = 0; i < zone.length; i++) {
  			if (isZoneCharacter(zone[i])) continue;
  			if (zone[i] === "%" && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
  				i += 2;
  				continue;
  			}
  			return false;
  		}
  		return true;
  	}
  	/**
  	* Compresses the longest run of zero hextets to "::" per RFC 5952. A run of a
  	* single zero hextet is left uncompressed. On ties the leftmost run wins.
  	*
  	* @param {string[]} hextets
  	* @returns {string}
  	*/
  	function compressIPv6ZeroRun(hextets) {
  		let bestStart = -1;
  		let bestLength = 0;
  		let runStart = -1;
  		let runLength = 0;
  		for (let i = 0; i < hextets.length; i++) if (hextets[i] === "0") {
  			if (runStart === -1) runStart = i;
  			runLength++;
  			if (runLength > bestLength) {
  				bestLength = runLength;
  				bestStart = runStart;
  			}
  		} else {
  			runStart = -1;
  			runLength = 0;
  		}
  		if (bestLength < 2) return hextets.join(":");
  		const head = hextets.slice(0, bestStart).join(":");
  		const tail = hextets.slice(bestStart + bestLength).join(":");
  		return head + "::" + tail;
  	}
  	/**
  	* Validates an IPv6 address against the alternatives in RFC 3986 section
  	* 3.2.2 and returns the same address with leading hextet zeroes removed.
  	* An embedded IPv4 address counts as two hextets and is only valid at the end.
  	*
  	* @param {string} input
  	* @returns {string|undefined}
  	*/
  	function normalizeIPv6Address(input) {
  		const compression = input.indexOf("::");
  		if (compression !== -1 && input.indexOf("::", compression + 1) !== -1) return void 0;
  		const left = compression === -1 ? input.split(":") : input.slice(0, compression).split(":");
  		const right = compression === -1 ? [] : input.slice(compression + 2).split(":");
  		if (compression !== -1) {
  			if (left.length === 1 && left[0] === "") left.length = 0;
  			if (right.length === 1 && right[0] === "") right.length = 0;
  		}
  		const parts = left.concat(right);
  		let hextetCount = 0;
  		for (let i = 0; i < parts.length; i++) {
  			const part = parts[i];
  			if (part === "") return void 0;
  			if (part.indexOf(".") !== -1) {
  				if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
  				hextetCount += 2;
  				continue;
  			}
  			if (!isHextet(part)) return void 0;
  			parts[i] = parseInt(part, 16).toString(16);
  			hextetCount++;
  		}
  		if (compression === -1) {
  			if (hextetCount !== 8) return void 0;
  			return compressIPv6ZeroRun(parts);
  		}
  		if (hextetCount >= 8) return void 0;
  		const expanded = parts.slice(0, left.length);
  		for (let i = hextetCount; i < 8; i++) expanded.push("0");
  		for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
  		return compressIPv6ZeroRun(expanded);
  	}
  	/**
  	* @typedef {Object} NormalizeIPv6Result
  	* @property {string} host - The normalized host.
  	* @property {string} [escapedHost] - The escaped host.
  	* @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
  	* @property {boolean} [isIPVFuture] - Indicates if the host is an IPvFuture literal.
  	* @property {boolean} [error] - Indicates if a bracketed IP literal is malformed.
  	*/
  	/**
  	* Validates and normalizes a bracketed IP literal. Raw zone separators remain
  	* accepted for backwards compatibility, while encoded separators and zone
  	* contents follow RFC 6874.
  	*
  	* @param {string} host
  	* @returns {NormalizeIPv6Result}
  	*/
  	function normalizeIPv6(host) {
  		const bracketed = host[0] === "[" && host[host.length - 1] === "]";
  		if ((host[0] === "[" || host[host.length - 1] === "]") && !bracketed) return {
  			host,
  			isIPV6: false,
  			error: true
  		};
  		let input = bracketed ? host.slice(1, -1) : host;
  		if (bracketed && isIPvFuture(input)) {
  			input = input.toLowerCase();
  			return {
  				host: `[${input}]`,
  				escapedHost: input,
  				isIPV6: false,
  				isIPVFuture: true
  			};
  		}
  		if (findToken(input, ":") < 2) return {
  			host,
  			isIPV6: false,
  			error: bracketed
  		};
  		let zoneIdentifier = "";
  		const zoneSeparator = input.indexOf("%");
  		if (zoneSeparator !== -1) {
  			const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
  			zoneIdentifier = input.slice(zoneSeparator + separatorLength);
  			if (!isZoneIdentifier(zoneIdentifier)) return {
  				host,
  				isIPV6: false,
  				error: true
  			};
  			input = input.slice(0, zoneSeparator);
  		}
  		const address = normalizeIPv6Address(input);
  		if (address === void 0) return {
  			host,
  			isIPV6: false,
  			error: true
  		};
  		return {
  			host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
  			escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
  			isIPV6: true
  		};
  	}
  	/**
  	* @param {string} str
  	* @param {string} token
  	* @returns {number}
  	*/
  	function findToken(str, token) {
  		let ind = 0;
  		for (let i = 0; i < str.length; i++) if (str[i] === token) ind++;
  		return ind;
  	}
  	/**
  	* @param {string} path
  	* @returns {string}
  	*
  	* @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
  	*/
  	function removeDotSegments(path) {
  		let input = path;
  		const output = [];
  		let nextSlash = -1;
  		let len = 0;
  		while (len = input.length) {
  			if (len === 1) {
  				if (input === ".") break;
  				else if (input === "/") {
  					output.push("/");
  					break;
  				} else {
  					output.push(input);
  					break;
  				}
  			} else if (len === 2) {
  				if (input[0] === ".") {
  					if (input[1] === ".") break;
  					else if (input[1] === "/") {
  						input = input.slice(2);
  						continue;
  					}
  				} else if (input[0] === "/") {
  					if (input[1] === "." || input[1] === "/") {
  						output.push("/");
  						break;
  					}
  				}
  			} else if (len === 3) {
  				if (input === "/..") {
  					if (output.length !== 0) output.pop();
  					output.push("/");
  					break;
  				}
  			}
  			if (input[0] === ".") {
  				if (input[1] === ".") {
  					if (input[2] === "/") {
  						input = input.slice(3);
  						continue;
  					}
  				} else if (input[1] === "/") {
  					input = input.slice(2);
  					continue;
  				}
  			} else if (input[0] === "/") {
  				if (input[1] === ".") {
  					if (input[2] === "/") {
  						input = input.slice(2);
  						continue;
  					} else if (input[2] === ".") {
  						if (input[3] === "/") {
  							input = input.slice(3);
  							if (output.length !== 0) output.pop();
  							continue;
  						}
  					}
  				}
  			}
  			if ((nextSlash = input.indexOf("/", 1)) === -1) {
  				output.push(input);
  				break;
  			} else {
  				output.push(input.slice(0, nextSlash));
  				input = input.slice(nextSlash);
  			}
  		}
  		return output.join("");
  	}
  	/**
  	* Re-escape RFC 3986 gen-delims that must not appear literally in the host.
  	* After the URI regex parses, these characters cannot be literal in the host
  	* field, so any that appear after decoding came from percent-encoding and
  	* must be restored to prevent authority structure changes.
  	*
  	* @param {string} host
  	* @param {boolean} isIP - true for IPv4/IPv6 hosts (skip colon re-escaping)
  	* @returns {string}
  	*/
  	var HOST_DELIMS = {
  		"@": "%40",
  		"/": "%2F",
  		"?": "%3F",
  		"#": "%23",
  		":": "%3A"
  	};
  	var HOST_DELIM_RE = /[@/?#:]/g;
  	var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
  	function reescapeHostDelimiters(host, isIP) {
  		const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
  		re.lastIndex = 0;
  		return host.replace(re, (ch) => HOST_DELIMS[ch]);
  	}
  	/**
  	* Normalizes percent escapes and optionally decodes only unreserved ASCII bytes.
  	* Reserved delimiters such as `%2F` stay escaped; `%2E` is unreserved.
  	*
  	* @param {string} input
  	* @param {boolean} [decodeUnreserved=false]
  	* @returns {string}
  	*/
  	function normalizePercentEncoding(input, decodeUnreserved = false) {
  		if (input.indexOf("%") === -1) return input;
  		let output = "";
  		for (let i = 0; i < input.length; i++) {
  			if (input[i] === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					const normalizedHex = hex.toUpperCase();
  					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
  					if (decodeUnreserved && isUnreserved(decoded)) output += decoded;
  					else output += "%" + normalizedHex;
  					i += 2;
  					continue;
  				}
  			}
  			output += input[i];
  		}
  		return output;
  	}
  	/**
  	* Normalizes path data without turning reserved escapes into live path syntax.
  	* Valid escapes are uppercased, raw unsafe characters are escaped, and only
  	* unreserved bytes that are not `.` are decoded.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function normalizePathEncoding(input) {
  		let output = "";
  		for (let i = 0; i < input.length; i++) {
  			const ch = input[i];
  			if (ch === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					const normalizedHex = hex.toUpperCase();
  					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
  					if (decoded !== "." && isUnreserved(decoded)) output += decoded;
  					else output += "%" + normalizedHex;
  					i += 2;
  					continue;
  				}
  			}
  			if (isPathCharacter(ch)) output += ch;
  			else {
  				const code = input.charCodeAt(i);
  				if (code < 128) output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
  				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
  				else if (code <= 56319 && i + 1 < input.length) {
  					const low = input.charCodeAt(i + 1);
  					if (low >= 56320 && low <= 57343) {
  						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
  						i++;
  					} else output += percentEncodeNonAscii(65533);
  				} else output += percentEncodeNonAscii(65533);
  			}
  		}
  		return output;
  	}
  	/**
  	* Serializes a path without rewriting reserved data. Raw RFC 3986 path
  	* characters remain literal, valid escapes are preserved and uppercased, and
  	* everything else is UTF-8 percent-encoded. In a path-noscheme, a colon in the
  	* first segment must be escaped so the result cannot be parsed as a scheme.
  	*
  	* @param {string} input
  	* @param {boolean} [pathNoScheme=false]
  	* @returns {string}
  	*/
  	function serializePathEncoding(input, pathNoScheme = false) {
  		let output = "";
  		let firstSegment = pathNoScheme && input[0] !== "/";
  		for (let i = 0; i < input.length; i++) {
  			const ch = input[i];
  			if (ch === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					output += "%" + hex.toUpperCase();
  					i += 2;
  					continue;
  				}
  			}
  			if (ch === "/") firstSegment = false;
  			if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) output += ch;
  			else {
  				const code = input.charCodeAt(i);
  				if (code < 128) output += BYTE_HEX[code];
  				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
  				else if (code <= 56319 && i + 1 < input.length) {
  					const low = input.charCodeAt(i + 1);
  					if (low >= 56320 && low <= 57343) {
  						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
  						i++;
  					} else output += percentEncodeNonAscii(65533);
  				} else output += percentEncodeNonAscii(65533);
  			}
  		}
  		return output;
  	}
  	/**
  	* Percent-encodes a URI component using its RFC 3986 literal character set.
  	* Existing valid escapes are preserved and normalized to uppercase hex.
  	*
  	* @param {string} input
  	* @param {(value: string) => boolean} isAllowed
  	* @returns {string}
  	*/
  	function encodeComponent(input, isAllowed) {
  		let output = "";
  		for (let i = 0; i < input.length; i++) {
  			const ch = input[i];
  			if (ch === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					output += "%" + hex.toUpperCase();
  					i += 2;
  					continue;
  				}
  			}
  			if (isAllowed(ch)) output += ch;
  			else {
  				const code = input.charCodeAt(i);
  				if (code < 128) output += BYTE_HEX[code];
  				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
  				else if (code <= 56319 && i + 1 < input.length) {
  					const low = input.charCodeAt(i + 1);
  					if (low >= 56320 && low <= 57343) {
  						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
  						i++;
  					} else output += percentEncodeNonAscii(65533);
  				} else output += percentEncodeNonAscii(65533);
  			}
  		}
  		return output;
  	}
  	/**
  	* Encodes userinfo while preserving its RFC 3986 §3.2.1 literal characters.
  	* In particular, authority delimiters such as `@`, `/`, `?`, and `#` are data.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function encodeUserinfo(input) {
  		return encodeComponent(input, isUserinfoCharacter);
  	}
  	/**
  	* Encodes query data using the RFC 3986 §3.4 grammar. A literal `#` must be
  	* escaped because it would otherwise begin the fragment component.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function encodeQuery(input) {
  		return encodeComponent(input, isQueryFragmentCharacter);
  	}
  	/**
  	* Encodes fragment data using the RFC 3986 §3.5 grammar.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function encodeFragment(input) {
  		return encodeComponent(input, isQueryFragmentCharacter);
  	}
  	function isEscapeSafe(cp) {
  		return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
  	}
  	/**
  	* Normalizes the percent-encoding of a query or fragment component.
  	*
  	* Like `normalizePathEncoding`, but uses the query/fragment character set
  	* (which additionally allows `?`) and decodes `.` since it has no dot-segment
  	* meaning outside of a path.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function normalizeQueryFragmentEncoding(input) {
  		let output = "";
  		for (let i = 0; i < input.length; i++) {
  			const ch = input[i];
  			if (ch === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					const normalizedHex = hex.toUpperCase();
  					const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
  					if (isUnreserved(decoded)) output += decoded;
  					else output += "%" + normalizedHex;
  					i += 2;
  					continue;
  				}
  			}
  			if (isQueryFragmentCharacter(ch)) output += ch;
  			else {
  				const code = input.charCodeAt(i);
  				if (code < 128) output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
  				else if (code < 55296 || code > 57343) output += percentEncodeNonAscii(code);
  				else if (code <= 56319 && i + 1 < input.length) {
  					const low = input.charCodeAt(i + 1);
  					if (low >= 56320 && low <= 57343) {
  						output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
  						i++;
  					} else output += percentEncodeNonAscii(65533);
  				} else output += percentEncodeNonAscii(65533);
  			}
  		}
  		return output;
  	}
  	/**
  	* Escapes a component while preserving existing valid percent escapes.
  	*
  	* @param {string} input
  	* @returns {string}
  	*/
  	function escapePreservingEscapes(input) {
  		let output = "";
  		for (let i = 0; i < input.length; i++) {
  			if (input[i] === "%" && i + 2 < input.length) {
  				const hex = input.slice(i + 1, i + 3);
  				if (isHexPair(hex)) {
  					output += "%" + hex.toUpperCase();
  					i += 2;
  					continue;
  				}
  			}
  			output += escape(input[i]);
  		}
  		return output;
  	}
  	/**
  	* @param {import('../types/index').URIComponent} component
  	* @returns {string|undefined}
  	*/
  	function recomposeAuthority(component) {
  		const uriTokens = [];
  		if (component.userinfo !== void 0) {
  			uriTokens.push(encodeUserinfo(component.userinfo));
  			uriTokens.push("@");
  		}
  		if (component.host !== void 0) {
  			let host = component.host;
  			if (!isIPv4(host)) {
  				let ipV6res = normalizeIPv6(host);
  				if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
  					host = normalizePercentEncoding(host, true);
  					ipV6res = normalizeIPv6(host);
  				}
  				if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) host = `[${ipV6res.escapedHost}]`;
  				else host = reescapeHostDelimiters(host, false);
  			}
  			uriTokens.push(host);
  		}
  		if (typeof component.port === "number" || typeof component.port === "string") {
  			const port = String(component.port);
  			if (!isPort(port)) throw new TypeError("URI port is malformed.");
  			uriTokens.push(":");
  			uriTokens.push(port);
  		}
  		return uriTokens.length ? uriTokens.join("") : void 0;
  	}
  	module.exports = {
  		nonSimpleDomain,
  		recomposeAuthority,
  		reescapeHostDelimiters,
  		normalizePercentEncoding,
  		normalizePathEncoding,
  		serializePathEncoding,
  		normalizeQueryFragmentEncoding,
  		encodeUserinfo,
  		encodeQuery,
  		encodeFragment,
  		escapePreservingEscapes,
  		removeDotSegments,
  		isIPv4,
  		isUUID,
  		normalizeIPv6,
  		stringArrayToHexStripped
  	};
  }));
  var require_schemes = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	var { isUUID } = require_utils();
  	var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
  	var supportedSchemeNames = [
  		"http",
  		"https",
  		"ws",
  		"wss",
  		"urn",
  		"urn:uuid"
  	];
  	/** @typedef {supportedSchemeNames[number]} SchemeName */
  	/**
  	* @param {string} name
  	* @returns {name is SchemeName}
  	*/
  	function isValidSchemeName(name) {
  		return supportedSchemeNames.indexOf(name) !== -1;
  	}
  	/**
  	* @callback SchemeFn
  	* @param {import('../types/index').URIComponent} component
  	* @param {import('../types/index').Options} options
  	* @returns {import('../types/index').URIComponent}
  	*/
  	/**
  	* @typedef {Object} SchemeHandler
  	* @property {SchemeName} scheme - The scheme name.
  	* @property {boolean} [domainHost] - Indicates if the scheme supports domain hosts.
  	* @property {SchemeFn} parse - Function to parse the URI component for this scheme.
  	* @property {SchemeFn} serialize - Function to serialize the URI component for this scheme.
  	* @property {boolean} [skipNormalize] - Indicates if normalization should be skipped for this scheme.
  	* @property {boolean} [absolutePath] - Indicates if the scheme uses absolute paths.
  	* @property {boolean} [unicodeSupport] - Indicates if the scheme supports Unicode.
  	*/
  	/**
  	* @param {import('../types/index').URIComponent} wsComponent
  	* @returns {boolean}
  	*/
  	function wsIsSecure(wsComponent) {
  		if (wsComponent.secure === true) return true;
  		else if (wsComponent.secure === false) return false;
  		else if (wsComponent.scheme) return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
  		else return false;
  	}
  	/** @type {SchemeFn} */
  	function httpParse(component) {
  		if (!component.host) component.error = component.error || "HTTP URIs must have a host.";
  		return component;
  	}
  	/** @type {SchemeFn} */
  	function httpSerialize(component) {
  		const secure = String(component.scheme).toLowerCase() === "https";
  		if (component.port === (secure ? 443 : 80) || component.port === "") component.port = void 0;
  		if (!component.path) component.path = "/";
  		return component;
  	}
  	/** @type {SchemeFn} */
  	function wsParse(wsComponent) {
  		wsComponent.secure = wsIsSecure(wsComponent);
  		wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
  		wsComponent.path = void 0;
  		wsComponent.query = void 0;
  		return wsComponent;
  	}
  	/** @type {SchemeFn} */
  	function wsSerialize(wsComponent) {
  		if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") wsComponent.port = void 0;
  		if (typeof wsComponent.secure === "boolean") {
  			wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
  			wsComponent.secure = void 0;
  		}
  		if (wsComponent.resourceName) {
  			const queryIndex = wsComponent.resourceName.indexOf("?");
  			const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
  			wsComponent.path = path && path !== "/" ? path : void 0;
  			wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
  			wsComponent.resourceName = void 0;
  		}
  		wsComponent.fragment = void 0;
  		return wsComponent;
  	}
  	/** @type {SchemeFn} */
  	function urnParse(urnComponent, options) {
  		if (!urnComponent.path) {
  			urnComponent.error = "URN can not be parsed";
  			return urnComponent;
  		}
  		const matches = urnComponent.path.match(URN_REG);
  		if (matches && matches[0] === urnComponent.path) {
  			const scheme = options.scheme || urnComponent.scheme || "urn";
  			urnComponent.nid = matches[1].toLowerCase();
  			urnComponent.nss = matches[2];
  			const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || urnComponent.nid}`);
  			urnComponent.path = void 0;
  			if (schemeHandler) urnComponent = schemeHandler.parse(urnComponent, options);
  		} else urnComponent.error = urnComponent.error || "URN can not be parsed.";
  		return urnComponent;
  	}
  	/** @type {SchemeFn} */
  	function urnSerialize(urnComponent, options) {
  		if (urnComponent.nid === void 0) throw new Error("URN without nid cannot be serialized");
  		const scheme = options.scheme || urnComponent.scheme || "urn";
  		const nid = urnComponent.nid.toLowerCase();
  		const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || nid}`);
  		if (schemeHandler) urnComponent = schemeHandler.serialize(urnComponent, options);
  		const uriComponent = urnComponent;
  		const nss = urnComponent.nss;
  		uriComponent.path = `${nid || options.nid}:${nss}`;
  		options.skipEscape = true;
  		return uriComponent;
  	}
  	/** @type {SchemeFn} */
  	function urnuuidParse(urnComponent, options) {
  		const uuidComponent = urnComponent;
  		uuidComponent.uuid = uuidComponent.nss;
  		uuidComponent.nss = void 0;
  		if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) uuidComponent.error = uuidComponent.error || "UUID is not valid.";
  		return uuidComponent;
  	}
  	/** @type {SchemeFn} */
  	function urnuuidSerialize(uuidComponent) {
  		const urnComponent = uuidComponent;
  		urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
  		return urnComponent;
  	}
  	var http = {
  		scheme: "http",
  		domainHost: true,
  		parse: httpParse,
  		serialize: httpSerialize
  	};
  	var https = {
  		scheme: "https",
  		domainHost: http.domainHost,
  		parse: httpParse,
  		serialize: httpSerialize
  	};
  	var ws = {
  		scheme: "ws",
  		domainHost: true,
  		parse: wsParse,
  		serialize: wsSerialize
  	};
  	var SCHEMES = {
  		http,
  		https,
  		ws,
  		wss: {
  			scheme: "wss",
  			domainHost: ws.domainHost,
  			parse: ws.parse,
  			serialize: ws.serialize
  		},
  		urn: {
  			scheme: "urn",
  			parse: urnParse,
  			serialize: urnSerialize,
  			skipNormalize: true
  		},
  		"urn:uuid": {
  			scheme: "urn:uuid",
  			parse: urnuuidParse,
  			serialize: urnuuidSerialize,
  			skipNormalize: true
  		}
  	};
  	Object.setPrototypeOf(SCHEMES, null);
  	/**
  	* @param {string|undefined} scheme
  	* @returns {SchemeHandler|undefined}
  	*/
  	function getSchemeHandler(scheme) {
  		return scheme && (SCHEMES[scheme] || SCHEMES[scheme.toLowerCase()]) || void 0;
  	}
  	module.exports = {
  		wsIsSecure,
  		SCHEMES,
  		isValidSchemeName,
  		getSchemeHandler
  	};
  }));
  var require_fast_uri = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
  	var { SCHEMES, getSchemeHandler } = require_schemes();
  	var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
  	var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
  	/**
  	* @param {string} scheme
  	* @returns {string}
  	*/
  	function decodeValidScheme(scheme) {
  		const decodedScheme = unescape(String(scheme));
  		if (!VALID_SCHEME.test(decodedScheme)) throw new TypeError(MALFORMED_SCHEME_ERROR);
  		return decodedScheme;
  	}
  	/**
  	* @template {import('./types/index').URIComponent|string} T
  	* @param {T} uri
  	* @param {import('./types/index').Options} [options]
  	* @returns {T}
  	*/
  	function normalize(uri, options) {
  		if (typeof uri === "string") uri = normalizeString(uri, options);
  		else if (typeof uri === "object") uri = parse(serialize(uri, options), options);
  		return uri;
  	}
  	/**
  	* @param {string} baseURI
  	* @param {string} relativeURI
  	* @param {import('./types/index').Options} [options]
  	* @returns {string}
  	*/
  	function resolve(baseURI, relativeURI, options) {
  		const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
  		const { parsed: baseParsed, malformedAuthorityOrPort: baseMalformed, malformedPercentEncoding: baseMalformedPercentEncoding, malformedSchemeSpecific: baseMalformedSchemeSpecific, malformedHost: baseMalformedHost, malformedScheme: baseMalformedScheme } = parseWithStatus(baseURI, schemelessOptions);
  		const { parsed: relativeParsed, malformedAuthorityOrPort: relativeMalformed, malformedPercentEncoding: relativeMalformedPercentEncoding, malformedSchemeSpecific: relativeMalformedSchemeSpecific, malformedHost: relativeMalformedHost, malformedScheme: relativeMalformedScheme } = parseWithStatus(relativeURI, schemelessOptions);
  		if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
  		const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
  		const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
  		const resolvedHost = resolved.host;
  		const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
  		canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
  		const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !/\P{ASCII}/u.test(resolvedHost);
  		if (resolved.error && !encodedASCIIHost) throw new Error(resolved.error);
  		schemelessOptions.skipEscape = true;
  		return serialize(resolved, schemelessOptions);
  	}
  	/**
  	* @param {import ('./types/index').URIComponent} base
  	* @param {import ('./types/index').URIComponent} relative
  	* @param {import('./types/index').Options} [options]
  	* @param {boolean} [skipNormalization=false]
  	* @returns {import ('./types/index').URIComponent}
  	*/
  	function resolveComponent(base, relative, options, skipNormalization) {
  		/** @type {import('./types/index').URIComponent} */
  		const target = {};
  		if (!skipNormalization) {
  			base = parse(serialize(base, options), options);
  			relative = parse(serialize(relative, options), options);
  		}
  		options = options || {};
  		if (!options.tolerant && relative.scheme) {
  			target.scheme = relative.scheme;
  			target.userinfo = relative.userinfo;
  			target.host = relative.host;
  			target.port = relative.port;
  			target.path = removeDotSegments(relative.path || "");
  			target.query = relative.query;
  		} else {
  			if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
  				target.userinfo = relative.userinfo;
  				target.host = relative.host;
  				target.port = relative.port;
  				target.path = removeDotSegments(relative.path || "");
  				target.query = relative.query;
  			} else {
  				if (!relative.path) {
  					target.path = base.path;
  					if (relative.query !== void 0) target.query = relative.query;
  					else target.query = base.query;
  				} else {
  					if (relative.path[0] === "/") target.path = removeDotSegments(relative.path);
  					else {
  						if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) target.path = "/" + relative.path;
  						else if (!base.path) target.path = relative.path;
  						else target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
  						target.path = removeDotSegments(target.path);
  					}
  					target.query = relative.query;
  				}
  				target.userinfo = base.userinfo;
  				target.host = base.host;
  				target.port = base.port;
  			}
  			target.scheme = base.scheme;
  		}
  		target.fragment = relative.fragment;
  		return target;
  	}
  	/**
  	* @param {import ('./types/index').URIComponent|string} uriA
  	* @param {import ('./types/index').URIComponent|string} uriB
  	* @param {import ('./types/index').Options} options
  	* @returns {boolean}
  	*/
  	function equal(uriA, uriB, options) {
  		const normalizedA = normalizeComparableURI(uriA, options);
  		const normalizedB = normalizeComparableURI(uriB, options);
  		return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
  	}
  	/**
  	* @param {Readonly<import('./types/index').URIComponent>} cmpts
  	* @param {import('./types/index').Options} [opts]
  	* @returns {string}
  	*/
  	function serialize(cmpts, opts) {
  		const component = {
  			host: cmpts.host,
  			scheme: cmpts.scheme,
  			userinfo: cmpts.userinfo,
  			port: cmpts.port,
  			path: cmpts.path,
  			query: cmpts.query,
  			nid: cmpts.nid,
  			nss: cmpts.nss,
  			uuid: cmpts.uuid,
  			fragment: cmpts.fragment,
  			reference: cmpts.reference,
  			resourceName: cmpts.resourceName,
  			secure: cmpts.secure,
  			error: ""
  		};
  		const options = Object.assign({}, opts);
  		const uriTokens = [];
  		if (component.scheme) component.scheme = decodeValidScheme(component.scheme);
  		const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
  		if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
  		const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
  		const pathNoScheme = !options.skipEscape && component.scheme === void 0 && !hasAuthority;
  		if (component.path !== void 0) {
  			if (!options.skipEscape) component.path = serializePathEncoding(component.path, pathNoScheme);
  			else component.path = normalizePercentEncoding(component.path);
  		}
  		if (options.reference !== "suffix" && component.scheme) {
  			component.scheme = decodeValidScheme(component.scheme);
  			uriTokens.push(component.scheme, ":");
  		}
  		const authority = recomposeAuthority(component);
  		if (authority !== void 0) {
  			if (options.reference !== "suffix") uriTokens.push("//");
  			uriTokens.push(authority);
  			if (component.path && component.path[0] !== "/") uriTokens.push("/");
  		}
  		if (component.path !== void 0) {
  			let s = component.path;
  			if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) s = removeDotSegments(s);
  			if (pathNoScheme) s = serializePathEncoding(s, true);
  			if (authority === void 0 && s[0] === "/" && s[1] === "/") s = "/%2F" + s.slice(2);
  			uriTokens.push(s);
  		}
  		if (component.query !== void 0) uriTokens.push("?", encodeQuery(component.query));
  		if (component.fragment !== void 0) uriTokens.push("#", encodeFragment(component.fragment));
  		return uriTokens.join("");
  	}
  	var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  	var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
  	var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
  	/**
  	* @param {import('./types/index').URIComponent} parsed
  	* @param {RegExpMatchArray} matches
  	* @returns {string|undefined}
  	*/
  	function getParseError(parsed, matches) {
  		if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") return "URI path must start with \"/\" when authority is present.";
  		if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) return "URI port is malformed.";
  	}
  	/**
  	* Checks percent syntax without decoding the represented octets. RFC 3986
  	* percent-encoding is byte-oriented, so sequences such as `%FF` are valid even
  	* though they are not independently valid UTF-8.
  	*
  	* @param {string|undefined} component
  	* @returns {boolean}
  	*/
  	function hasMalformedPercentEncoding(component) {
  		if (component === void 0) return false;
  		let percent = component.indexOf("%");
  		while (percent !== -1) {
  			if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) return true;
  			percent = component.indexOf("%", percent + 3);
  		}
  		return false;
  	}
  	/**
  	* Whether the host is a bracketed IP literal (RFC 3986 `IP-literal`).
  	* An unterminated `[` is not a literal, so it must still be validated as a
  	* reg-name instead of being waved through as an IP.
  	*
  	* @param {string} host
  	* @returns {boolean}
  	*/
  	function isIPLiteral(host) {
  		return host[0] === "[" && host[host.length - 1] === "]";
  	}
  	/**
  	* @param {RegExpMatchArray} matches
  	* @returns {boolean}
  	*/
  	function hasMalformedComponentPercentEncoding(matches) {
  		const host = matches[4];
  		return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
  	}
  	/**
  	* @param {import('./types/index').URIComponent} parsed
  	* @param {import('./types/index').Options} options
  	* @param {{ domainHost?: boolean, unicodeSupport?: boolean }|undefined} schemeHandler
  	* @param {boolean} isIP
  	* @returns {boolean} whether host conversion failed
  	*/
  	function canonicalizeHost(parsed, options, schemeHandler, isIP) {
  		if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) try {
  			parsed.host = new URL("http://" + parsed.host).hostname;
  		} catch (e) {
  			parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
  			return true;
  		}
  		return false;
  	}
  	/**
  	* @param {string} uri
  	* @param {import('./types/index').Options} [opts]
  	* @returns {{ parsed: import('./types/index').URIComponent, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
  	*/
  	function parseWithStatus(uri, opts) {
  		const options = Object.assign({}, opts);
  		/** @type {import('./types/index').URIComponent} */
  		const parsed = {
  			scheme: void 0,
  			userinfo: void 0,
  			host: "",
  			port: void 0,
  			path: "",
  			query: void 0,
  			fragment: void 0
  		};
  		let malformedAuthorityOrPort = false;
  		let malformedPercentEncoding = false;
  		let malformedSchemeSpecific = false;
  		let malformedHost = false;
  		let malformedIPLiteral = false;
  		let malformedScheme = false;
  		let isIP = false;
  		if (options.reference === "suffix") {
  			if (options.scheme) uri = options.scheme + ":" + uri;
  			else uri = "//" + uri;
  		}
  		const authorityMatch = uri.match(AUTHORITY_PREFIX);
  		if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
  			parsed.error = "URI authority must not contain a literal backslash.";
  			malformedAuthorityOrPort = true;
  		}
  		const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
  		if (introducerMatch !== null) {
  			const region = introducerMatch[1];
  			const normalizedRegion = region.replace(/[\t\n\r]/g, "");
  			if (normalizedRegion.length >= 2) {
  				if (normalizedRegion.slice(0, 2) !== "//") {
  					parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
  					malformedAuthorityOrPort = true;
  				} else if (region.length !== normalizedRegion.length) {
  					parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
  					malformedAuthorityOrPort = true;
  				}
  			}
  		}
  		const matches = uri.match(URI_PARSE);
  		if (matches) {
  			parsed.scheme = matches[1];
  			parsed.userinfo = matches[3];
  			parsed.host = matches[4];
  			parsed.port = parseInt(matches[5], 10);
  			parsed.path = matches[6] || "";
  			parsed.query = matches[7];
  			parsed.fragment = matches[8];
  			if (parsed.scheme !== void 0) {
  				const decodedScheme = unescape(parsed.scheme);
  				if (VALID_SCHEME.test(decodedScheme)) parsed.scheme = decodedScheme.toLowerCase();
  				else {
  					parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
  					malformedScheme = true;
  				}
  			}
  			malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
  			if (malformedPercentEncoding) parsed.error = parsed.error || "URI contains malformed percent-encoding.";
  			if (isNaN(parsed.port)) parsed.port = matches[5];
  			const parseError = getParseError(parsed, matches);
  			if (parseError !== void 0) {
  				parsed.error = parsed.error || parseError;
  				malformedAuthorityOrPort = true;
  			}
  			if (parsed.host) {
  				if (isIPv4(parsed.host) === false) {
  					const bracketedIPLiteral = isIPLiteral(parsed.host);
  					const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
  					const ipv6result = normalizeIPv6(parsed.host);
  					isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
  					malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
  					parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
  					if (malformedIPLiteral) {
  						parsed.error = parsed.error || "URI host is malformed.";
  						malformedAuthorityOrPort = true;
  					}
  				} else isIP = true;
  			}
  			if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) parsed.reference = "same-document";
  			else if (parsed.scheme === void 0) parsed.reference = "relative";
  			else if (parsed.fragment === void 0) parsed.reference = "absolute";
  			else parsed.reference = "uri";
  			if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
  			const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
  			if (!malformedIPLiteral) malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
  			if (uri.indexOf("%") !== -1 && parsed.host !== void 0 && !malformedIPLiteral) {
  				let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
  				if (!isIP) host = normalizePercentEncoding(host.toLowerCase());
  				parsed.host = reescapeHostDelimiters(host, isIP);
  			}
  			if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
  				if (parsed.path) parsed.path = normalizePathEncoding(parsed.path);
  				if (parsed.query) parsed.query = normalizeQueryFragmentEncoding(parsed.query);
  				if (parsed.fragment) parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
  			}
  			if (schemeHandler && schemeHandler.parse) {
  				schemeHandler.parse(parsed, options);
  				if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) malformedSchemeSpecific = true;
  			}
  		} else parsed.error = parsed.error || "URI can not be parsed.";
  		return {
  			parsed,
  			malformedAuthorityOrPort,
  			malformedPercentEncoding,
  			malformedSchemeSpecific,
  			malformedHost,
  			malformedScheme
  		};
  	}
  	/**
  	* @param {string} uri
  	* @param {import('./types/index').Options} [opts]
  	* @returns
  	*/
  	function parse(uri, opts) {
  		return parseWithStatus(uri, opts).parsed;
  	}
  	/**
  	* @param {string} uri
  	* @param {import('./types/index').Options} [opts]
  	* @returns {string}
  	*/
  	function normalizeString(uri, opts) {
  		return normalizeStringWithStatus(uri, opts).normalized;
  	}
  	/**
  	* @param {string} uri
  	* @param {import('./types/index').Options} [opts]
  	* @returns {{ normalized: string, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
  	*/
  	function normalizeStringWithStatus(uri, opts) {
  		const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
  		return {
  			normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
  			malformedAuthorityOrPort,
  			malformedPercentEncoding,
  			malformedSchemeSpecific,
  			malformedHost,
  			malformedScheme
  		};
  	}
  	/**
  	* @param {import ('./types/index').URIComponent|string} uri
  	* @param {import('./types/index').Options} [opts]
  	* @returns {string|undefined}
  	*/
  	function normalizeComparableURI(uri, opts) {
  		if (typeof uri !== "string" && typeof uri !== "object") return;
  		let value;
  		try {
  			value = typeof uri === "string" ? uri : serialize(uri, opts);
  		} catch {
  			return;
  		}
  		const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
  		return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
  	}
  	var fastUri = {
  		SCHEMES,
  		normalize,
  		resolve,
  		resolveComponent,
  		equal,
  		serialize,
  		parse
  	};
  	module.exports = fastUri;
  	module.exports.default = fastUri;
  	module.exports.fastUri = fastUri;
  }));
  var require_uri = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var uri = require_fast_uri();
  	uri.code = "require(\"ajv/dist/runtime/uri\").default";
  	exports.default = uri;
  }));
  var require_core$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
  	var validate_1 = require_validate();
  	Object.defineProperty(exports, "KeywordCxt", {
  		enumerable: true,
  		get: function() {
  			return validate_1.KeywordCxt;
  		}
  	});
  	var codegen_1 = require_codegen();
  	Object.defineProperty(exports, "_", {
  		enumerable: true,
  		get: function() {
  			return codegen_1._;
  		}
  	});
  	Object.defineProperty(exports, "str", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.str;
  		}
  	});
  	Object.defineProperty(exports, "stringify", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.stringify;
  		}
  	});
  	Object.defineProperty(exports, "nil", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.nil;
  		}
  	});
  	Object.defineProperty(exports, "Name", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.Name;
  		}
  	});
  	Object.defineProperty(exports, "CodeGen", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.CodeGen;
  		}
  	});
  	var validation_error_1 = require_validation_error();
  	var ref_error_1 = require_ref_error();
  	var rules_1 = require_rules();
  	var compile_1 = require_compile();
  	var codegen_2 = require_codegen();
  	var resolve_1 = require_resolve();
  	var dataType_1 = require_dataType();
  	var util_1 = require_util();
  	var $dataRefSchema = (init_data(), __toCommonJS(data_exports).default);
  	var uri_1 = require_uri();
  	var defaultRegExp = (str, flags) => new RegExp(str, flags);
  	defaultRegExp.code = "new RegExp";
  	var META_IGNORE_OPTIONS = [
  		"removeAdditional",
  		"useDefaults",
  		"coerceTypes"
  	];
  	var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
  		"validate",
  		"serialize",
  		"parse",
  		"wrapper",
  		"root",
  		"schema",
  		"keyword",
  		"pattern",
  		"formats",
  		"validate$data",
  		"func",
  		"obj",
  		"Error"
  	]);
  	var removedOptions = {
  		errorDataPath: "",
  		format: "`validateFormats: false` can be used instead.",
  		nullable: "\"nullable\" keyword is supported by default.",
  		jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
  		extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
  		missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
  		processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
  		sourceCode: "Use option `code: {source: true}`",
  		strictDefaults: "It is default now, see option `strict`.",
  		strictKeywords: "It is default now, see option `strict`.",
  		uniqueItems: "\"uniqueItems\" keyword is always validated.",
  		unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
  		cache: "Map is used as cache, schema object as key.",
  		serialize: "Map is used as cache, schema object as key.",
  		ajvErrors: "It is default now."
  	};
  	var deprecatedOptions = {
  		ignoreKeywordsWithRef: "",
  		jsPropertySyntax: "",
  		unicode: "\"minLength\"/\"maxLength\" account for unicode characters by default."
  	};
  	var MAX_EXPRESSION = 200;
  	function requiredOptions(o) {
  		var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
  		const s = o.strict;
  		const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
  		const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
  		const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
  		const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
  		return {
  			strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
  			strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
  			strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
  			strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
  			strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
  			code: o.code ? {
  				...o.code,
  				optimize,
  				regExp
  			} : {
  				optimize,
  				regExp
  			},
  			loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
  			loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
  			meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
  			messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
  			inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
  			schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
  			addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
  			validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
  			validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
  			unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
  			int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
  			uriResolver
  		};
  	}
  	var Ajv = class {
  		constructor(opts = {}) {
  			this.schemas = {};
  			this.refs = {};
  			this.formats = Object.create(null);
  			this._compilations = /* @__PURE__ */ new Set();
  			this._loading = {};
  			this._cache = /* @__PURE__ */ new Map();
  			opts = this.opts = {
  				...opts,
  				...requiredOptions(opts)
  			};
  			const { es5, lines } = this.opts.code;
  			this.scope = new codegen_2.ValueScope({
  				scope: {},
  				prefixes: EXT_SCOPE_NAMES,
  				es5,
  				lines
  			});
  			this.logger = getLogger(opts.logger);
  			const formatOpt = opts.validateFormats;
  			opts.validateFormats = false;
  			this.RULES = (0, rules_1.getRules)();
  			checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
  			checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
  			this._metaOpts = getMetaSchemaOptions.call(this);
  			if (opts.formats) addInitialFormats.call(this);
  			this._addVocabularies();
  			this._addDefaultMetaSchema();
  			if (opts.keywords) addInitialKeywords.call(this, opts.keywords);
  			if (typeof opts.meta == "object") this.addMetaSchema(opts.meta);
  			addInitialSchemas.call(this);
  			opts.validateFormats = formatOpt;
  		}
  		_addVocabularies() {
  			this.addKeyword("$async");
  		}
  		_addDefaultMetaSchema() {
  			const { $data, meta, schemaId } = this.opts;
  			let _dataRefSchema = $dataRefSchema;
  			if (schemaId === "id") {
  				_dataRefSchema = { ...$dataRefSchema };
  				_dataRefSchema.id = _dataRefSchema.$id;
  				delete _dataRefSchema.$id;
  			}
  			if (meta && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
  		}
  		defaultMeta() {
  			const { meta, schemaId } = this.opts;
  			return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
  		}
  		validate(schemaKeyRef, data) {
  			let v;
  			if (typeof schemaKeyRef == "string") {
  				v = this.getSchema(schemaKeyRef);
  				if (!v) throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
  			} else v = this.compile(schemaKeyRef);
  			const valid = v(data);
  			if (!("$async" in v)) this.errors = v.errors;
  			return valid;
  		}
  		compile(schema, _meta) {
  			const sch = this._addSchema(schema, _meta);
  			return sch.validate || this._compileSchemaEnv(sch);
  		}
  		compileAsync(schema, meta) {
  			if (typeof this.opts.loadSchema != "function") throw new Error("options.loadSchema should be a function");
  			const { loadSchema } = this.opts;
  			return runCompileAsync.call(this, schema, meta);
  			async function runCompileAsync(_schema, _meta) {
  				await loadMetaSchema.call(this, _schema.$schema);
  				const sch = this._addSchema(_schema, _meta);
  				return sch.validate || _compileAsync.call(this, sch);
  			}
  			async function loadMetaSchema($ref) {
  				if ($ref && !this.getSchema($ref)) await runCompileAsync.call(this, { $ref }, true);
  			}
  			async function _compileAsync(sch) {
  				try {
  					return this._compileSchemaEnv(sch);
  				} catch (e) {
  					if (!(e instanceof ref_error_1.default)) throw e;
  					checkLoaded.call(this, e);
  					await loadMissingSchema.call(this, e.missingSchema);
  					return _compileAsync.call(this, sch);
  				}
  			}
  			function checkLoaded({ missingSchema: ref, missingRef }) {
  				if (this.refs[ref]) throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
  			}
  			async function loadMissingSchema(ref) {
  				const _schema = await _loadSchema.call(this, ref);
  				if (!this.refs[ref]) await loadMetaSchema.call(this, _schema.$schema);
  				if (!this.refs[ref]) this.addSchema(_schema, ref, meta);
  			}
  			async function _loadSchema(ref) {
  				const p = this._loading[ref];
  				if (p) return p;
  				try {
  					return await (this._loading[ref] = loadSchema(ref));
  				} finally {
  					delete this._loading[ref];
  				}
  			}
  		}
  		addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
  			if (Array.isArray(schema)) {
  				for (const sch of schema) this.addSchema(sch, void 0, _meta, _validateSchema);
  				return this;
  			}
  			let id;
  			if (typeof schema === "object") {
  				const { schemaId } = this.opts;
  				id = schema[schemaId];
  				if (id !== void 0 && typeof id != "string") throw new Error(`schema ${schemaId} must be string`);
  			}
  			key = (0, resolve_1.normalizeId)(key || id);
  			this._checkUnique(key);
  			this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
  			return this;
  		}
  		addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
  			this.addSchema(schema, key, true, _validateSchema);
  			return this;
  		}
  		validateSchema(schema, throwOrLogError) {
  			if (typeof schema == "boolean") return true;
  			let $schema;
  			$schema = schema.$schema;
  			if ($schema !== void 0 && typeof $schema != "string") throw new Error("$schema must be a string");
  			$schema = $schema || this.opts.defaultMeta || this.defaultMeta();
  			if (!$schema) {
  				this.logger.warn("meta-schema not available");
  				this.errors = null;
  				return true;
  			}
  			const valid = this.validate($schema, schema);
  			if (!valid && throwOrLogError) {
  				const message = "schema is invalid: " + this.errorsText();
  				if (this.opts.validateSchema === "log") this.logger.error(message);
  				else throw new Error(message);
  			}
  			return valid;
  		}
  		getSchema(keyRef) {
  			let sch;
  			while (typeof (sch = getSchEnv.call(this, keyRef)) == "string") keyRef = sch;
  			if (sch === void 0) {
  				const { schemaId } = this.opts;
  				const root = new compile_1.SchemaEnv({
  					schema: {},
  					schemaId
  				});
  				sch = compile_1.resolveSchema.call(this, root, keyRef);
  				if (!sch) return;
  				this.refs[keyRef] = sch;
  			}
  			return sch.validate || this._compileSchemaEnv(sch);
  		}
  		removeSchema(schemaKeyRef) {
  			if (schemaKeyRef instanceof RegExp) {
  				this._removeAllSchemas(this.schemas, schemaKeyRef);
  				this._removeAllSchemas(this.refs, schemaKeyRef);
  				return this;
  			}
  			switch (typeof schemaKeyRef) {
  				case "undefined":
  					this._removeAllSchemas(this.schemas);
  					this._removeAllSchemas(this.refs);
  					this._cache.clear();
  					return this;
  				case "string": {
  					const sch = getSchEnv.call(this, schemaKeyRef);
  					if (typeof sch == "object") this._cache.delete(sch.schema);
  					delete this.schemas[schemaKeyRef];
  					delete this.refs[schemaKeyRef];
  					return this;
  				}
  				case "object": {
  					const cacheKey = schemaKeyRef;
  					this._cache.delete(cacheKey);
  					let id = schemaKeyRef[this.opts.schemaId];
  					if (id) {
  						id = (0, resolve_1.normalizeId)(id);
  						delete this.schemas[id];
  						delete this.refs[id];
  					}
  					return this;
  				}
  				default: throw new Error("ajv.removeSchema: invalid parameter");
  			}
  		}
  		addVocabulary(definitions) {
  			for (const def of definitions) this.addKeyword(def);
  			return this;
  		}
  		addKeyword(kwdOrDef, def) {
  			let keyword;
  			if (typeof kwdOrDef == "string") {
  				keyword = kwdOrDef;
  				if (typeof def == "object") {
  					this.logger.warn("these parameters are deprecated, see docs for addKeyword");
  					def.keyword = keyword;
  				}
  			} else if (typeof kwdOrDef == "object" && def === void 0) {
  				def = kwdOrDef;
  				keyword = def.keyword;
  				if (Array.isArray(keyword) && !keyword.length) throw new Error("addKeywords: keyword must be string or non-empty array");
  			} else throw new Error("invalid addKeywords parameters");
  			checkKeyword.call(this, keyword, def);
  			if (!def) {
  				(0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
  				return this;
  			}
  			keywordMetaschema.call(this, def);
  			const definition = {
  				...def,
  				type: (0, dataType_1.getJSONTypes)(def.type),
  				schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
  			};
  			(0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
  			return this;
  		}
  		getKeyword(keyword) {
  			const rule = this.RULES.all[keyword];
  			return typeof rule == "object" ? rule.definition : !!rule;
  		}
  		removeKeyword(keyword) {
  			const { RULES } = this;
  			delete RULES.keywords[keyword];
  			delete RULES.all[keyword];
  			for (const group of RULES.rules) {
  				const i = group.rules.findIndex((rule) => rule.keyword === keyword);
  				if (i >= 0) group.rules.splice(i, 1);
  			}
  			return this;
  		}
  		addFormat(name, format) {
  			if (typeof format == "string") format = new RegExp(format);
  			this.formats[name] = format;
  			return this;
  		}
  		errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
  			if (!errors || errors.length === 0) return "No errors";
  			return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
  		}
  		$dataMetaSchema(metaSchema, keywordsJsonPointers) {
  			const rules = this.RULES.all;
  			metaSchema = JSON.parse(JSON.stringify(metaSchema));
  			for (const jsonPointer of keywordsJsonPointers) {
  				const segments = jsonPointer.split("/").slice(1);
  				let keywords = metaSchema;
  				for (const seg of segments) keywords = keywords[seg];
  				for (const key in rules) {
  					const rule = rules[key];
  					if (typeof rule != "object") continue;
  					const { $data } = rule.definition;
  					const schema = keywords[key];
  					if ($data && schema) keywords[key] = schemaOrData(schema);
  				}
  			}
  			return metaSchema;
  		}
  		_removeAllSchemas(schemas, regex) {
  			for (const keyRef in schemas) {
  				const sch = schemas[keyRef];
  				if (!regex || regex.test(keyRef)) {
  					if (typeof sch == "string") delete schemas[keyRef];
  					else if (sch && !sch.meta) {
  						this._cache.delete(sch.schema);
  						delete schemas[keyRef];
  					}
  				}
  			}
  		}
  		_addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
  			let id;
  			const { schemaId } = this.opts;
  			if (typeof schema == "object") id = schema[schemaId];
  			else if (this.opts.jtd) throw new Error("schema must be object");
  			else if (typeof schema != "boolean") throw new Error("schema must be object or boolean");
  			let sch = this._cache.get(schema);
  			if (sch !== void 0) return sch;
  			baseId = (0, resolve_1.normalizeId)(id || baseId);
  			const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
  			sch = new compile_1.SchemaEnv({
  				schema,
  				schemaId,
  				meta,
  				baseId,
  				localRefs
  			});
  			this._cache.set(sch.schema, sch);
  			if (addSchema && !baseId.startsWith("#")) {
  				if (baseId) this._checkUnique(baseId);
  				this.refs[baseId] = sch;
  			}
  			if (validateSchema) this.validateSchema(schema, true);
  			return sch;
  		}
  		_checkUnique(id) {
  			if (this.schemas[id] || this.refs[id]) throw new Error(`schema with key or id "${id}" already exists`);
  		}
  		_compileSchemaEnv(sch) {
  			if (sch.meta) this._compileMetaSchema(sch);
  			else compile_1.compileSchema.call(this, sch);
  			/* istanbul ignore if */
  			if (!sch.validate) throw new Error("ajv implementation error");
  			return sch.validate;
  		}
  		_compileMetaSchema(sch) {
  			const currentOpts = this.opts;
  			this.opts = this._metaOpts;
  			try {
  				compile_1.compileSchema.call(this, sch);
  			} finally {
  				this.opts = currentOpts;
  			}
  		}
  	};
  	Ajv.ValidationError = validation_error_1.default;
  	Ajv.MissingRefError = ref_error_1.default;
  	exports.default = Ajv;
  	function checkOptions(checkOpts, options, msg, log = "error") {
  		for (const key in checkOpts) {
  			const opt = key;
  			if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
  		}
  	}
  	function getSchEnv(keyRef) {
  		keyRef = (0, resolve_1.normalizeId)(keyRef);
  		return this.schemas[keyRef] || this.refs[keyRef];
  	}
  	function addInitialSchemas() {
  		const optsSchemas = this.opts.schemas;
  		if (!optsSchemas) return;
  		if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
  		else for (const key in optsSchemas) this.addSchema(optsSchemas[key], key);
  	}
  	function addInitialFormats() {
  		for (const name in this.opts.formats) {
  			const format = this.opts.formats[name];
  			if (format) this.addFormat(name, format);
  		}
  	}
  	function addInitialKeywords(defs) {
  		if (Array.isArray(defs)) {
  			this.addVocabulary(defs);
  			return;
  		}
  		this.logger.warn("keywords option as map is deprecated, pass array");
  		for (const keyword in defs) {
  			const def = defs[keyword];
  			if (!def.keyword) def.keyword = keyword;
  			this.addKeyword(def);
  		}
  	}
  	function getMetaSchemaOptions() {
  		const metaOpts = { ...this.opts };
  		for (const opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
  		return metaOpts;
  	}
  	var noLogs = {
  		log() {},
  		warn() {},
  		error() {}
  	};
  	function getLogger(logger) {
  		if (logger === false) return noLogs;
  		if (logger === void 0) return console;
  		if (logger.log && logger.warn && logger.error) return logger;
  		throw new Error("logger must implement log, warn and error methods");
  	}
  	var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  	function checkKeyword(keyword, def) {
  		const { RULES } = this;
  		(0, util_1.eachItem)(keyword, (kwd) => {
  			if (RULES.keywords[kwd]) throw new Error(`Keyword ${kwd} is already defined`);
  			if (!KEYWORD_NAME.test(kwd)) throw new Error(`Keyword ${kwd} has invalid name`);
  		});
  		if (!def) return;
  		if (def.$data && !("code" in def || "validate" in def)) throw new Error("$data keyword must have \"code\" or \"validate\" function");
  	}
  	function addRule(keyword, definition, dataType) {
  		var _a;
  		const post = definition === null || definition === void 0 ? void 0 : definition.post;
  		if (dataType && post) throw new Error("keyword with \"post\" flag cannot have \"type\"");
  		const { RULES } = this;
  		let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
  		if (!ruleGroup) {
  			ruleGroup = {
  				type: dataType,
  				rules: []
  			};
  			RULES.rules.push(ruleGroup);
  		}
  		RULES.keywords[keyword] = true;
  		if (!definition) return;
  		const rule = {
  			keyword,
  			definition: {
  				...definition,
  				type: (0, dataType_1.getJSONTypes)(definition.type),
  				schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
  			}
  		};
  		if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before);
  		else ruleGroup.rules.push(rule);
  		RULES.all[keyword] = rule;
  		(_a = definition.implements) === null || _a === void 0 || _a.forEach((kwd) => this.addKeyword(kwd));
  	}
  	function addBeforeRule(ruleGroup, rule, before) {
  		const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
  		if (i >= 0) ruleGroup.rules.splice(i, 0, rule);
  		else {
  			ruleGroup.rules.push(rule);
  			this.logger.warn(`rule ${before} is not defined`);
  		}
  	}
  	function keywordMetaschema(def) {
  		let { metaSchema } = def;
  		if (metaSchema === void 0) return;
  		if (def.$data && this.opts.$data) metaSchema = schemaOrData(metaSchema);
  		def.validateSchema = this.compile(metaSchema, true);
  	}
  	var $dataRef = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
  	function schemaOrData(schema) {
  		return { anyOf: [schema, $dataRef] };
  	}
  }));
  var require_id = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = {
  		keyword: "id",
  		code() {
  			throw new Error("NOT SUPPORTED: keyword \"id\", use \"$id\" for schema ID");
  		}
  	};
  }));
  var require_ref = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.callRef = exports.getValidate = void 0;
  	var ref_error_1 = require_ref_error();
  	var code_1 = require_code();
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var compile_1 = require_compile();
  	var util_1 = require_util();
  	var def = {
  		keyword: "$ref",
  		schemaType: "string",
  		code(cxt) {
  			const { gen, schema: $ref, it } = cxt;
  			const { baseId, schemaEnv: env, validateName, opts, self } = it;
  			const { root } = env;
  			if (($ref === "#" || $ref === "#/") && baseId === root.baseId) return callRootRef();
  			const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
  			if (schOrEnv === void 0) throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
  			if (schOrEnv instanceof compile_1.SchemaEnv) return callValidate(schOrEnv);
  			return inlineRefSchema(schOrEnv);
  			function callRootRef() {
  				if (env === root) return callRef(cxt, validateName, env, env.$async);
  				const rootName = gen.scopeValue("root", { ref: root });
  				return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
  			}
  			function callValidate(sch) {
  				callRef(cxt, getValidate(cxt, sch), sch, sch.$async);
  			}
  			function inlineRefSchema(sch) {
  				const schName = gen.scopeValue("schema", opts.code.source === true ? {
  					ref: sch,
  					code: (0, codegen_1.stringify)(sch)
  				} : { ref: sch });
  				const valid = gen.name("valid");
  				const schCxt = cxt.subschema({
  					schema: sch,
  					dataTypes: [],
  					schemaPath: codegen_1.nil,
  					topSchemaRef: schName,
  					errSchemaPath: $ref
  				}, valid);
  				cxt.mergeEvaluated(schCxt);
  				cxt.ok(valid);
  			}
  		}
  	};
  	function getValidate(cxt, sch) {
  		const { gen } = cxt;
  		return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
  	}
  	exports.getValidate = getValidate;
  	function callRef(cxt, v, sch, $async) {
  		const { gen, it } = cxt;
  		const { allErrors, schemaEnv: env, opts } = it;
  		const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
  		if ($async) callAsyncRef();
  		else callSyncRef();
  		function callAsyncRef() {
  			if (!env.$async) throw new Error("async schema referenced by sync schema");
  			const valid = gen.let("valid");
  			gen.try(() => {
  				gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
  				addEvaluatedFrom(v);
  				if (!allErrors) gen.assign(valid, true);
  			}, (e) => {
  				gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
  				addErrorsFrom(e);
  				if (!allErrors) gen.assign(valid, false);
  			});
  			cxt.ok(valid);
  		}
  		function callSyncRef() {
  			cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
  		}
  		function addErrorsFrom(source) {
  			const errs = (0, codegen_1._)`${source}.errors`;
  			gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
  			gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
  		}
  		function addEvaluatedFrom(source) {
  			var _a;
  			if (!it.opts.unevaluated) return;
  			const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
  			if (it.props !== true) {
  				if (schEvaluated && !schEvaluated.dynamicProps) {
  					if (schEvaluated.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
  				} else {
  					const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
  					it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
  				}
  			}
  			if (it.items !== true) {
  				if (schEvaluated && !schEvaluated.dynamicItems) {
  					if (schEvaluated.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
  				} else {
  					const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
  					it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
  				}
  			}
  		}
  	}
  	exports.callRef = callRef;
  	exports.default = def;
  }));
  var require_core = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var id_1 = require_id();
  	var ref_1 = require_ref();
  	exports.default = [
  		"$schema",
  		"$id",
  		"$defs",
  		"$vocabulary",
  		{ keyword: "$comment" },
  		"definitions",
  		id_1.default,
  		ref_1.default
  	];
  }));
  var require_limitNumber = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var ops = codegen_1.operators;
  	var KWDs = {
  		maximum: {
  			okStr: "<=",
  			ok: ops.LTE,
  			fail: ops.GT
  		},
  		minimum: {
  			okStr: ">=",
  			ok: ops.GTE,
  			fail: ops.LT
  		},
  		exclusiveMaximum: {
  			okStr: "<",
  			ok: ops.LT,
  			fail: ops.GTE
  		},
  		exclusiveMinimum: {
  			okStr: ">",
  			ok: ops.GT,
  			fail: ops.LTE
  		}
  	};
  	exports.default = {
  		keyword: Object.keys(KWDs),
  		type: "number",
  		schemaType: "number",
  		$data: true,
  		error: {
  			message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
  			params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { keyword, data, schemaCode } = cxt;
  			cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
  		}
  	};
  }));
  var require_multipleOf = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	exports.default = {
  		keyword: "multipleOf",
  		type: "number",
  		schemaType: "number",
  		$data: true,
  		error: {
  			message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
  			params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { gen, data, schemaCode, it } = cxt;
  			const prec = it.opts.multipleOfPrecision;
  			const res = gen.let("res");
  			const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
  			cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
  		}
  	};
  }));
  var require_ucs2length = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	function ucs2length(str) {
  		const len = str.length;
  		let length = 0;
  		let pos = 0;
  		let value;
  		while (pos < len) {
  			length++;
  			value = str.charCodeAt(pos++);
  			if (value >= 55296 && value <= 56319 && pos < len) {
  				value = str.charCodeAt(pos);
  				if ((value & 64512) === 56320) pos++;
  			}
  		}
  		return length;
  	}
  	exports.default = ucs2length;
  	ucs2length.code = "require(\"ajv/dist/runtime/ucs2length\").default";
  }));
  var require_limitLength = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var ucs2length_1 = require_ucs2length();
  	exports.default = {
  		keyword: ["maxLength", "minLength"],
  		type: "string",
  		schemaType: "number",
  		$data: true,
  		error: {
  			message({ keyword, schemaCode }) {
  				const comp = keyword === "maxLength" ? "more" : "fewer";
  				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
  			},
  			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { keyword, data, schemaCode, it } = cxt;
  			const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
  			const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
  			cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
  		}
  	};
  }));
  var require_pattern = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var code_1 = require_code();
  	var util_1 = require_util();
  	var codegen_1 = require_codegen();
  	exports.default = {
  		keyword: "pattern",
  		type: "string",
  		schemaType: "string",
  		$data: true,
  		error: {
  			message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
  			params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { gen, data, $data, schema, schemaCode, it } = cxt;
  			const u = it.opts.unicodeRegExp ? "u" : "";
  			if ($data) {
  				const { regExp } = it.opts.code;
  				const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
  				const valid = gen.let("valid");
  				gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
  				cxt.fail$data((0, codegen_1._)`!${valid}`);
  			} else {
  				const regExp = (0, code_1.usePattern)(cxt, schema);
  				cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
  			}
  		}
  	};
  }));
  var require_limitProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	exports.default = {
  		keyword: ["maxProperties", "minProperties"],
  		type: "object",
  		schemaType: "number",
  		$data: true,
  		error: {
  			message({ keyword, schemaCode }) {
  				const comp = keyword === "maxProperties" ? "more" : "fewer";
  				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
  			},
  			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { keyword, data, schemaCode } = cxt;
  			const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
  			cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
  		}
  	};
  }));
  var require_required = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var code_1 = require_code();
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "required",
  		type: "object",
  		schemaType: "array",
  		$data: true,
  		error: {
  			message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
  			params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
  		},
  		code(cxt) {
  			const { gen, schema, schemaCode, data, $data, it } = cxt;
  			const { opts } = it;
  			if (!$data && schema.length === 0) return;
  			const useLoop = schema.length >= opts.loopRequired;
  			if (it.allErrors) allErrorsMode();
  			else exitOnErrorMode();
  			if (opts.strictRequired) {
  				const props = cxt.parentSchema.properties;
  				const { definedProperties } = cxt.it;
  				for (const requiredKey of schema) if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
  					const msg = `required property "${requiredKey}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
  					(0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
  				}
  			}
  			function allErrorsMode() {
  				if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
  				else for (const prop of schema) (0, code_1.checkReportMissingProp)(cxt, prop);
  			}
  			function exitOnErrorMode() {
  				const missing = gen.let("missing");
  				if (useLoop || $data) {
  					const valid = gen.let("valid", true);
  					cxt.block$data(valid, () => loopUntilMissing(missing, valid));
  					cxt.ok(valid);
  				} else {
  					gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
  					(0, code_1.reportMissingProp)(cxt, missing);
  					gen.else();
  				}
  			}
  			function loopAllRequired() {
  				gen.forOf("prop", schemaCode, (prop) => {
  					cxt.setParams({ missingProperty: prop });
  					gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
  				});
  			}
  			function loopUntilMissing(missing, valid) {
  				cxt.setParams({ missingProperty: missing });
  				gen.forOf(missing, schemaCode, () => {
  					gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
  					gen.if((0, codegen_1.not)(valid), () => {
  						cxt.error();
  						gen.break();
  					});
  				}, codegen_1.nil);
  			}
  		}
  	};
  }));
  var require_limitItems = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	exports.default = {
  		keyword: ["maxItems", "minItems"],
  		type: "array",
  		schemaType: "number",
  		$data: true,
  		error: {
  			message({ keyword, schemaCode }) {
  				const comp = keyword === "maxItems" ? "more" : "fewer";
  				return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
  			},
  			params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { keyword, data, schemaCode } = cxt;
  			const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
  			cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
  		}
  	};
  }));
  var require_equal = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var equal = require_fast_deep_equal();
  	equal.code = "require(\"ajv/dist/runtime/equal\").default";
  	exports.default = equal;
  }));
  var require_uniqueItems = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dataType_1 = require_dataType();
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var equal_1 = require_equal();
  	exports.default = {
  		keyword: "uniqueItems",
  		type: "array",
  		schemaType: "boolean",
  		$data: true,
  		error: {
  			message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
  			params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
  		},
  		code(cxt) {
  			const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
  			if (!$data && !schema) return;
  			const valid = gen.let("valid");
  			const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
  			cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
  			cxt.ok(valid);
  			function validateUniqueItems() {
  				const i = gen.let("i", (0, codegen_1._)`${data}.length`);
  				const j = gen.let("j");
  				cxt.setParams({
  					i,
  					j
  				});
  				gen.assign(valid, true);
  				gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
  			}
  			function canOptimize() {
  				return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
  			}
  			function loopN(i, j) {
  				const item = gen.name("item");
  				const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
  				const indices = gen.const("indices", (0, codegen_1._)`{}`);
  				gen.for((0, codegen_1._)`;${i}--;`, () => {
  					gen.let(item, (0, codegen_1._)`${data}[${i}]`);
  					gen.if(wrongType, (0, codegen_1._)`continue`);
  					if (itemTypes.length > 1) gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
  					gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
  						gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
  						cxt.error();
  						gen.assign(valid, false).break();
  					}).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
  				});
  			}
  			function loopN2(i, j) {
  				const eql = (0, util_1.useFunc)(gen, equal_1.default);
  				const outer = gen.name("outer");
  				gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
  					cxt.error();
  					gen.assign(valid, false).break(outer);
  				})));
  			}
  		}
  	};
  }));
  var require_const = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var equal_1 = require_equal();
  	exports.default = {
  		keyword: "const",
  		$data: true,
  		error: {
  			message: "must be equal to constant",
  			params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { gen, data, $data, schemaCode, schema } = cxt;
  			if ($data || schema && typeof schema == "object") cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
  			else cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
  		}
  	};
  }));
  var require_enum = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var equal_1 = require_equal();
  	exports.default = {
  		keyword: "enum",
  		schemaType: "array",
  		$data: true,
  		error: {
  			message: "must be equal to one of the allowed values",
  			params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { gen, data, $data, schema, schemaCode, it } = cxt;
  			if (!$data && schema.length === 0) throw new Error("enum must have non-empty array");
  			const useLoop = schema.length >= it.opts.loopEnum;
  			let eql;
  			const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
  			let valid;
  			if (useLoop || $data) {
  				valid = gen.let("valid");
  				cxt.block$data(valid, loopEnum);
  			} else {
  				/* istanbul ignore if */
  				if (!Array.isArray(schema)) throw new Error("ajv implementation error");
  				const vSchema = gen.const("vSchema", schemaCode);
  				valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
  			}
  			cxt.pass(valid);
  			function loopEnum() {
  				gen.assign(valid, false);
  				gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
  			}
  			function equalCode(vSchema, i) {
  				const sch = schema[i];
  				return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
  			}
  		}
  	};
  }));
  var require_validation = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var limitNumber_1 = require_limitNumber();
  	var multipleOf_1 = require_multipleOf();
  	var limitLength_1 = require_limitLength();
  	var pattern_1 = require_pattern();
  	var limitProperties_1 = require_limitProperties();
  	var required_1 = require_required();
  	var limitItems_1 = require_limitItems();
  	var uniqueItems_1 = require_uniqueItems();
  	var const_1 = require_const();
  	var enum_1 = require_enum();
  	exports.default = [
  		limitNumber_1.default,
  		multipleOf_1.default,
  		limitLength_1.default,
  		pattern_1.default,
  		limitProperties_1.default,
  		required_1.default,
  		limitItems_1.default,
  		uniqueItems_1.default,
  		{
  			keyword: "type",
  			schemaType: ["string", "array"]
  		},
  		{
  			keyword: "nullable",
  			schemaType: "boolean"
  		},
  		const_1.default,
  		enum_1.default
  	];
  }));
  var require_additionalItems = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.validateAdditionalItems = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var def = {
  		keyword: "additionalItems",
  		type: "array",
  		schemaType: ["boolean", "object"],
  		before: "uniqueItems",
  		error: {
  			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
  			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
  		},
  		code(cxt) {
  			const { parentSchema, it } = cxt;
  			const { items } = parentSchema;
  			if (!Array.isArray(items)) {
  				(0, util_1.checkStrictMode)(it, "\"additionalItems\" is ignored when \"items\" is not an array of schemas");
  				return;
  			}
  			validateAdditionalItems(cxt, items);
  		}
  	};
  	function validateAdditionalItems(cxt, items) {
  		const { gen, schema, data, keyword, it } = cxt;
  		it.items = true;
  		const len = gen.const("len", (0, codegen_1._)`${data}.length`);
  		if (schema === false) {
  			cxt.setParams({ len: items.length });
  			cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
  		} else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
  			const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
  			gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
  			cxt.ok(valid);
  		}
  		function validateItems(valid) {
  			gen.forRange("i", items.length, len, (i) => {
  				cxt.subschema({
  					keyword,
  					dataProp: i,
  					dataPropType: util_1.Type.Num
  				}, valid);
  				if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
  			});
  		}
  	}
  	exports.validateAdditionalItems = validateAdditionalItems;
  	exports.default = def;
  }));
  var require_items = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.validateTuple = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var code_1 = require_code();
  	var def = {
  		keyword: "items",
  		type: "array",
  		schemaType: [
  			"object",
  			"array",
  			"boolean"
  		],
  		before: "uniqueItems",
  		code(cxt) {
  			const { schema, it } = cxt;
  			if (Array.isArray(schema)) return validateTuple(cxt, "additionalItems", schema);
  			it.items = true;
  			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
  			cxt.ok((0, code_1.validateArray)(cxt));
  		}
  	};
  	function validateTuple(cxt, extraItems, schArr = cxt.schema) {
  		const { gen, parentSchema, data, keyword, it } = cxt;
  		checkStrictTuple(parentSchema);
  		if (it.opts.unevaluated && schArr.length && it.items !== true) it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
  		const valid = gen.name("valid");
  		const len = gen.const("len", (0, codegen_1._)`${data}.length`);
  		schArr.forEach((sch, i) => {
  			if ((0, util_1.alwaysValidSchema)(it, sch)) return;
  			gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
  				keyword,
  				schemaProp: i,
  				dataProp: i
  			}, valid));
  			cxt.ok(valid);
  		});
  		function checkStrictTuple(sch) {
  			const { opts, errSchemaPath } = it;
  			const l = schArr.length;
  			const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
  			if (opts.strictTuples && !fullTuple) {
  				const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
  				(0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
  			}
  		}
  	}
  	exports.validateTuple = validateTuple;
  	exports.default = def;
  }));
  var require_prefixItems = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var items_1 = require_items();
  	exports.default = {
  		keyword: "prefixItems",
  		type: "array",
  		schemaType: ["array"],
  		before: "uniqueItems",
  		code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
  	};
  }));
  var require_items2020 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var code_1 = require_code();
  	var additionalItems_1 = require_additionalItems();
  	exports.default = {
  		keyword: "items",
  		type: "array",
  		schemaType: ["object", "boolean"],
  		before: "uniqueItems",
  		error: {
  			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
  			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
  		},
  		code(cxt) {
  			const { schema, parentSchema, it } = cxt;
  			const { prefixItems } = parentSchema;
  			it.items = true;
  			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
  			if (prefixItems) (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
  			else cxt.ok((0, code_1.validateArray)(cxt));
  		}
  	};
  }));
  var require_contains = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "contains",
  		type: "array",
  		schemaType: ["object", "boolean"],
  		before: "uniqueItems",
  		trackErrors: true,
  		error: {
  			message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
  			params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
  		},
  		code(cxt) {
  			const { gen, schema, parentSchema, data, it } = cxt;
  			let min;
  			let max;
  			const { minContains, maxContains } = parentSchema;
  			if (it.opts.next) {
  				min = minContains === void 0 ? 1 : minContains;
  				max = maxContains;
  			} else min = 1;
  			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
  			cxt.setParams({
  				min,
  				max
  			});
  			if (max === void 0 && min === 0) {
  				(0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
  				return;
  			}
  			if (max !== void 0 && min > max) {
  				(0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
  				cxt.fail();
  				return;
  			}
  			if ((0, util_1.alwaysValidSchema)(it, schema)) {
  				let cond = (0, codegen_1._)`${len} >= ${min}`;
  				if (max !== void 0) cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
  				cxt.pass(cond);
  				return;
  			}
  			it.items = true;
  			const valid = gen.name("valid");
  			if (max === void 0 && min === 1) validateItems(valid, () => gen.if(valid, () => gen.break()));
  			else if (min === 0) {
  				gen.let(valid, true);
  				if (max !== void 0) gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
  			} else {
  				gen.let(valid, false);
  				validateItemsWithCount();
  			}
  			cxt.result(valid, () => cxt.reset());
  			function validateItemsWithCount() {
  				const schValid = gen.name("_valid");
  				const count = gen.let("count", 0);
  				validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
  			}
  			function validateItems(_valid, block) {
  				gen.forRange("i", 0, len, (i) => {
  					cxt.subschema({
  						keyword: "contains",
  						dataProp: i,
  						dataPropType: util_1.Type.Num,
  						compositeRule: true
  					}, _valid);
  					block();
  				});
  			}
  			function checkLimits(count) {
  				gen.code((0, codegen_1._)`${count}++`);
  				if (max === void 0) gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
  				else {
  					gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
  					if (min === 1) gen.assign(valid, true);
  					else gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
  				}
  			}
  		}
  	};
  }));
  var require_dependencies = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var code_1 = require_code();
  	exports.error = {
  		message: ({ params: { property, depsCount, deps } }) => {
  			const property_ies = depsCount === 1 ? "property" : "properties";
  			return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
  		},
  		params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
      missingProperty: ${missingProperty},
      depsCount: ${depsCount},
      deps: ${deps}}`
  	};
  	var def = {
  		keyword: "dependencies",
  		type: "object",
  		schemaType: "object",
  		error: exports.error,
  		code(cxt) {
  			const [propDeps, schDeps] = splitDependencies(cxt);
  			validatePropertyDeps(cxt, propDeps);
  			validateSchemaDeps(cxt, schDeps);
  		}
  	};
  	function splitDependencies({ schema }) {
  		const propertyDeps = {};
  		const schemaDeps = {};
  		for (const key in schema) {
  			if (key === "__proto__") continue;
  			const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
  			deps[key] = schema[key];
  		}
  		return [propertyDeps, schemaDeps];
  	}
  	function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
  		const { gen, data, it } = cxt;
  		if (Object.keys(propertyDeps).length === 0) return;
  		const missing = gen.let("missing");
  		for (const prop in propertyDeps) {
  			const deps = propertyDeps[prop];
  			if (deps.length === 0) continue;
  			const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
  			cxt.setParams({
  				property: prop,
  				depsCount: deps.length,
  				deps: deps.join(", ")
  			});
  			if (it.allErrors) gen.if(hasProperty, () => {
  				for (const depProp of deps) (0, code_1.checkReportMissingProp)(cxt, depProp);
  			});
  			else {
  				gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
  				(0, code_1.reportMissingProp)(cxt, missing);
  				gen.else();
  			}
  		}
  	}
  	exports.validatePropertyDeps = validatePropertyDeps;
  	function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
  		const { gen, data, keyword, it } = cxt;
  		const valid = gen.name("valid");
  		for (const prop in schemaDeps) {
  			if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop])) continue;
  			gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties), () => {
  				const schCxt = cxt.subschema({
  					keyword,
  					schemaProp: prop
  				}, valid);
  				cxt.mergeValidEvaluated(schCxt, valid);
  			}, () => gen.var(valid, true));
  			cxt.ok(valid);
  		}
  	}
  	exports.validateSchemaDeps = validateSchemaDeps;
  	exports.default = def;
  }));
  var require_propertyNames = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "propertyNames",
  		type: "object",
  		schemaType: ["object", "boolean"],
  		error: {
  			message: "property name must be valid",
  			params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
  		},
  		code(cxt) {
  			const { gen, schema, data, it } = cxt;
  			if ((0, util_1.alwaysValidSchema)(it, schema)) return;
  			const valid = gen.name("valid");
  			gen.forIn("key", data, (key) => {
  				cxt.setParams({ propertyName: key });
  				cxt.subschema({
  					keyword: "propertyNames",
  					data: key,
  					dataTypes: ["string"],
  					propertyName: key,
  					compositeRule: true
  				}, valid);
  				gen.if((0, codegen_1.not)(valid), () => {
  					cxt.error(true);
  					if (!it.allErrors) gen.break();
  				});
  			});
  			cxt.ok(valid);
  		}
  	};
  }));
  var require_additionalProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var code_1 = require_code();
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "additionalProperties",
  		type: ["object"],
  		schemaType: ["boolean", "object"],
  		allowUndefined: true,
  		trackErrors: true,
  		error: {
  			message: "must NOT have additional properties",
  			params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
  		},
  		code(cxt) {
  			const { gen, schema, parentSchema, data, errsCount, it } = cxt;
  			/* istanbul ignore if */
  			if (!errsCount) throw new Error("ajv implementation error");
  			const { allErrors, opts } = it;
  			it.props = true;
  			if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema)) return;
  			const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
  			const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
  			checkAdditionalProperties();
  			cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
  			function checkAdditionalProperties() {
  				gen.forIn("key", data, (key) => {
  					if (!props.length && !patProps.length) additionalPropertyCode(key);
  					else gen.if(isAdditional(key), () => additionalPropertyCode(key));
  				});
  			}
  			function isAdditional(key) {
  				let definedProp;
  				if (props.length > 8) {
  					const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
  					definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
  				} else if (props.length) definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
  				else definedProp = codegen_1.nil;
  				if (patProps.length) definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
  				return (0, codegen_1.not)(definedProp);
  			}
  			function deleteAdditional(key) {
  				gen.code((0, codegen_1._)`delete ${data}[${key}]`);
  			}
  			function additionalPropertyCode(key) {
  				if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
  					deleteAdditional(key);
  					return;
  				}
  				if (schema === false) {
  					cxt.setParams({ additionalProperty: key });
  					cxt.error();
  					if (!allErrors) gen.break();
  					return;
  				}
  				if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
  					const valid = gen.name("valid");
  					if (opts.removeAdditional === "failing") {
  						applyAdditionalSchema(key, valid, false);
  						gen.if((0, codegen_1.not)(valid), () => {
  							cxt.reset();
  							deleteAdditional(key);
  						});
  					} else {
  						applyAdditionalSchema(key, valid);
  						if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
  					}
  				}
  			}
  			function applyAdditionalSchema(key, valid, errors) {
  				const subschema = {
  					keyword: "additionalProperties",
  					dataProp: key,
  					dataPropType: util_1.Type.Str
  				};
  				if (errors === false) Object.assign(subschema, {
  					compositeRule: true,
  					createErrors: false,
  					allErrors: false
  				});
  				cxt.subschema(subschema, valid);
  			}
  		}
  	};
  }));
  var require_properties = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var validate_1 = require_validate();
  	var code_1 = require_code();
  	var util_1 = require_util();
  	var additionalProperties_1 = require_additionalProperties();
  	exports.default = {
  		keyword: "properties",
  		type: "object",
  		schemaType: "object",
  		code(cxt) {
  			const { gen, schema, parentSchema, data, it } = cxt;
  			if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
  			const allProps = (0, code_1.allSchemaProperties)(schema);
  			for (const prop of allProps) it.definedProperties.add(prop);
  			if (it.opts.unevaluated && allProps.length && it.props !== true) it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
  			const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
  			if (properties.length === 0) return;
  			const valid = gen.name("valid");
  			for (const prop of properties) {
  				if (hasDefault(prop)) applyPropertySchema(prop);
  				else {
  					gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
  					applyPropertySchema(prop);
  					if (!it.allErrors) gen.else().var(valid, true);
  					gen.endIf();
  				}
  				cxt.it.definedProperties.add(prop);
  				cxt.ok(valid);
  			}
  			function hasDefault(prop) {
  				return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
  			}
  			function applyPropertySchema(prop) {
  				cxt.subschema({
  					keyword: "properties",
  					schemaProp: prop,
  					dataProp: prop
  				}, valid);
  			}
  		}
  	};
  }));
  var require_patternProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var code_1 = require_code();
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var util_2 = require_util();
  	exports.default = {
  		keyword: "patternProperties",
  		type: "object",
  		schemaType: "object",
  		code(cxt) {
  			const { gen, schema, data, parentSchema, it } = cxt;
  			const { opts } = it;
  			const patterns = (0, code_1.allSchemaProperties)(schema);
  			const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
  			if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) return;
  			const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
  			const valid = gen.name("valid");
  			if (it.props !== true && !(it.props instanceof codegen_1.Name)) it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
  			const { props } = it;
  			validatePatternProperties();
  			function validatePatternProperties() {
  				for (const pat of patterns) {
  					if (checkProperties) checkMatchingProperties(pat);
  					if (it.allErrors) validateProperties(pat);
  					else {
  						gen.var(valid, true);
  						validateProperties(pat);
  						gen.if(valid);
  					}
  				}
  			}
  			function checkMatchingProperties(pat) {
  				for (const prop in checkProperties) if (new RegExp(pat).test(prop)) (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
  			}
  			function validateProperties(pat) {
  				gen.forIn("key", data, (key) => {
  					gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
  						const alwaysValid = alwaysValidPatterns.includes(pat);
  						if (!alwaysValid) cxt.subschema({
  							keyword: "patternProperties",
  							schemaProp: pat,
  							dataProp: key,
  							dataPropType: util_2.Type.Str
  						}, valid);
  						if (it.opts.unevaluated && props !== true) gen.assign((0, codegen_1._)`${props}[${key}]`, true);
  						else if (!alwaysValid && !it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
  					});
  				});
  			}
  		}
  	};
  }));
  var require_not = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "not",
  		schemaType: ["object", "boolean"],
  		trackErrors: true,
  		code(cxt) {
  			const { gen, schema, it } = cxt;
  			if ((0, util_1.alwaysValidSchema)(it, schema)) {
  				cxt.fail();
  				return;
  			}
  			const valid = gen.name("valid");
  			cxt.subschema({
  				keyword: "not",
  				compositeRule: true,
  				createErrors: false,
  				allErrors: false
  			}, valid);
  			cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
  		},
  		error: { message: "must NOT be valid" }
  	};
  }));
  var require_anyOf = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = {
  		keyword: "anyOf",
  		schemaType: "array",
  		trackErrors: true,
  		code: require_code().validateUnion,
  		error: { message: "must match a schema in anyOf" }
  	};
  }));
  var require_oneOf = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "oneOf",
  		schemaType: "array",
  		trackErrors: true,
  		error: {
  			message: "must match exactly one schema in oneOf",
  			params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
  		},
  		code(cxt) {
  			const { gen, schema, parentSchema, it } = cxt;
  			/* istanbul ignore if */
  			if (!Array.isArray(schema)) throw new Error("ajv implementation error");
  			if (it.opts.discriminator && parentSchema.discriminator) return;
  			const schArr = schema;
  			const valid = gen.let("valid", false);
  			const passing = gen.let("passing", null);
  			const schValid = gen.name("_valid");
  			cxt.setParams({ passing });
  			gen.block(validateOneOf);
  			cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
  			function validateOneOf() {
  				schArr.forEach((sch, i) => {
  					let schCxt;
  					if ((0, util_1.alwaysValidSchema)(it, sch)) gen.var(schValid, true);
  					else schCxt = cxt.subschema({
  						keyword: "oneOf",
  						schemaProp: i,
  						compositeRule: true
  					}, schValid);
  					if (i > 0) gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
  					gen.if(schValid, () => {
  						gen.assign(valid, true);
  						gen.assign(passing, i);
  						if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1.Name);
  					});
  				});
  			}
  		}
  	};
  }));
  var require_allOf = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "allOf",
  		schemaType: "array",
  		code(cxt) {
  			const { gen, schema, it } = cxt;
  			/* istanbul ignore if */
  			if (!Array.isArray(schema)) throw new Error("ajv implementation error");
  			const valid = gen.name("valid");
  			schema.forEach((sch, i) => {
  				if ((0, util_1.alwaysValidSchema)(it, sch)) return;
  				const schCxt = cxt.subschema({
  					keyword: "allOf",
  					schemaProp: i
  				}, valid);
  				cxt.ok(valid);
  				cxt.mergeEvaluated(schCxt);
  			});
  		}
  	};
  }));
  var require_if = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var def = {
  		keyword: "if",
  		schemaType: ["object", "boolean"],
  		trackErrors: true,
  		error: {
  			message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
  			params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
  		},
  		code(cxt) {
  			const { gen, parentSchema, it } = cxt;
  			if (parentSchema.then === void 0 && parentSchema.else === void 0) (0, util_1.checkStrictMode)(it, "\"if\" without \"then\" and \"else\" is ignored");
  			const hasThen = hasSchema(it, "then");
  			const hasElse = hasSchema(it, "else");
  			if (!hasThen && !hasElse) return;
  			const valid = gen.let("valid", true);
  			const schValid = gen.name("_valid");
  			validateIf();
  			cxt.reset();
  			if (hasThen && hasElse) {
  				const ifClause = gen.let("ifClause");
  				cxt.setParams({ ifClause });
  				gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
  			} else if (hasThen) gen.if(schValid, validateClause("then"));
  			else gen.if((0, codegen_1.not)(schValid), validateClause("else"));
  			cxt.pass(valid, () => cxt.error(true));
  			function validateIf() {
  				const schCxt = cxt.subschema({
  					keyword: "if",
  					compositeRule: true,
  					createErrors: false,
  					allErrors: false
  				}, schValid);
  				cxt.mergeEvaluated(schCxt);
  			}
  			function validateClause(keyword, ifClause) {
  				return () => {
  					const schCxt = cxt.subschema({ keyword }, schValid);
  					gen.assign(valid, schValid);
  					cxt.mergeValidEvaluated(schCxt, valid);
  					if (ifClause) gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
  					else cxt.setParams({ ifClause: keyword });
  				};
  			}
  		}
  	};
  	function hasSchema(it, keyword) {
  		const schema = it.schema[keyword];
  		return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
  	}
  	exports.default = def;
  }));
  var require_thenElse = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var util_1 = require_util();
  	exports.default = {
  		keyword: ["then", "else"],
  		schemaType: ["object", "boolean"],
  		code({ keyword, parentSchema, it }) {
  			if (parentSchema.if === void 0) (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
  		}
  	};
  }));
  var require_applicator = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var additionalItems_1 = require_additionalItems();
  	var prefixItems_1 = require_prefixItems();
  	var items_1 = require_items();
  	var items2020_1 = require_items2020();
  	var contains_1 = require_contains();
  	var dependencies_1 = require_dependencies();
  	var propertyNames_1 = require_propertyNames();
  	var additionalProperties_1 = require_additionalProperties();
  	var properties_1 = require_properties();
  	var patternProperties_1 = require_patternProperties();
  	var not_1 = require_not();
  	var anyOf_1 = require_anyOf();
  	var oneOf_1 = require_oneOf();
  	var allOf_1 = require_allOf();
  	var if_1 = require_if();
  	var thenElse_1 = require_thenElse();
  	function getApplicator(draft2020 = false) {
  		const applicator = [
  			not_1.default,
  			anyOf_1.default,
  			oneOf_1.default,
  			allOf_1.default,
  			if_1.default,
  			thenElse_1.default,
  			propertyNames_1.default,
  			additionalProperties_1.default,
  			dependencies_1.default,
  			properties_1.default,
  			patternProperties_1.default
  		];
  		if (draft2020) applicator.push(prefixItems_1.default, items2020_1.default);
  		else applicator.push(additionalItems_1.default, items_1.default);
  		applicator.push(contains_1.default);
  		return applicator;
  	}
  	exports.default = getApplicator;
  }));
  var require_format$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	exports.default = {
  		keyword: "format",
  		type: ["number", "string"],
  		schemaType: "string",
  		$data: true,
  		error: {
  			message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
  			params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
  		},
  		code(cxt, ruleType) {
  			const { gen, data, $data, schema, schemaCode, it } = cxt;
  			const { opts, errSchemaPath, schemaEnv, self } = it;
  			if (!opts.validateFormats) return;
  			if ($data) validate$DataFormat();
  			else validateFormat();
  			function validate$DataFormat() {
  				const fmts = gen.scopeValue("formats", {
  					ref: self.formats,
  					code: opts.code.formats
  				});
  				const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
  				const fType = gen.let("fType");
  				const format = gen.let("format");
  				gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
  				cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
  				function unknownFmt() {
  					if (opts.strictSchema === false) return codegen_1.nil;
  					return (0, codegen_1._)`${schemaCode} && !${format}`;
  				}
  				function invalidFmt() {
  					const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
  					const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
  					return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
  				}
  			}
  			function validateFormat() {
  				const formatDef = self.formats[schema];
  				if (!formatDef) {
  					unknownFormat();
  					return;
  				}
  				if (formatDef === true) return;
  				const [fmtType, format, fmtRef] = getFormat(formatDef);
  				if (fmtType === ruleType) cxt.pass(validCondition());
  				function unknownFormat() {
  					if (opts.strictSchema === false) {
  						self.logger.warn(unknownMsg());
  						return;
  					}
  					throw new Error(unknownMsg());
  					function unknownMsg() {
  						return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
  					}
  				}
  				function getFormat(fmtDef) {
  					const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
  					const fmt = gen.scopeValue("formats", {
  						key: schema,
  						ref: fmtDef,
  						code
  					});
  					if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) return [
  						fmtDef.type || "string",
  						fmtDef.validate,
  						(0, codegen_1._)`${fmt}.validate`
  					];
  					return [
  						"string",
  						fmtDef,
  						fmt
  					];
  				}
  				function validCondition() {
  					if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
  						if (!schemaEnv.$async) throw new Error("async format in sync schema");
  						return (0, codegen_1._)`await ${fmtRef}(${data})`;
  					}
  					return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
  				}
  			}
  		}
  	};
  }));
  var require_format = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = [require_format$1().default];
  }));
  var require_metadata = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.contentVocabulary = exports.metadataVocabulary = void 0;
  	exports.metadataVocabulary = [
  		"title",
  		"description",
  		"default",
  		"deprecated",
  		"readOnly",
  		"writeOnly",
  		"examples"
  	];
  	exports.contentVocabulary = [
  		"contentMediaType",
  		"contentEncoding",
  		"contentSchema"
  	];
  }));
  var require_draft7 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var core_1 = require_core();
  	var validation_1 = require_validation();
  	var applicator_1 = require_applicator();
  	var format_1 = require_format();
  	var metadata_1 = require_metadata();
  	exports.default = [
  		core_1.default,
  		validation_1.default,
  		(0, applicator_1.default)(),
  		format_1.default,
  		metadata_1.metadataVocabulary,
  		metadata_1.contentVocabulary
  	];
  }));
  var require_types = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.DiscrError = void 0;
  	var DiscrError;
  	(function(DiscrError) {
  		DiscrError["Tag"] = "tag";
  		DiscrError["Mapping"] = "mapping";
  	})(DiscrError || (exports.DiscrError = DiscrError = {}));
  }));
  var require_discriminator = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var types_1 = require_types();
  	var compile_1 = require_compile();
  	var ref_error_1 = require_ref_error();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "discriminator",
  		type: "object",
  		schemaType: "object",
  		error: {
  			message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
  			params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
  		},
  		code(cxt) {
  			const { gen, data, schema, parentSchema, it } = cxt;
  			const { oneOf } = parentSchema;
  			if (!it.opts.discriminator) throw new Error("discriminator: requires discriminator option");
  			const tagName = schema.propertyName;
  			if (typeof tagName != "string") throw new Error("discriminator: requires propertyName");
  			if (schema.mapping) throw new Error("discriminator: mapping is not supported");
  			if (!oneOf) throw new Error("discriminator: requires oneOf keyword");
  			const valid = gen.let("valid", false);
  			const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
  			gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, {
  				discrError: types_1.DiscrError.Tag,
  				tag,
  				tagName
  			}));
  			cxt.ok(valid);
  			function validateMapping() {
  				const mapping = getMapping();
  				gen.if(false);
  				for (const tagValue in mapping) {
  					gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
  					gen.assign(valid, applyTagSchema(mapping[tagValue]));
  				}
  				gen.else();
  				cxt.error(false, {
  					discrError: types_1.DiscrError.Mapping,
  					tag,
  					tagName
  				});
  				gen.endIf();
  			}
  			function applyTagSchema(schemaProp) {
  				const _valid = gen.name("valid");
  				const schCxt = cxt.subschema({
  					keyword: "oneOf",
  					schemaProp
  				}, _valid);
  				cxt.mergeEvaluated(schCxt, codegen_1.Name);
  				return _valid;
  			}
  			function getMapping() {
  				var _a;
  				const oneOfMapping = {};
  				const topRequired = hasRequired(parentSchema);
  				let tagRequired = true;
  				for (let i = 0; i < oneOf.length; i++) {
  					let sch = oneOf[i];
  					if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
  						const ref = sch.$ref;
  						sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
  						if (sch instanceof compile_1.SchemaEnv) sch = sch.schema;
  						if (sch === void 0) throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
  					}
  					const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
  					if (typeof propSch != "object") throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
  					tagRequired = tagRequired && (topRequired || hasRequired(sch));
  					addMappings(propSch, i);
  				}
  				if (!tagRequired) throw new Error(`discriminator: "${tagName}" must be required`);
  				return oneOfMapping;
  				function hasRequired({ required }) {
  					return Array.isArray(required) && required.includes(tagName);
  				}
  				function addMappings(sch, i) {
  					if (sch.const) addMapping(sch.const, i);
  					else if (sch.enum) for (const tagValue of sch.enum) addMapping(tagValue, i);
  					else throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
  				}
  				function addMapping(tagValue, i) {
  					if (typeof tagValue != "string" || tagValue in oneOfMapping) throw new Error(`discriminator: "${tagName}" values must be unique strings`);
  					oneOfMapping[tagValue] = i;
  				}
  			}
  		}
  	};
  }));
  var json_schema_draft_07_exports = /* @__PURE__ */ __exportAll({
  	$id: () => $id$12,
  	$schema: () => $schema$12,
  	default: () => json_schema_draft_07_default,
  	definitions: () => definitions,
  	properties: () => properties$11,
  	title: () => title$10,
  	type: () => type$11
  });
  var $schema$12, $id$12, title$10, definitions, type$11, properties$11, json_schema_draft_07_default;
  var init_json_schema_draft_07 = __esmMin((() => {
  	$schema$12 = "http://json-schema.org/draft-07/schema#";
  	$id$12 = "http://json-schema.org/draft-07/schema#";
  	title$10 = "Core schema meta-schema";
  	definitions = {
  		"schemaArray": {
  			"type": "array",
  			"minItems": 1,
  			"items": { "$ref": "#" }
  		},
  		"nonNegativeInteger": {
  			"type": "integer",
  			"minimum": 0
  		},
  		"nonNegativeIntegerDefault0": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }, { "default": 0 }] },
  		"simpleTypes": { "enum": [
  			"array",
  			"boolean",
  			"integer",
  			"null",
  			"number",
  			"object",
  			"string"
  		] },
  		"stringArray": {
  			"type": "array",
  			"items": { "type": "string" },
  			"uniqueItems": true,
  			"default": []
  		}
  	};
  	type$11 = ["object", "boolean"];
  	properties$11 = {
  		"$id": {
  			"type": "string",
  			"format": "uri-reference"
  		},
  		"$schema": {
  			"type": "string",
  			"format": "uri"
  		},
  		"$ref": {
  			"type": "string",
  			"format": "uri-reference"
  		},
  		"$comment": { "type": "string" },
  		"title": { "type": "string" },
  		"description": { "type": "string" },
  		"default": true,
  		"readOnly": {
  			"type": "boolean",
  			"default": false
  		},
  		"examples": {
  			"type": "array",
  			"items": true
  		},
  		"multipleOf": {
  			"type": "number",
  			"exclusiveMinimum": 0
  		},
  		"maximum": { "type": "number" },
  		"exclusiveMaximum": { "type": "number" },
  		"minimum": { "type": "number" },
  		"exclusiveMinimum": { "type": "number" },
  		"maxLength": { "$ref": "#/definitions/nonNegativeInteger" },
  		"minLength": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
  		"pattern": {
  			"type": "string",
  			"format": "regex"
  		},
  		"additionalItems": { "$ref": "#" },
  		"items": {
  			"anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/schemaArray" }],
  			"default": true
  		},
  		"maxItems": { "$ref": "#/definitions/nonNegativeInteger" },
  		"minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
  		"uniqueItems": {
  			"type": "boolean",
  			"default": false
  		},
  		"contains": { "$ref": "#" },
  		"maxProperties": { "$ref": "#/definitions/nonNegativeInteger" },
  		"minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
  		"required": { "$ref": "#/definitions/stringArray" },
  		"additionalProperties": { "$ref": "#" },
  		"definitions": {
  			"type": "object",
  			"additionalProperties": { "$ref": "#" },
  			"default": {}
  		},
  		"properties": {
  			"type": "object",
  			"additionalProperties": { "$ref": "#" },
  			"default": {}
  		},
  		"patternProperties": {
  			"type": "object",
  			"additionalProperties": { "$ref": "#" },
  			"propertyNames": { "format": "regex" },
  			"default": {}
  		},
  		"dependencies": {
  			"type": "object",
  			"additionalProperties": { "anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/stringArray" }] }
  		},
  		"propertyNames": { "$ref": "#" },
  		"const": true,
  		"enum": {
  			"type": "array",
  			"items": true,
  			"minItems": 1,
  			"uniqueItems": true
  		},
  		"type": { "anyOf": [{ "$ref": "#/definitions/simpleTypes" }, {
  			"type": "array",
  			"items": { "$ref": "#/definitions/simpleTypes" },
  			"minItems": 1,
  			"uniqueItems": true
  		}] },
  		"format": { "type": "string" },
  		"contentMediaType": { "type": "string" },
  		"contentEncoding": { "type": "string" },
  		"if": { "$ref": "#" },
  		"then": { "$ref": "#" },
  		"else": { "$ref": "#" },
  		"allOf": { "$ref": "#/definitions/schemaArray" },
  		"anyOf": { "$ref": "#/definitions/schemaArray" },
  		"oneOf": { "$ref": "#/definitions/schemaArray" },
  		"not": { "$ref": "#" }
  	};
  	json_schema_draft_07_default = {
  		$schema: $schema$12,
  		$id: $id$12,
  		title: title$10,
  		definitions,
  		type: type$11,
  		properties: properties$11,
  		"default": true
  	};
  }));
  var require_ajv = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv = void 0;
  	var core_1 = require_core$1();
  	var draft7_1 = require_draft7();
  	var discriminator_1 = require_discriminator();
  	var draft7MetaSchema = (init_json_schema_draft_07(), __toCommonJS(json_schema_draft_07_exports).default);
  	var META_SUPPORT_DATA = ["/properties"];
  	var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  	var Ajv = class extends core_1.default {
  		_addVocabularies() {
  			super._addVocabularies();
  			draft7_1.default.forEach((v) => this.addVocabulary(v));
  			if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
  		}
  		_addDefaultMetaSchema() {
  			super._addDefaultMetaSchema();
  			if (!this.opts.meta) return;
  			const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
  			this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
  			this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
  		}
  		defaultMeta() {
  			return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
  		}
  	};
  	exports.Ajv = Ajv;
  	module.exports = exports = Ajv;
  	module.exports.Ajv = Ajv;
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = Ajv;
  	var validate_1 = require_validate();
  	Object.defineProperty(exports, "KeywordCxt", {
  		enumerable: true,
  		get: function() {
  			return validate_1.KeywordCxt;
  		}
  	});
  	var codegen_1 = require_codegen();
  	Object.defineProperty(exports, "_", {
  		enumerable: true,
  		get: function() {
  			return codegen_1._;
  		}
  	});
  	Object.defineProperty(exports, "str", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.str;
  		}
  	});
  	Object.defineProperty(exports, "stringify", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.stringify;
  		}
  	});
  	Object.defineProperty(exports, "nil", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.nil;
  		}
  	});
  	Object.defineProperty(exports, "Name", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.Name;
  		}
  	});
  	Object.defineProperty(exports, "CodeGen", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.CodeGen;
  		}
  	});
  	var validation_error_1 = require_validation_error();
  	Object.defineProperty(exports, "ValidationError", {
  		enumerable: true,
  		get: function() {
  			return validation_error_1.default;
  		}
  	});
  	var ref_error_1 = require_ref_error();
  	Object.defineProperty(exports, "MissingRefError", {
  		enumerable: true,
  		get: function() {
  			return ref_error_1.default;
  		}
  	});
  }));
  var require_dynamicAnchor = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.dynamicAnchor = void 0;
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var compile_1 = require_compile();
  	var ref_1 = require_ref();
  	var def = {
  		keyword: "$dynamicAnchor",
  		schemaType: "string",
  		code: (cxt) => dynamicAnchor(cxt, cxt.schema)
  	};
  	function dynamicAnchor(cxt, anchor) {
  		const { gen, it } = cxt;
  		it.schemaEnv.root.dynamicAnchors[anchor] = true;
  		const v = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
  		const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
  		gen.if((0, codegen_1._)`!${v}`, () => gen.assign(v, validate));
  	}
  	exports.dynamicAnchor = dynamicAnchor;
  	function _getValidate(cxt) {
  		const { schemaEnv, schema, self } = cxt.it;
  		const { root, baseId, localRefs, meta } = schemaEnv.root;
  		const { schemaId } = self.opts;
  		const sch = new compile_1.SchemaEnv({
  			schema,
  			schemaId,
  			root,
  			baseId,
  			localRefs,
  			meta
  		});
  		compile_1.compileSchema.call(self, sch);
  		return (0, ref_1.getValidate)(cxt, sch);
  	}
  	exports.default = def;
  }));
  var require_dynamicRef = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.dynamicRef = void 0;
  	var codegen_1 = require_codegen();
  	var names_1 = require_names();
  	var ref_1 = require_ref();
  	var def = {
  		keyword: "$dynamicRef",
  		schemaType: "string",
  		code: (cxt) => dynamicRef(cxt, cxt.schema)
  	};
  	function dynamicRef(cxt, ref) {
  		const { gen, keyword, it } = cxt;
  		if (ref[0] !== "#") throw new Error(`"${keyword}" only supports hash fragment reference`);
  		const anchor = ref.slice(1);
  		if (it.allErrors) _dynamicRef();
  		else {
  			const valid = gen.let("valid", false);
  			_dynamicRef(valid);
  			cxt.ok(valid);
  		}
  		function _dynamicRef(valid) {
  			if (it.schemaEnv.root.dynamicAnchors[anchor]) {
  				const v = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
  				gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
  			} else _callRef(it.validateName, valid)();
  		}
  		function _callRef(validate, valid) {
  			return valid ? () => gen.block(() => {
  				(0, ref_1.callRef)(cxt, validate);
  				gen.let(valid, true);
  			}) : () => (0, ref_1.callRef)(cxt, validate);
  		}
  	}
  	exports.dynamicRef = dynamicRef;
  	exports.default = def;
  }));
  var require_recursiveAnchor = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dynamicAnchor_1 = require_dynamicAnchor();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "$recursiveAnchor",
  		schemaType: "boolean",
  		code(cxt) {
  			if (cxt.schema) (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
  			else (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
  		}
  	};
  }));
  var require_recursiveRef = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dynamicRef_1 = require_dynamicRef();
  	exports.default = {
  		keyword: "$recursiveRef",
  		schemaType: "string",
  		code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
  	};
  }));
  var require_dynamic = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dynamicAnchor_1 = require_dynamicAnchor();
  	var dynamicRef_1 = require_dynamicRef();
  	var recursiveAnchor_1 = require_recursiveAnchor();
  	var recursiveRef_1 = require_recursiveRef();
  	exports.default = [
  		dynamicAnchor_1.default,
  		dynamicRef_1.default,
  		recursiveAnchor_1.default,
  		recursiveRef_1.default
  	];
  }));
  var require_dependentRequired = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dependencies_1 = require_dependencies();
  	exports.default = {
  		keyword: "dependentRequired",
  		type: "object",
  		schemaType: "object",
  		error: dependencies_1.error,
  		code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
  	};
  }));
  var require_dependentSchemas = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dependencies_1 = require_dependencies();
  	exports.default = {
  		keyword: "dependentSchemas",
  		type: "object",
  		schemaType: "object",
  		code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
  	};
  }));
  var require_limitContains = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var util_1 = require_util();
  	exports.default = {
  		keyword: ["maxContains", "minContains"],
  		type: "array",
  		schemaType: "number",
  		code({ keyword, parentSchema, it }) {
  			if (parentSchema.contains === void 0) (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
  		}
  	};
  }));
  var require_next = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var dependentRequired_1 = require_dependentRequired();
  	var dependentSchemas_1 = require_dependentSchemas();
  	var limitContains_1 = require_limitContains();
  	exports.default = [
  		dependentRequired_1.default,
  		dependentSchemas_1.default,
  		limitContains_1.default
  	];
  }));
  var require_unevaluatedProperties = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	var names_1 = require_names();
  	exports.default = {
  		keyword: "unevaluatedProperties",
  		type: "object",
  		schemaType: ["boolean", "object"],
  		trackErrors: true,
  		error: {
  			message: "must NOT have unevaluated properties",
  			params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
  		},
  		code(cxt) {
  			const { gen, schema, data, errsCount, it } = cxt;
  			/* istanbul ignore if */
  			if (!errsCount) throw new Error("ajv implementation error");
  			const { allErrors, props } = it;
  			if (props instanceof codegen_1.Name) gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
  			else if (props !== true) gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
  			it.props = true;
  			cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
  			function unevaluatedPropCode(key) {
  				if (schema === false) {
  					cxt.setParams({ unevaluatedProperty: key });
  					cxt.error();
  					if (!allErrors) gen.break();
  					return;
  				}
  				if (!(0, util_1.alwaysValidSchema)(it, schema)) {
  					const valid = gen.name("valid");
  					cxt.subschema({
  						keyword: "unevaluatedProperties",
  						dataProp: key,
  						dataPropType: util_1.Type.Str
  					}, valid);
  					if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
  				}
  			}
  			function unevaluatedDynamic(evaluatedProps, key) {
  				return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
  			}
  			function unevaluatedStatic(evaluatedProps, key) {
  				const ps = [];
  				for (const p in evaluatedProps) if (evaluatedProps[p] === true) ps.push((0, codegen_1._)`${key} !== ${p}`);
  				return (0, codegen_1.and)(...ps);
  			}
  		}
  	};
  }));
  var require_unevaluatedItems = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var codegen_1 = require_codegen();
  	var util_1 = require_util();
  	exports.default = {
  		keyword: "unevaluatedItems",
  		type: "array",
  		schemaType: ["boolean", "object"],
  		error: {
  			message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
  			params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
  		},
  		code(cxt) {
  			const { gen, schema, data, it } = cxt;
  			const items = it.items || 0;
  			if (items === true) return;
  			const len = gen.const("len", (0, codegen_1._)`${data}.length`);
  			if (schema === false) {
  				cxt.setParams({ len: items });
  				cxt.fail((0, codegen_1._)`${len} > ${items}`);
  			} else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
  				const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
  				gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
  				cxt.ok(valid);
  			}
  			it.items = true;
  			function validateItems(valid, from) {
  				gen.forRange("i", from, len, (i) => {
  					cxt.subschema({
  						keyword: "unevaluatedItems",
  						dataProp: i,
  						dataPropType: util_1.Type.Num
  					}, valid);
  					if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
  				});
  			}
  		}
  	};
  }));
  var require_unevaluated = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var unevaluatedProperties_1 = require_unevaluatedProperties();
  	var unevaluatedItems_1 = require_unevaluatedItems();
  	exports.default = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
  }));
  var require_draft2020 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var core_1 = require_core();
  	var validation_1 = require_validation();
  	var applicator_1 = require_applicator();
  	var dynamic_1 = require_dynamic();
  	var next_1 = require_next();
  	var unevaluated_1 = require_unevaluated();
  	var format_1 = require_format();
  	var metadata_1 = require_metadata();
  	exports.default = [
  		dynamic_1.default,
  		core_1.default,
  		validation_1.default,
  		(0, applicator_1.default)(true),
  		format_1.default,
  		metadata_1.metadataVocabulary,
  		metadata_1.contentVocabulary,
  		next_1.default,
  		unevaluated_1.default
  	];
  }));
  var schema_exports = /* @__PURE__ */ __exportAll({
  	$comment: () => $comment,
  	$dynamicAnchor: () => $dynamicAnchor$7,
  	$id: () => $id$11,
  	$schema: () => $schema$11,
  	$vocabulary: () => $vocabulary$7,
  	allOf: () => allOf,
  	default: () => schema_default,
  	properties: () => properties$10,
  	title: () => title$9,
  	type: () => type$10
  });
  var $schema$11, $id$11, $vocabulary$7, $dynamicAnchor$7, title$9, allOf, type$10, $comment, properties$10, schema_default;
  var init_schema = __esmMin((() => {
  	$schema$11 = "https://json-schema.org/draft/2020-12/schema";
  	$id$11 = "https://json-schema.org/draft/2020-12/schema";
  	$vocabulary$7 = {
  		"https://json-schema.org/draft/2020-12/vocab/core": true,
  		"https://json-schema.org/draft/2020-12/vocab/applicator": true,
  		"https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
  		"https://json-schema.org/draft/2020-12/vocab/validation": true,
  		"https://json-schema.org/draft/2020-12/vocab/meta-data": true,
  		"https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
  		"https://json-schema.org/draft/2020-12/vocab/content": true
  	};
  	$dynamicAnchor$7 = "meta";
  	title$9 = "Core and Validation specifications meta-schema";
  	allOf = [
  		{ "$ref": "meta/core" },
  		{ "$ref": "meta/applicator" },
  		{ "$ref": "meta/unevaluated" },
  		{ "$ref": "meta/validation" },
  		{ "$ref": "meta/meta-data" },
  		{ "$ref": "meta/format-annotation" },
  		{ "$ref": "meta/content" }
  	];
  	type$10 = ["object", "boolean"];
  	$comment = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.";
  	properties$10 = {
  		"definitions": {
  			"$comment": "\"definitions\" has been replaced by \"$defs\".",
  			"type": "object",
  			"additionalProperties": { "$dynamicRef": "#meta" },
  			"deprecated": true,
  			"default": {}
  		},
  		"dependencies": {
  			"$comment": "\"dependencies\" has been split and replaced by \"dependentSchemas\" and \"dependentRequired\" in order to serve their differing semantics.",
  			"type": "object",
  			"additionalProperties": { "anyOf": [{ "$dynamicRef": "#meta" }, { "$ref": "meta/validation#/$defs/stringArray" }] },
  			"deprecated": true,
  			"default": {}
  		},
  		"$recursiveAnchor": {
  			"$comment": "\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".",
  			"$ref": "meta/core#/$defs/anchorString",
  			"deprecated": true
  		},
  		"$recursiveRef": {
  			"$comment": "\"$recursiveRef\" has been replaced by \"$dynamicRef\".",
  			"$ref": "meta/core#/$defs/uriReferenceString",
  			"deprecated": true
  		}
  	};
  	schema_default = {
  		$schema: $schema$11,
  		$id: $id$11,
  		$vocabulary: $vocabulary$7,
  		$dynamicAnchor: $dynamicAnchor$7,
  		title: title$9,
  		allOf,
  		type: type$10,
  		$comment,
  		properties: properties$10
  	};
  }));
  var applicator_exports = /* @__PURE__ */ __exportAll({
  	$defs: () => $defs$3,
  	$dynamicAnchor: () => $dynamicAnchor$6,
  	$id: () => $id$10,
  	$schema: () => $schema$10,
  	$vocabulary: () => $vocabulary$6,
  	default: () => applicator_default,
  	properties: () => properties$9,
  	title: () => title$8,
  	type: () => type$9
  });
  var $schema$10, $id$10, $vocabulary$6, $dynamicAnchor$6, title$8, type$9, properties$9, $defs$3, applicator_default;
  var init_applicator = __esmMin((() => {
  	$schema$10 = "https://json-schema.org/draft/2020-12/schema";
  	$id$10 = "https://json-schema.org/draft/2020-12/meta/applicator";
  	$vocabulary$6 = { "https://json-schema.org/draft/2020-12/vocab/applicator": true };
  	$dynamicAnchor$6 = "meta";
  	title$8 = "Applicator vocabulary meta-schema";
  	type$9 = ["object", "boolean"];
  	properties$9 = {
  		"prefixItems": { "$ref": "#/$defs/schemaArray" },
  		"items": { "$dynamicRef": "#meta" },
  		"contains": { "$dynamicRef": "#meta" },
  		"additionalProperties": { "$dynamicRef": "#meta" },
  		"properties": {
  			"type": "object",
  			"additionalProperties": { "$dynamicRef": "#meta" },
  			"default": {}
  		},
  		"patternProperties": {
  			"type": "object",
  			"additionalProperties": { "$dynamicRef": "#meta" },
  			"propertyNames": { "format": "regex" },
  			"default": {}
  		},
  		"dependentSchemas": {
  			"type": "object",
  			"additionalProperties": { "$dynamicRef": "#meta" },
  			"default": {}
  		},
  		"propertyNames": { "$dynamicRef": "#meta" },
  		"if": { "$dynamicRef": "#meta" },
  		"then": { "$dynamicRef": "#meta" },
  		"else": { "$dynamicRef": "#meta" },
  		"allOf": { "$ref": "#/$defs/schemaArray" },
  		"anyOf": { "$ref": "#/$defs/schemaArray" },
  		"oneOf": { "$ref": "#/$defs/schemaArray" },
  		"not": { "$dynamicRef": "#meta" }
  	};
  	$defs$3 = { "schemaArray": {
  		"type": "array",
  		"minItems": 1,
  		"items": { "$dynamicRef": "#meta" }
  	} };
  	applicator_default = {
  		$schema: $schema$10,
  		$id: $id$10,
  		$vocabulary: $vocabulary$6,
  		$dynamicAnchor: $dynamicAnchor$6,
  		title: title$8,
  		type: type$9,
  		properties: properties$9,
  		$defs: $defs$3
  	};
  }));
  var unevaluated_exports = /* @__PURE__ */ __exportAll({
  	$dynamicAnchor: () => $dynamicAnchor$5,
  	$id: () => $id$9,
  	$schema: () => $schema$9,
  	$vocabulary: () => $vocabulary$5,
  	default: () => unevaluated_default,
  	properties: () => properties$8,
  	title: () => title$7,
  	type: () => type$8
  });
  var $schema$9, $id$9, $vocabulary$5, $dynamicAnchor$5, title$7, type$8, properties$8, unevaluated_default;
  var init_unevaluated = __esmMin((() => {
  	$schema$9 = "https://json-schema.org/draft/2020-12/schema";
  	$id$9 = "https://json-schema.org/draft/2020-12/meta/unevaluated";
  	$vocabulary$5 = { "https://json-schema.org/draft/2020-12/vocab/unevaluated": true };
  	$dynamicAnchor$5 = "meta";
  	title$7 = "Unevaluated applicator vocabulary meta-schema";
  	type$8 = ["object", "boolean"];
  	properties$8 = {
  		"unevaluatedItems": { "$dynamicRef": "#meta" },
  		"unevaluatedProperties": { "$dynamicRef": "#meta" }
  	};
  	unevaluated_default = {
  		$schema: $schema$9,
  		$id: $id$9,
  		$vocabulary: $vocabulary$5,
  		$dynamicAnchor: $dynamicAnchor$5,
  		title: title$7,
  		type: type$8,
  		properties: properties$8
  	};
  }));
  var content_exports = /* @__PURE__ */ __exportAll({
  	$dynamicAnchor: () => $dynamicAnchor$4,
  	$id: () => $id$8,
  	$schema: () => $schema$8,
  	$vocabulary: () => $vocabulary$4,
  	default: () => content_default,
  	properties: () => properties$7,
  	title: () => title$6,
  	type: () => type$7
  });
  var $schema$8, $id$8, $vocabulary$4, $dynamicAnchor$4, title$6, type$7, properties$7, content_default;
  var init_content = __esmMin((() => {
  	$schema$8 = "https://json-schema.org/draft/2020-12/schema";
  	$id$8 = "https://json-schema.org/draft/2020-12/meta/content";
  	$vocabulary$4 = { "https://json-schema.org/draft/2020-12/vocab/content": true };
  	$dynamicAnchor$4 = "meta";
  	title$6 = "Content vocabulary meta-schema";
  	type$7 = ["object", "boolean"];
  	properties$7 = {
  		"contentEncoding": { "type": "string" },
  		"contentMediaType": { "type": "string" },
  		"contentSchema": { "$dynamicRef": "#meta" }
  	};
  	content_default = {
  		$schema: $schema$8,
  		$id: $id$8,
  		$vocabulary: $vocabulary$4,
  		$dynamicAnchor: $dynamicAnchor$4,
  		title: title$6,
  		type: type$7,
  		properties: properties$7
  	};
  }));
  var core_exports = /* @__PURE__ */ __exportAll({
  	$defs: () => $defs$2,
  	$dynamicAnchor: () => $dynamicAnchor$3,
  	$id: () => $id$7,
  	$schema: () => $schema$7,
  	$vocabulary: () => $vocabulary$3,
  	default: () => core_default,
  	properties: () => properties$6,
  	title: () => title$5,
  	type: () => type$6
  });
  var $schema$7, $id$7, $vocabulary$3, $dynamicAnchor$3, title$5, type$6, properties$6, $defs$2, core_default;
  var init_core = __esmMin((() => {
  	$schema$7 = "https://json-schema.org/draft/2020-12/schema";
  	$id$7 = "https://json-schema.org/draft/2020-12/meta/core";
  	$vocabulary$3 = { "https://json-schema.org/draft/2020-12/vocab/core": true };
  	$dynamicAnchor$3 = "meta";
  	title$5 = "Core vocabulary meta-schema";
  	type$6 = ["object", "boolean"];
  	properties$6 = {
  		"$id": {
  			"$ref": "#/$defs/uriReferenceString",
  			"$comment": "Non-empty fragments not allowed.",
  			"pattern": "^[^#]*#?$"
  		},
  		"$schema": { "$ref": "#/$defs/uriString" },
  		"$ref": { "$ref": "#/$defs/uriReferenceString" },
  		"$anchor": { "$ref": "#/$defs/anchorString" },
  		"$dynamicRef": { "$ref": "#/$defs/uriReferenceString" },
  		"$dynamicAnchor": { "$ref": "#/$defs/anchorString" },
  		"$vocabulary": {
  			"type": "object",
  			"propertyNames": { "$ref": "#/$defs/uriString" },
  			"additionalProperties": { "type": "boolean" }
  		},
  		"$comment": { "type": "string" },
  		"$defs": {
  			"type": "object",
  			"additionalProperties": { "$dynamicRef": "#meta" }
  		}
  	};
  	$defs$2 = {
  		"anchorString": {
  			"type": "string",
  			"pattern": "^[A-Za-z_][-A-Za-z0-9._]*$"
  		},
  		"uriString": {
  			"type": "string",
  			"format": "uri"
  		},
  		"uriReferenceString": {
  			"type": "string",
  			"format": "uri-reference"
  		}
  	};
  	core_default = {
  		$schema: $schema$7,
  		$id: $id$7,
  		$vocabulary: $vocabulary$3,
  		$dynamicAnchor: $dynamicAnchor$3,
  		title: title$5,
  		type: type$6,
  		properties: properties$6,
  		$defs: $defs$2
  	};
  }));
  var format_annotation_exports = /* @__PURE__ */ __exportAll({
  	$dynamicAnchor: () => $dynamicAnchor$2,
  	$id: () => $id$6,
  	$schema: () => $schema$6,
  	$vocabulary: () => $vocabulary$2,
  	default: () => format_annotation_default,
  	properties: () => properties$5,
  	title: () => title$4,
  	type: () => type$5
  });
  var $schema$6, $id$6, $vocabulary$2, $dynamicAnchor$2, title$4, type$5, properties$5, format_annotation_default;
  var init_format_annotation = __esmMin((() => {
  	$schema$6 = "https://json-schema.org/draft/2020-12/schema";
  	$id$6 = "https://json-schema.org/draft/2020-12/meta/format-annotation";
  	$vocabulary$2 = { "https://json-schema.org/draft/2020-12/vocab/format-annotation": true };
  	$dynamicAnchor$2 = "meta";
  	title$4 = "Format vocabulary meta-schema for annotation results";
  	type$5 = ["object", "boolean"];
  	properties$5 = { "format": { "type": "string" } };
  	format_annotation_default = {
  		$schema: $schema$6,
  		$id: $id$6,
  		$vocabulary: $vocabulary$2,
  		$dynamicAnchor: $dynamicAnchor$2,
  		title: title$4,
  		type: type$5,
  		properties: properties$5
  	};
  }));
  var meta_data_exports = /* @__PURE__ */ __exportAll({
  	$dynamicAnchor: () => $dynamicAnchor$1,
  	$id: () => $id$5,
  	$schema: () => $schema$5,
  	$vocabulary: () => $vocabulary$1,
  	default: () => meta_data_default,
  	properties: () => properties$4,
  	title: () => title$3,
  	type: () => type$4
  });
  var $schema$5, $id$5, $vocabulary$1, $dynamicAnchor$1, title$3, type$4, properties$4, meta_data_default;
  var init_meta_data = __esmMin((() => {
  	$schema$5 = "https://json-schema.org/draft/2020-12/schema";
  	$id$5 = "https://json-schema.org/draft/2020-12/meta/meta-data";
  	$vocabulary$1 = { "https://json-schema.org/draft/2020-12/vocab/meta-data": true };
  	$dynamicAnchor$1 = "meta";
  	title$3 = "Meta-data vocabulary meta-schema";
  	type$4 = ["object", "boolean"];
  	properties$4 = {
  		"title": { "type": "string" },
  		"description": { "type": "string" },
  		"default": true,
  		"deprecated": {
  			"type": "boolean",
  			"default": false
  		},
  		"readOnly": {
  			"type": "boolean",
  			"default": false
  		},
  		"writeOnly": {
  			"type": "boolean",
  			"default": false
  		},
  		"examples": {
  			"type": "array",
  			"items": true
  		}
  	};
  	meta_data_default = {
  		$schema: $schema$5,
  		$id: $id$5,
  		$vocabulary: $vocabulary$1,
  		$dynamicAnchor: $dynamicAnchor$1,
  		title: title$3,
  		type: type$4,
  		properties: properties$4
  	};
  }));
  var validation_exports = /* @__PURE__ */ __exportAll({
  	$defs: () => $defs$1,
  	$dynamicAnchor: () => $dynamicAnchor,
  	$id: () => $id$4,
  	$schema: () => $schema$4,
  	$vocabulary: () => $vocabulary,
  	default: () => validation_default,
  	properties: () => properties$3,
  	title: () => title$2,
  	type: () => type$3
  });
  var $schema$4, $id$4, $vocabulary, $dynamicAnchor, title$2, type$3, properties$3, $defs$1, validation_default;
  var init_validation = __esmMin((() => {
  	$schema$4 = "https://json-schema.org/draft/2020-12/schema";
  	$id$4 = "https://json-schema.org/draft/2020-12/meta/validation";
  	$vocabulary = { "https://json-schema.org/draft/2020-12/vocab/validation": true };
  	$dynamicAnchor = "meta";
  	title$2 = "Validation vocabulary meta-schema";
  	type$3 = ["object", "boolean"];
  	properties$3 = {
  		"type": { "anyOf": [{ "$ref": "#/$defs/simpleTypes" }, {
  			"type": "array",
  			"items": { "$ref": "#/$defs/simpleTypes" },
  			"minItems": 1,
  			"uniqueItems": true
  		}] },
  		"const": true,
  		"enum": {
  			"type": "array",
  			"items": true
  		},
  		"multipleOf": {
  			"type": "number",
  			"exclusiveMinimum": 0
  		},
  		"maximum": { "type": "number" },
  		"exclusiveMaximum": { "type": "number" },
  		"minimum": { "type": "number" },
  		"exclusiveMinimum": { "type": "number" },
  		"maxLength": { "$ref": "#/$defs/nonNegativeInteger" },
  		"minLength": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
  		"pattern": {
  			"type": "string",
  			"format": "regex"
  		},
  		"maxItems": { "$ref": "#/$defs/nonNegativeInteger" },
  		"minItems": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
  		"uniqueItems": {
  			"type": "boolean",
  			"default": false
  		},
  		"maxContains": { "$ref": "#/$defs/nonNegativeInteger" },
  		"minContains": {
  			"$ref": "#/$defs/nonNegativeInteger",
  			"default": 1
  		},
  		"maxProperties": { "$ref": "#/$defs/nonNegativeInteger" },
  		"minProperties": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
  		"required": { "$ref": "#/$defs/stringArray" },
  		"dependentRequired": {
  			"type": "object",
  			"additionalProperties": { "$ref": "#/$defs/stringArray" }
  		}
  	};
  	$defs$1 = {
  		"nonNegativeInteger": {
  			"type": "integer",
  			"minimum": 0
  		},
  		"nonNegativeIntegerDefault0": {
  			"$ref": "#/$defs/nonNegativeInteger",
  			"default": 0
  		},
  		"simpleTypes": { "enum": [
  			"array",
  			"boolean",
  			"integer",
  			"null",
  			"number",
  			"object",
  			"string"
  		] },
  		"stringArray": {
  			"type": "array",
  			"items": { "type": "string" },
  			"uniqueItems": true,
  			"default": []
  		}
  	};
  	validation_default = {
  		$schema: $schema$4,
  		$id: $id$4,
  		$vocabulary,
  		$dynamicAnchor,
  		title: title$2,
  		type: type$3,
  		properties: properties$3,
  		$defs: $defs$1
  	};
  }));
  var require_json_schema_2020_12 = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var metaSchema = (init_schema(), __toCommonJS(schema_exports).default);
  	var applicator = (init_applicator(), __toCommonJS(applicator_exports).default);
  	var unevaluated = (init_unevaluated(), __toCommonJS(unevaluated_exports).default);
  	var content = (init_content(), __toCommonJS(content_exports).default);
  	var core = (init_core(), __toCommonJS(core_exports).default);
  	var format = (init_format_annotation(), __toCommonJS(format_annotation_exports).default);
  	var metadata = (init_meta_data(), __toCommonJS(meta_data_exports).default);
  	var validation = (init_validation(), __toCommonJS(validation_exports).default);
  	var META_SUPPORT_DATA = ["/properties"];
  	function addMetaSchema2020($data) {
  		[
  			metaSchema,
  			applicator,
  			unevaluated,
  			content,
  			core,
  			with$data(this, format),
  			metadata,
  			with$data(this, validation)
  		].forEach((sch) => this.addMetaSchema(sch, void 0, false));
  		return this;
  		function with$data(ajv, sch) {
  			return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
  		}
  	}
  	exports.default = addMetaSchema2020;
  }));
  var require__2020 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
  	var core_1 = require_core$1();
  	var draft2020_1 = require_draft2020();
  	var discriminator_1 = require_discriminator();
  	var json_schema_2020_12_1 = require_json_schema_2020_12();
  	var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
  	var Ajv2020 = class extends core_1.default {
  		constructor(opts = {}) {
  			super({
  				...opts,
  				dynamicRef: true,
  				next: true,
  				unevaluated: true
  			});
  		}
  		_addVocabularies() {
  			super._addVocabularies();
  			draft2020_1.default.forEach((v) => this.addVocabulary(v));
  			if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
  		}
  		_addDefaultMetaSchema() {
  			super._addDefaultMetaSchema();
  			const { $data, meta } = this.opts;
  			if (!meta) return;
  			json_schema_2020_12_1.default.call(this, $data);
  			this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
  		}
  		defaultMeta() {
  			return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
  		}
  	};
  	exports.Ajv2020 = Ajv2020;
  	module.exports = exports = Ajv2020;
  	module.exports.Ajv2020 = Ajv2020;
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = Ajv2020;
  	var validate_1 = require_validate();
  	Object.defineProperty(exports, "KeywordCxt", {
  		enumerable: true,
  		get: function() {
  			return validate_1.KeywordCxt;
  		}
  	});
  	var codegen_1 = require_codegen();
  	Object.defineProperty(exports, "_", {
  		enumerable: true,
  		get: function() {
  			return codegen_1._;
  		}
  	});
  	Object.defineProperty(exports, "str", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.str;
  		}
  	});
  	Object.defineProperty(exports, "stringify", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.stringify;
  		}
  	});
  	Object.defineProperty(exports, "nil", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.nil;
  		}
  	});
  	Object.defineProperty(exports, "Name", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.Name;
  		}
  	});
  	Object.defineProperty(exports, "CodeGen", {
  		enumerable: true,
  		get: function() {
  			return codegen_1.CodeGen;
  		}
  	});
  	var validation_error_1 = require_validation_error();
  	Object.defineProperty(exports, "ValidationError", {
  		enumerable: true,
  		get: function() {
  			return validation_error_1.default;
  		}
  	});
  	var ref_error_1 = require_ref_error();
  	Object.defineProperty(exports, "MissingRefError", {
  		enumerable: true,
  		get: function() {
  			return ref_error_1.default;
  		}
  	});
  }));
  var require_formats = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
  	function fmtDef(validate, compare) {
  		return {
  			validate,
  			compare
  		};
  	}
  	exports.fullFormats = {
  		date: fmtDef(date, compareDate),
  		time: fmtDef(time, compareTime),
  		"date-time": fmtDef(date_time, compareDateTime),
  		duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
  		uri,
  		"uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
  		"uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
  		url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
  		email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
  		hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
  		ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  		ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
  		regex,
  		uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
  		"json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
  		"json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
  		"relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
  		byte,
  		int32: {
  			type: "number",
  			validate: validateInt32
  		},
  		int64: {
  			type: "number",
  			validate: validateInt64
  		},
  		float: {
  			type: "number",
  			validate: validateNumber
  		},
  		double: {
  			type: "number",
  			validate: validateNumber
  		},
  		password: true,
  		binary: true
  	};
  	exports.fastFormats = {
  		...exports.fullFormats,
  		date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
  		time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareTime),
  		"date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
  		uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
  		"uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
  		email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  	};
  	exports.formatNames = Object.keys(exports.fullFormats);
  	function isLeapYear(year) {
  		return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  	}
  	var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  	var DAYS = [
  		0,
  		31,
  		28,
  		31,
  		30,
  		31,
  		30,
  		31,
  		31,
  		30,
  		31,
  		30,
  		31
  	];
  	function date(str) {
  		const matches = DATE.exec(str);
  		if (!matches) return false;
  		const year = +matches[1];
  		const month = +matches[2];
  		const day = +matches[3];
  		return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
  	}
  	function compareDate(d1, d2) {
  		if (!(d1 && d2)) return void 0;
  		if (d1 > d2) return 1;
  		if (d1 < d2) return -1;
  		return 0;
  	}
  	var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
  	function time(str, withTimeZone) {
  		const matches = TIME.exec(str);
  		if (!matches) return false;
  		const hour = +matches[1];
  		const minute = +matches[2];
  		const second = +matches[3];
  		const timeZone = matches[5];
  		return (hour <= 23 && minute <= 59 && second <= 59 || hour === 23 && minute === 59 && second === 60) && (!withTimeZone || timeZone !== "");
  	}
  	function compareTime(t1, t2) {
  		if (!(t1 && t2)) return void 0;
  		const a1 = TIME.exec(t1);
  		const a2 = TIME.exec(t2);
  		if (!(a1 && a2)) return void 0;
  		t1 = a1[1] + a1[2] + a1[3] + (a1[4] || "");
  		t2 = a2[1] + a2[2] + a2[3] + (a2[4] || "");
  		if (t1 > t2) return 1;
  		if (t1 < t2) return -1;
  		return 0;
  	}
  	var DATE_TIME_SEPARATOR = /t|\s/i;
  	function date_time(str) {
  		const dateTime = str.split(DATE_TIME_SEPARATOR);
  		return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1], true);
  	}
  	function compareDateTime(dt1, dt2) {
  		if (!(dt1 && dt2)) return void 0;
  		const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
  		const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
  		const res = compareDate(d1, d2);
  		if (res === void 0) return void 0;
  		return res || compareTime(t1, t2);
  	}
  	var NOT_URI_FRAGMENT = /\/|:/;
  	var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  	function uri(str) {
  		return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  	}
  	var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  	function byte(str) {
  		BYTE.lastIndex = 0;
  		return BYTE.test(str);
  	}
  	var MIN_INT32 = -(2 ** 31);
  	var MAX_INT32 = 2 ** 31 - 1;
  	function validateInt32(value) {
  		return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  	}
  	function validateInt64(value) {
  		return Number.isInteger(value);
  	}
  	function validateNumber() {
  		return true;
  	}
  	var Z_ANCHOR = /[^\\]\\Z/;
  	function regex(str) {
  		if (Z_ANCHOR.test(str)) return false;
  		try {
  			new RegExp(str);
  			return true;
  		} catch (e) {
  			return false;
  		}
  	}
  }));
  var require_limit = /* @__PURE__ */ __commonJSMin(((exports) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.formatLimitDefinition = void 0;
  	var ajv_1 = require_ajv();
  	var codegen_1 = require_codegen();
  	var ops = codegen_1.operators;
  	var KWDs = {
  		formatMaximum: {
  			okStr: "<=",
  			ok: ops.LTE,
  			fail: ops.GT
  		},
  		formatMinimum: {
  			okStr: ">=",
  			ok: ops.GTE,
  			fail: ops.LT
  		},
  		formatExclusiveMaximum: {
  			okStr: "<",
  			ok: ops.LT,
  			fail: ops.GTE
  		},
  		formatExclusiveMinimum: {
  			okStr: ">",
  			ok: ops.GT,
  			fail: ops.LTE
  		}
  	};
  	exports.formatLimitDefinition = {
  		keyword: Object.keys(KWDs),
  		type: "string",
  		schemaType: "string",
  		$data: true,
  		error: {
  			message: ({ keyword, schemaCode }) => codegen_1.str`should be ${KWDs[keyword].okStr} ${schemaCode}`,
  			params: ({ keyword, schemaCode }) => codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
  		},
  		code(cxt) {
  			const { gen, data, schemaCode, keyword, it } = cxt;
  			const { opts, self } = it;
  			if (!opts.validateFormats) return;
  			const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
  			if (fCxt.$data) validate$DataFormat();
  			else validateFormat();
  			function validate$DataFormat() {
  				const fmts = gen.scopeValue("formats", {
  					ref: self.formats,
  					code: opts.code.formats
  				});
  				const fmt = gen.const("fmt", codegen_1._`${fmts}[${fCxt.schemaCode}]`);
  				cxt.fail$data(codegen_1.or(codegen_1._`typeof ${fmt} != "object"`, codegen_1._`${fmt} instanceof RegExp`, codegen_1._`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
  			}
  			function validateFormat() {
  				const format = fCxt.schema;
  				const fmtDef = self.formats[format];
  				if (!fmtDef || fmtDef === true) return;
  				if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
  				const fmt = gen.scopeValue("formats", {
  					key: format,
  					ref: fmtDef,
  					code: opts.code.formats ? codegen_1._`${opts.code.formats}${codegen_1.getProperty(format)}` : void 0
  				});
  				cxt.fail$data(compareCode(fmt));
  			}
  			function compareCode(fmt) {
  				return codegen_1._`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
  			}
  		},
  		dependencies: ["format"]
  	};
  	var formatLimitPlugin = (ajv) => {
  		ajv.addKeyword(exports.formatLimitDefinition);
  		return ajv;
  	};
  	exports.default = formatLimitPlugin;
  }));
  var require_dist = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  	Object.defineProperty(exports, "__esModule", { value: true });
  	var formats_1 = require_formats();
  	var limit_1 = require_limit();
  	var codegen_1 = require_codegen();
  	var fullName = new codegen_1.Name("fullFormats");
  	var fastName = new codegen_1.Name("fastFormats");
  	var formatsPlugin = (ajv, opts = { keywords: true }) => {
  		if (Array.isArray(opts)) {
  			addFormats(ajv, opts, formats_1.fullFormats, fullName);
  			return ajv;
  		}
  		const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
  		addFormats(ajv, opts.formats || formats_1.formatNames, formats, exportName);
  		if (opts.keywords) limit_1.default(ajv);
  		return ajv;
  	};
  	formatsPlugin.get = (name, mode = "full") => {
  		const f = (mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats)[name];
  		if (!f) throw new Error(`Unknown format "${name}"`);
  		return f;
  	};
  	function addFormats(ajv, list, fs, exportName) {
  		var _a;
  		var _b;
  		(_a = (_b = ajv.opts.code).formats) !== null && _a !== void 0 || (_b.formats = codegen_1._`require("ajv-formats/dist/formats").${exportName}`);
  		for (const f of list) ajv.addFormat(f, fs[f]);
  	}
  	module.exports = exports = formatsPlugin;
  	Object.defineProperty(exports, "__esModule", { value: true });
  	exports.default = formatsPlugin;
  }));
  var import_ajv = require_ajv();
  var import__2020 = require__2020();
  var import_dist = /* @__PURE__ */ __toESM(require_dist(), 1);
  var import_fast_uri = /* @__PURE__ */ __toESM(require_fast_uri(), 1);
  var DIALECT_07 = "http://json-schema.org/draft-07/schema#";
  var DIALECT_2020 = "https://json-schema.org/draft/2020-12/schema";
  var { parse, resolve, normalize: normalize$1 } = import_fast_uri.default;
  var maps = [
  	"$defs",
  	"definitions",
  	"properties",
  	"patternProperties",
  	"dependentSchemas",
  	"dependencies"
  ];
  var singles = [
  	"additionalProperties",
  	"additionalItems",
  	"contains",
  	"propertyNames",
  	"not",
  	"if",
  	"then",
  	"else",
  	"unevaluatedProperties",
  	"unevaluatedItems",
  	"contentSchema"
  ];
  var arrays = [
  	"allOf",
  	"anyOf",
  	"oneOf",
  	"prefixItems"
  ];
  var BundleError = class extends Error {
  	constructor(code) {
  		super("Invalid schema bundle.");
  		this.code = code;
  	}
  };
  function fail(code) {
  	throw new BundleError(code);
  }
  var ownString = (value, name) => {
  	const descriptor = Object.getOwnPropertyDescriptor(value, name);
  	return descriptor && "value" in descriptor && typeof descriptor.value === "string" ? descriptor.value : void 0;
  };
  var freezeIdentity = (identity) => Object.freeze({ ...identity });
  function scopeFor(value) {
  	const fallback = freezeIdentity({
  		ownerId: "unknown",
  		contractId: "unknown",
  		revision: "unknown",
  		variantId: "default"
  	});
  	try {
  		if (!isJsonRecord(value)) return Object.freeze({ identity: fallback });
  		const descriptor = Object.getOwnPropertyDescriptor(value, "identity");
  		const id = descriptor && "value" in descriptor ? descriptor.value : null;
  		if (!isJsonRecord(id)) return Object.freeze({ identity: fallback });
  		const ownerId = ownString(id, "ownerId"), contractId = ownString(id, "contractId");
  		const revision = ownString(id, "revision"), variantId = ownString(id, "variantId");
  		if (ownerId === void 0 || contractId === void 0 || revision === void 0 || variantId === void 0) return Object.freeze({ identity: fallback });
  		return Object.freeze({ identity: freezeIdentity({
  			ownerId,
  			contractId,
  			revision,
  			variantId
  		}) });
  	} catch (_a) {
  		return Object.freeze({ identity: fallback });
  	}
  }
  function dialectFor(uri) {
  	if (typeof uri !== "string") return void 0;
  	const canonical = uri.replace(/#$/, "").replace(/^https:/, "http:");
  	if (canonical === "http://json-schema.org/draft-07/schema") return "draft-07";
  	if (canonical === "http://json-schema.org/draft/2020-12/schema") return "2020-12";
  }
  var normalizeUri = (uri) => normalize$1(uri).replace(/#$/, "");
  function absoluteUri(uri, fragments) {
  	if (typeof uri !== "string" || !uri) return fail("resource-invalid");
  	const parsed = parse(uri);
  	if (parsed.error || !parsed.scheme || !fragments && parsed.fragment !== void 0) return fail("resource-invalid");
  	return normalizeUri(uri);
  }
  function referenceKey(value) {
  	var _a;
  	if (!isJsonRecord(value) || typeof value.repository !== "string" || typeof value.path !== "string") return fail("artifact-role-invalid");
  	for (const key of [
  		"symbol",
  		"version",
  		"sha256"
  	]) if (key in value && typeof value[key] !== "string") return fail("artifact-role-invalid");
  	return JSON.stringify([
  		value.repository,
  		value.path,
  		(_a = value.symbol) !== null && _a !== void 0 ? _a : null
  	]);
  }
  /** Check declared provenance only; paths and retrieval URIs are never fetched. */
  function validateArtifacts(bundle) {
  	const provenance = bundle.provenance;
  	if (!isJsonRecord(provenance)) fail("artifact-role-invalid");
  	const roles = /* @__PURE__ */ new Map();
  	for (const role of [
  		"canonicalSources",
  		"generatedFiles",
  		"referenceSchemas",
  		"generationSources"
  	]) {
  		const refs = provenance[role];
  		if (!Array.isArray(refs) || role === "canonicalSources" && refs.length === 0) fail("artifact-role-invalid");
  		for (const ref of refs) {
  			const key = referenceKey(ref);
  			if (roles.has(key)) fail("artifact-role-invalid");
  			roles.set(key, role);
  		}
  	}
  	for (const resource of [bundle.root, ...bundle.resources]) {
  		if (!isJsonRecord(resource) || !isJsonRecord(resource.artifact)) fail("artifact-role-invalid");
  		const artifact = resource.artifact;
  		const key = referenceKey(artifact.source);
  		if (artifact.role === "canonical-schema") {
  			if (roles.get(key) !== "canonicalSources") fail("artifact-role-invalid");
  		} else if (artifact.role === "generated-schema") {
  			if (roles.get(key) !== "generatedFiles" || !Array.isArray(artifact.generatedFrom) || !artifact.generatedFrom.length) fail("artifact-role-invalid");
  			for (const ref of artifact.generatedFrom) if (roles.get(referenceKey(ref)) !== "canonicalSources") fail("artifact-role-invalid");
  		} else fail("artifact-role-invalid");
  	}
  }
  function prepare(bundle, ajv) {
  	const registry = /* @__PURE__ */ new Map();
  	const nodes = [];
  	const register = (id, location) => {
  		const key = normalizeUri(id), previous = registry.get(key);
  		if (previous !== void 0 && previous !== location) fail("resource-id-conflict");
  		registry.set(key, location);
  	};
  	const resources = [];
  	const walk = (node, base, location) => {
  		if (typeof node === "boolean") return;
  		if (!isJsonRecord(node)) return;
  		if ("$schema" in node) {
  			const dialect = dialectFor(node.$schema);
  			if (!dialect) fail("dialect-unsupported");
  			if (dialect !== bundle.dialect) fail("dialect-conflict");
  			node.$schema = dialect === "draft-07" ? DIALECT_07 : DIALECT_2020;
  		}
  		if ("$id" in node) {
  			if (typeof node.$id !== "string") fail("schema-invalid");
  			base = absoluteUri(resolve(base, node.$id), true);
  			register(base, location);
  			node.$id = base;
  		}
  		for (const key of ["$anchor", "$dynamicAnchor"]) if (typeof node[key] === "string") register(`${base.replace(/#.*$/, "")}#${node[key]}`, location);
  		nodes.push({
  			node,
  			base
  		});
  		if (node.$async === true) fail("schema-invalid");
  		if (typeof node.format === "string" && !ajv.formats[node.format]) fail("schema-invalid");
  		for (const key of maps) if (isJsonRecord(node[key])) {
  			for (const [name, child] of Object.entries(node[key])) if (typeof child === "boolean" || isJsonRecord(child)) walk(child, base, appendPointer(appendPointer(location, key), name));
  		}
  		for (const key of singles) if (typeof node[key] === "boolean" || isJsonRecord(node[key])) walk(node[key], base, `${location}/${key}`);
  		for (const key of [...arrays, "items"]) {
  			const children = node[key];
  			if (Array.isArray(children)) children.forEach((child, index) => walk(child, base, `${location}/${key}/${index}`));
  			else if (key === "items" && (typeof children === "boolean" || isJsonRecord(children))) walk(children, base, `${location}/${key}`);
  		}
  	};
  	const supplied = [bundle.root, ...bundle.resources];
  	for (let index = 0; index < supplied.length; index++) {
  		const resource = supplied[index];
  		if (!isJsonRecord(resource) || typeof resource.document !== "boolean" && !isJsonRecord(resource.document)) fail("resource-invalid");
  		const uri = absoluteUri(resource.retrievalUri, false);
  		register(uri, `${index}`);
  		walk(resource.document, uri, `${index}`);
  		resources.push({
  			uri,
  			document: resource.document
  		});
  	}
  	for (const { node, base } of nodes) if (typeof node.$ref === "string") {
  		const absolute = normalizeUri(resolve(base, node.$ref));
  		let location = registry.get(absolute);
  		if (location === void 0) {
  			const hash = absolute.indexOf("#");
  			const resource = registry.get(hash < 0 ? absolute : absolute.slice(0, hash));
  			const fragment = hash < 0 ? "" : decodeURIComponent(absolute.slice(hash + 1));
  			if (resource !== void 0 && (fragment === "" || fragment.startsWith("/"))) location = resource + fragment;
  		}
  		if (location !== void 0) {
  			const slash = location.indexOf("/");
  			node.$ref = resources[Number(slash < 0 ? location : location.slice(0, slash))].uri + "#" + encodeURIComponent(slash < 0 ? "" : location.slice(slash)).replace(/%2F/g, "/");
  		} else node.$ref = absolute.includes("#") ? absolute : absolute + "#";
  	}
  	return {
  		root: resources[0].uri,
  		resources,
  		registry,
  		nodes
  	};
  }
  function structuralDiagnostics(errors, scope, rootUri) {
  	return Object.freeze(errors.map((error) => {
  		let dataPath = error.instancePath;
  		if (error.keyword === "required" && typeof error.params.missingProperty === "string") dataPath = appendPointer(dataPath, error.params.missingProperty);
  		if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") dataPath = appendPointer(dataPath, error.params.additionalProperty);
  		const hash = error.schemaPath.indexOf("#");
  		const resourceUri = hash > 0 ? error.schemaPath.slice(0, hash) : rootUri;
  		const schemaPath = decodeURIComponent(hash >= 0 ? error.schemaPath.slice(hash + 1) : error.schemaPath);
  		return Object.freeze({
  			scope,
  			phase: "structure",
  			code: "schema-data-invalid",
  			dataPath,
  			schemaPath,
  			resourceUri,
  			keyword: error.keyword
  		});
  	}));
  }
  function makeValidator(validate, scope, dialect, rootUri) {
  	return Object.freeze({
  		identity: scope.identity,
  		dialect,
  		validate(data, context) {
  			var _a;
  			let currentScope = scope;
  			try {
  				if (context !== void 0) {
  					if (!isJsonRecord(context)) throw new Error();
  					const consumerId = ownString(context, "consumerId");
  					if (consumerId === void 0) throw new Error();
  					currentScope = Object.freeze({
  						...scope,
  						consumerId
  					});
  				}
  				if (validate(snapshotJson(data))) return Object.freeze({
  					kind: "valid",
  					diagnostics: Object.freeze([])
  				});
  				const diagnostics = structuralDiagnostics((_a = validate.errors) !== null && _a !== void 0 ? _a : [], currentScope, rootUri);
  				if (!diagnostics.length) throw new Error();
  				return Object.freeze({
  					kind: "invalid",
  					diagnostics
  				});
  			} catch (error) {
  				if (error instanceof JsonSnapshotError && error.kind === "invalid") return Object.freeze({
  					kind: "invalid",
  					diagnostics: Object.freeze([Object.freeze({
  						scope: currentScope,
  						phase: "structure",
  						code: "input-not-json",
  						dataPath: error.dataPath
  					})])
  				});
  				return Object.freeze({
  					kind: "execution-error",
  					diagnostics: Object.freeze([Object.freeze({
  						scope: currentScope,
  						phase: "execution",
  						operation: "structure",
  						code: error instanceof JsonSnapshotError && error.kind === "limit" || error instanceof RangeError ? "limit-exceeded" : "engine-failed"
  					})])
  				});
  			}
  		}
  	});
  }
  /** Compile an isolated synchronous validator from an immutable private snapshot. */
  function compileSchemaBundle(input) {
  	const scope = scopeFor(input);
  	try {
  		if (!isJsonRecord(input)) fail("resource-invalid");
  		const declaredDialect = Object.getOwnPropertyDescriptor(input, "dialect");
  		if (!declaredDialect || "value" in declaredDialect && declaredDialect.value === void 0) fail("dialect-required");
  		if (!("value" in declaredDialect)) fail("resource-invalid");
  		if (declaredDialect.value !== "draft-07" && declaredDialect.value !== "2020-12") fail("dialect-unsupported");
  		const candidate = snapshotJson(input);
  		if (!isJsonRecord(candidate) || !isJsonRecord(candidate.identity)) fail("resource-invalid");
  		for (const key of [
  			"ownerId",
  			"contractId",
  			"revision",
  			"variantId"
  		]) if (typeof candidate.identity[key] !== "string") fail("resource-invalid");
  		if (!candidate.dialect) fail("dialect-required");
  		if (candidate.dialect !== "draft-07" && candidate.dialect !== "2020-12") fail("dialect-unsupported");
  		if (!Array.isArray(candidate.resources) || !isJsonRecord(candidate.root)) fail("resource-invalid");
  		const bundle = candidate;
  		validateArtifacts(bundle);
  		const options = {
  			allErrors: true,
  			coerceTypes: false,
  			useDefaults: false,
  			removeAdditional: false,
  			strict: false,
  			logger: false,
  			ownProperties: true
  		};
  		const ajv = bundle.dialect === "draft-07" ? new import_ajv.Ajv(options) : new import__2020.Ajv2020(options);
  		import_dist.default.default(ajv);
  		const prepared = prepare(bundle, ajv);
  		for (const resource of prepared.resources) {
  			if (!ajv.validateSchema(resource.document)) fail("schema-invalid");
  			ajv.addSchema(resource.document, resource.uri);
  		}
  		const validate = ajv.getSchema(prepared.root);
  		if (!validate || "$async" in validate && validate.$async) fail("schema-invalid");
  		return Object.freeze({
  			kind: "compiled",
  			validator: makeValidator(validate, scope, bundle.dialect, prepared.root),
  			diagnostics: Object.freeze([])
  		});
  	} catch (error) {
  		let code;
  		if (error instanceof BundleError) code = error.code;
  		else if (error instanceof import_ajv.MissingRefError) code = "ref-unresolved";
  		else if (error instanceof JsonSnapshotError && error.kind === "invalid") code = "resource-invalid";
  		else if (error instanceof SyntaxError) code = "schema-invalid";
  		if (code) return Object.freeze({
  			kind: "schema-error",
  			diagnostics: Object.freeze([Object.freeze({
  				scope,
  				phase: "compile",
  				code
  			})])
  		});
  		return Object.freeze({
  			kind: "execution-error",
  			diagnostics: Object.freeze([Object.freeze({
  				scope,
  				phase: "execution",
  				operation: "compile",
  				code: error instanceof JsonSnapshotError && error.kind === "limit" || error instanceof RangeError ? "limit-exceeded" : "engine-failed"
  			})])
  		});
  	}
  }
  var numberToken = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/u;
  var invalidNumber = Object.freeze({
  	kind: "invalid",
  	code: "fixed-number-input-invalid"
  });
  /**
  * Parse a NEW numeric draft according to NP-finite-new-input-v1.
  * Never apply this to opening/no-op raw values or use it as an owner validator.
  * Keep the validated token so negative zero, precision and exponent spelling survive.
  */
  function parseFixedNumberInput(input) {
  	if (typeof input === "number") {
  		if (!Number.isFinite(input)) return invalidNumber;
  		return Object.freeze({
  			kind: "valid",
  			token: Object.is(input, -0) ? "-0" : String(input),
  			value: input
  		});
  	}
  	if (typeof input !== "string") return invalidNumber;
  	const token = input.trim();
  	if (!numberToken.test(token)) return invalidNumber;
  	const value = Number(token);
  	return Number.isFinite(value) ? Object.freeze({
  		kind: "valid",
  		token,
  		value
  	}) : invalidNumber;
  }
  var block_editor_fixed_inputs_schema_default = {
  	$schema: "https://json-schema.org/draft/2020-12/schema",
  	$id: "https://kubohiroya.github.io/turbowarp-time-space-sync/schemas/block-editor-fixed-inputs.schema.json",
  	$defs: {
  		"startOpticalTimeDecoder": {
  			"type": "object",
  			"properties": {
  				"SECONDS": {
  					"type": "number",
  					"maximum": 60
  				},
  				"REFRESH_US": { "type": "number" }
  			},
  			"additionalProperties": false
  		},
  		"calibrateOpticalTimeDecoder": {
  			"type": "object",
  			"properties": { "SECONDS": {
  				"type": "number",
  				"maximum": 60
  			} },
  			"additionalProperties": false
  		},
  		"measurePatternCorners": {
  			"type": "object",
  			"properties": { "SECONDS": {
  				"type": "number",
  				"minimum": 1,
  				"maximum": 60
  			} },
  			"additionalProperties": false
  		},
  		"patternReferenceJson": {
  			"type": "object",
  			"properties": {
  				"SIGMA_METERS": {
  					"type": "number",
  					"minimum": 0
  				},
  				"MEASURED_BY": {
  					"type": "string",
  					"enum": [
  						"tape",
  						"laser",
  						"nominal"
  					]
  				}
  			},
  			"additionalProperties": false
  		}
  	}
  };
  /** Canonical fixed field fragments; URI is identity only, never fetched. */
  function fixedInputBundle(opcode, argument) {
  	const source = {
  		repository: "turbowarp-time-space-sync",
  		path: "schemas/block-editor-fixed-inputs.schema.json",
  		symbol: `#/$defs/${opcode}/properties/${argument}`
  	};
  	const definitions = block_editor_fixed_inputs_schema_default.$defs;
  	return {
  		identity: {
  			ownerId: "turbowarp-time-space-sync",
  			contractId: "fixed-inputs",
  			revision: "1",
  			variantId: opcode + "." + argument
  		},
  		dialect: "2020-12",
  		root: {
  			retrievalUri: block_editor_fixed_inputs_schema_default.$id,
  			document: definitions[opcode].properties[argument],
  			artifact: {
  				role: "canonical-schema",
  				source
  			}
  		},
  		resources: [],
  		provenance: {
  			canonicalSources: [source, ...[
  				{
  					"repository": "turbowarp-time-space-sync",
  					"path": "src/contracts/placement.ts",
  					"symbol": "placementReferenceDefinition / referenceDefinitionIssues"
  				},
  				{
  					"repository": "turbowarp-time-space-sync",
  					"path": "src/placement/pattern-reference.ts",
  					"symbol": "buildPatternReference"
  				},
  				{
  					"repository": "turbowarp-time-space-sync",
  					"path": "src/optical-time/controller.ts",
  					"symbol": "start displayRefreshUs predicate"
  				}
  			]],
  			generatedFiles: [{
  				repository: "turbowarp-time-space-sync",
  				path: "docs/schemas/block-editor-fixed-inputs.schema.json"
  			}],
  			generationSources: [{
  				repository: "turbowarp-time-space-sync",
  				path: "scripts/generate-fixed-input-docs.mjs"
  			}],
  			referenceSchemas: []
  		}
  	};
  }
  var invalid = () => [{ message: "Invalid fixed input." }];
  function number(value) {
  	if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && value.trim() === "") throw new TypeError("Unrepresentable numeric literal.");
  	const result = Number(value);
  	if (!Number.isFinite(result)) throw new TypeError("Nonfinite numeric literal.");
  	return result;
  }
  function snapshotNumber(snapshot, argument) {
  	const slot = snapshot.arguments[argument];
  	if (slot?.kind !== "literal") throw new TypeError("A related literal is required.");
  	return number(slot.value);
  }
  function snapshotText(snapshot, argument) {
  	const slot = snapshot.arguments[argument];
  	if (slot?.kind !== "literal" || typeof slot.value !== "string") throw new TypeError("A related literal is required.");
  	return slot.value.trim();
  }
  function numericBinding(opcode, argument) {
  	return {
  		argument,
  		schemaBundle: fixedInputBundle(opcode, argument),
  		control: {
  			label: argument,
  			kind: "number"
  		},
  		read: number,
  		encode(value) {
  			const parsed = parseFixedNumberInput(value);
  			if (parsed.kind !== "valid") throw new TypeError("Invalid numeric token.");
  			return parsed.token;
  		},
  		validateCandidate(candidate, _context, finalSnapshot) {
  			try {
  				number(candidate);
  				return ownerCheck(opcode, argument, candidate, finalSnapshot) ? [] : invalid();
  			} catch {
  				return invalid();
  			}
  		}
  	};
  }
  function enumBinding(opcode, argument, choices, normalization) {
  	const project = (value) => {
  		if (typeof value !== "string") return value;
  		const normalized = normalization === "none" ? value : normalization === "trim" ? value.trim() : value.trim().toLowerCase();
  		return choices.includes(normalized) ? normalized : value;
  	};
  	return {
  		argument,
  		schemaBundle: fixedInputBundle(opcode, argument),
  		control: {
  			label: argument,
  			kind: "enum",
  			choices: choices.map((value) => ({ value }))
  		},
  		read: project,
  		encode(value) {
  			if (typeof value !== "string" || !choices.includes(value)) throw new TypeError("Choose a known value.");
  			return value;
  		},
  		validateCandidate(candidate, _context, finalSnapshot) {
  			try {
  				return typeof candidate === "string" && choices.includes(candidate) && ownerCheck(opcode, argument, candidate, finalSnapshot) ? [] : invalid();
  			} catch {
  				return invalid();
  			}
  		}
  	};
  }
  function ownerCheck(opcode, argument, candidate, snapshot) {
  	if (argument === "REFRESH_US") {
  		const rounded = Math.round(number(candidate));
  		return Number.isFinite(rounded) && rounded > 0;
  	}
  	if (opcode === "patternReferenceJson" && (argument === "SIGMA_METERS" || argument === "MEASURED_BY")) {
  		const sigma = argument === "SIGMA_METERS" ? number(candidate) : snapshotNumber(snapshot, "SIGMA_METERS");
  		const measuredBy = argument === "MEASURED_BY" ? String(candidate).trim() : snapshotText(snapshot, "MEASURED_BY");
  		return sigma >= 0 && [
  			"tape",
  			"laser",
  			"nominal"
  		].includes(measuredBy) && (measuredBy !== "nominal" || sigma > 0);
  	}
  	return true;
  }
  var extensionId = "kubohiroyatimespacesync";
  var validationContext = () => ({
  	consumerId: "turbowarp-time-space-sync",
  	nowMs: 0,
  	settings: null
  });
  var fixedInputEditors = [
  	{
  		apiVersion: 1,
  		extensionId,
  		editorId: "startOpticalTimeDecoder-fixed",
  		opcodes: [`${extensionId}_startOpticalTimeDecoder`],
  		contractId: "turbowarp-time-space-sync/startOpticalTimeDecoder",
  		contractRevision: "1",
  		validationContext,
  		readOnlyArguments: [],
  		bindings: [numericBinding("startOpticalTimeDecoder", "SECONDS"), numericBinding("startOpticalTimeDecoder", "REFRESH_US")]
  	},
  	{
  		apiVersion: 1,
  		extensionId,
  		editorId: "calibrateOpticalTimeDecoder-fixed",
  		opcodes: [`${extensionId}_calibrateOpticalTimeDecoder`],
  		contractId: "turbowarp-time-space-sync/calibrateOpticalTimeDecoder",
  		contractRevision: "1",
  		validationContext,
  		readOnlyArguments: [],
  		bindings: [numericBinding("calibrateOpticalTimeDecoder", "SECONDS")]
  	},
  	{
  		apiVersion: 1,
  		extensionId,
  		editorId: "measurePatternCorners-fixed",
  		opcodes: [`${extensionId}_measurePatternCorners`],
  		contractId: "turbowarp-time-space-sync/measurePatternCorners",
  		contractRevision: "1",
  		validationContext,
  		readOnlyArguments: [],
  		bindings: [numericBinding("measurePatternCorners", "SECONDS")]
  	},
  	{
  		apiVersion: 1,
  		extensionId,
  		editorId: "patternReferenceJson-fixed",
  		opcodes: [`${extensionId}_patternReferenceJson`],
  		contractId: "turbowarp-time-space-sync/patternReferenceJson",
  		contractRevision: "1",
  		validationContext,
  		readOnlyArguments: [],
  		bindings: [numericBinding("patternReferenceJson", "SIGMA_METERS"), enumBinding("patternReferenceJson", "MEASURED_BY", [
  			"tape",
  			"laser",
  			"nominal"
  		], "trim")]
  	}
  ];
  /** Register metadata only; the GUI startup capability owns editor activation. */
  function registerFixedInputEditors(scratch, definitions, runtimeOverride) {
  	const host = scratch;
  	const api = host?.gui?.blockEditors;
  	if (!definitions.length || api?.apiVersion !== 1 || typeof api.registerFixedInputEditor !== "function") return () => {};
  	const runtime = runtimeOverride ?? host?.vm?.runtime;
  	const removers = [];
  	let active = true;
  	const dispose = () => {
  		if (!active) return;
  		active = false;
  		runtime?.off?.("RUNTIME_DISPOSED", dispose);
  		for (const remove of removers.splice(0).reverse()) remove();
  	};
  	try {
  		for (const definition of definitions) {
  			const remove = api.registerFixedInputEditor.call(api, definition);
  			if (typeof remove !== "function") throw new TypeError("Invalid fixed input registration disposer.");
  			removers.push(remove);
  		}
  		runtime?.on?.("RUNTIME_DISPOSED", dispose);
  	} catch (error) {
  		dispose();
  		throw error;
  	}
  	return dispose;
  }
  function deepFreeze(value) {
  	if (value !== null && typeof value === "object") {
  		Object.values(value).forEach(deepFreeze);
  		Object.freeze(value);
  	}
  	return value;
  }
  function ownerFailure(scope, code) {
  	return Object.freeze({
  		kind: "execution-error",
  		diagnostics: Object.freeze([Object.freeze({
  			scope,
  			phase: "execution",
  			operation: "semantic",
  			code
  		})])
  	});
  }
  function asyncResult(value) {
  	try {
  		Promise.prototype.then.call(value, () => void 0, () => void 0);
  		return true;
  	} catch (_a) {}
  	return "then" in value;
  }
  /** Validate one protected candidate/context snapshot, then invoke a synchronous owner at most once. */
  function validateSchemaInput(compiled, data, options) {
  	let scope = scopeFor(compiled);
  	let context;
  	let owner;
  	try {
  		if (!isJsonRecord(options)) return ownerFailure(scope, "owner-context-invalid");
  		const descriptor = Object.getOwnPropertyDescriptor(options, "context");
  		if (!descriptor || !("value" in descriptor)) return ownerFailure(scope, "owner-context-invalid");
  		const candidate = snapshotJson(descriptor.value);
  		if (!isJsonRecord(candidate) || typeof candidate.consumerId !== "string" || typeof candidate.nowMs !== "number" || !Number.isFinite(candidate.nowMs) || !Object.hasOwn(candidate, "settings")) return ownerFailure(scope, "owner-context-invalid");
  		context = deepFreeze(candidate);
  		scope = Object.freeze({
  			...scope,
  			consumerId: context.consumerId
  		});
  		const ownerDescriptor = Object.getOwnPropertyDescriptor(options, "ownerValidate");
  		if (ownerDescriptor && !("value" in ownerDescriptor)) return ownerFailure(scope, "owner-result-invalid");
  		owner = ownerDescriptor === null || ownerDescriptor === void 0 ? void 0 : ownerDescriptor.value;
  		if (owner !== void 0 && typeof owner !== "function") return ownerFailure(scope, "owner-result-invalid");
  	} catch (_a) {
  		return ownerFailure(scope, "owner-context-invalid");
  	}
  	let input;
  	try {
  		input = deepFreeze(snapshotJson(data));
  		const structural = compiled.validate(input, { consumerId: context.consumerId });
  		if (!isJsonRecord(structural) || !Array.isArray(structural.diagnostics) || (structural.kind === "valid" ? structural.diagnostics.length !== 0 : structural.diagnostics.length === 0) || ![
  			"valid",
  			"invalid",
  			"execution-error"
  		].includes(structural.kind)) throw new Error();
  		if (structural.kind !== "valid") return structural;
  	} catch (error) {
  		if (error instanceof JsonSnapshotError && error.kind === "invalid") return Object.freeze({
  			kind: "invalid",
  			diagnostics: Object.freeze([Object.freeze({
  				scope,
  				phase: "structure",
  				code: "input-not-json",
  				dataPath: error.dataPath
  			})])
  		});
  		return Object.freeze({
  			kind: "execution-error",
  			diagnostics: Object.freeze([Object.freeze({
  				scope,
  				phase: "execution",
  				operation: "structure",
  				code: error instanceof JsonSnapshotError && error.kind === "limit" || error instanceof RangeError ? "limit-exceeded" : "engine-failed"
  			})])
  		});
  	}
  	if (!owner) return Object.freeze({
  		kind: "valid",
  		diagnostics: Object.freeze([])
  	});
  	let result;
  	try {
  		result = owner(input, context);
  	} catch (_b) {
  		return ownerFailure(scope, "owner-validation-failed");
  	}
  	try {
  		if (result !== null && (typeof result === "object" || typeof result === "function") && asyncResult(result)) return ownerFailure(scope, "async-owner-unsupported");
  		const snapshot = snapshotJson(result);
  		if (!isJsonRecord(snapshot) || !Array.isArray(snapshot.issues)) return ownerFailure(scope, "owner-result-invalid");
  		if (snapshot.kind === "valid" && snapshot.issues.length === 0) return Object.freeze({
  			kind: "valid",
  			diagnostics: Object.freeze([])
  		});
  		if (snapshot.kind !== "invalid" || snapshot.issues.length === 0) return ownerFailure(scope, "owner-result-invalid");
  		const diagnostics = [];
  		for (const issue of snapshot.issues) {
  			if (!isJsonRecord(issue) || typeof issue.dataPath !== "string" || issue.dataPath !== "" && !issue.dataPath.startsWith("/") || /~(?:[^01]|$)/u.test(issue.dataPath) || typeof issue.ruleId !== "string") return ownerFailure(scope, "owner-result-invalid");
  			diagnostics.push(Object.freeze({
  				scope,
  				phase: "semantic",
  				code: "owner-input-invalid",
  				dataPath: issue.dataPath,
  				ruleId: issue.ruleId
  			}));
  		}
  		return Object.freeze({
  			kind: "invalid",
  			diagnostics: Object.freeze(diagnostics)
  		});
  	} catch (_c) {
  		return ownerFailure(scope, "owner-result-invalid");
  	}
  }
  var placement_reference_v1_schema_default = {
  	$schema: "https://json-schema.org/draft/2020-12/schema",
  	$id: "https://raw.githubusercontent.com/kubohiroya/turbowarp-time-space-sync/main/schemas/placement-reference-v1.schema.json",
  	title: "Placement reference, version 1",
  	type: "object",
  	additionalProperties: false,
  	required: [
  		"schema",
  		"version",
  		"referenceId",
  		"kind",
  		"points",
  		"planarityResidualMeters",
  		"rectangularityResidualMeters",
  		"measuredBy",
  		"notes"
  	],
  	properties: {
  		"schema": { "const": "twtss/placement-reference" },
  		"version": { "const": 1 },
  		"referenceId": {
  			"type": "string",
  			"minLength": 1,
  			"maxLength": 128,
  			"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  		},
  		"kind": {
  			"type": "string",
  			"enum": [
  				"screen",
  				"projection",
  				"board",
  				"custom"
  			]
  		},
  		"points": {
  			"type": "array",
  			"items": {
  				"type": "object",
  				"additionalProperties": false,
  				"required": [
  					"id",
  					"x",
  					"y",
  					"z",
  					"sigmaMeters"
  				],
  				"properties": {
  					"id": {
  						"type": "string",
  						"minLength": 1,
  						"maxLength": 128,
  						"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  					},
  					"x": { "type": "number" },
  					"y": { "type": "number" },
  					"z": { "type": "number" },
  					"sigmaMeters": {
  						"type": "number",
  						"minimum": 0
  					}
  				}
  			},
  			"minItems": 4,
  			"maxItems": 1024
  		},
  		"planarityResidualMeters": {
  			"type": "number",
  			"minimum": 0
  		},
  		"rectangularityResidualMeters": {
  			"type": "number",
  			"minimum": 0
  		},
  		"measuredBy": {
  			"type": "string",
  			"enum": [
  				"tape",
  				"laser",
  				"nominal"
  			]
  		},
  		"notes": {
  			"type": "array",
  			"items": {
  				"type": "string",
  				"maxLength": 1024
  			},
  			"maxItems": 32
  		}
  	}
  };
  var placement_observation_v1_schema_default = {
  	$schema: "https://json-schema.org/draft/2020-12/schema",
  	$id: "https://raw.githubusercontent.com/kubohiroya/turbowarp-time-space-sync/main/schemas/placement-observation-v1.schema.json",
  	title: "Placement observation, version 1",
  	type: "object",
  	additionalProperties: false,
  	required: [
  		"schema",
  		"version",
  		"cameraId",
  		"referenceId",
  		"intrinsicProfileId",
  		"imagePoints",
  		"imageWidth",
  		"imageHeight",
  		"capturedAtUs",
  		"conditions"
  	],
  	properties: {
  		"schema": { "const": "twtss/placement-observation" },
  		"version": { "const": 1 },
  		"cameraId": {
  			"type": "string",
  			"minLength": 1,
  			"maxLength": 128,
  			"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  		},
  		"referenceId": {
  			"type": "string",
  			"minLength": 1,
  			"maxLength": 128,
  			"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  		},
  		"intrinsicProfileId": {
  			"type": "string",
  			"minLength": 1,
  			"maxLength": 128,
  			"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  		},
  		"imagePoints": {
  			"type": "array",
  			"items": {
  				"type": "object",
  				"additionalProperties": false,
  				"required": [
  					"id",
  					"u",
  					"v"
  				],
  				"properties": {
  					"id": {
  						"type": "string",
  						"minLength": 1,
  						"maxLength": 128,
  						"pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  					},
  					"u": {
  						"type": "number",
  						"minimum": 0
  					},
  					"v": {
  						"type": "number",
  						"minimum": 0
  					}
  				}
  			},
  			"minItems": 4,
  			"maxItems": 1024
  		},
  		"imageWidth": {
  			"type": "integer",
  			"minimum": 1
  		},
  		"imageHeight": {
  			"type": "integer",
  			"minimum": 1
  		},
  		"capturedAtUs": { "type": "integer" },
  		"conditions": {
  			"type": "object",
  			"additionalProperties": false,
  			"required": [],
  			"properties": {
  				"frameRate": {
  					"type": "number",
  					"exclusiveMinimum": 0
  				},
  				"exposureTimeUs": {
  					"type": "integer",
  					"minimum": 0
  				}
  			}
  		}
  	}
  };
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
  integer({ minimum: 0 });
  /** True when two domain readings may be compared without conversion. */
  function sameClockDomain(left, right) {
  	return left.id === right.id && left.epoch === right.epoch;
  }
  var OPTICAL_TIME_OBSERVATION_SCHEMA = "twtss/optical-time-observation";
  finite({ minimum: 0 }), finite({ minimum: 0 }), finite({ exclusiveMinimum: 0 }), finite({ exclusiveMinimum: 0 });
  finite({ exclusiveMinimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 });
  integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 1 }), finite({ minimum: 0 }), integer({ minimum: 1 }), integer({ minimum: 1 }), integer({ minimum: 0 });
  var TIME_CORRESPONDENCE_SCHEMA = "twtss/time-correspondence";
  integer({ minimum: 0 }), integer({ minimum: 0 }), integer({ minimum: 0 }), finite({
  	minimum: 0,
  	maximum: 1
  }), finite({ minimum: 0 }), finite(), finite({ minimum: 0 }), finite(), finite();
  /** True when the result still describes the present, on the observer's clock. */
  function isCurrent(result, nowUs) {
  	return nowUs < result.validUntilUs;
  }
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
  var placement_camera_model_schema_default = {
  	$schema: "https://json-schema.org/draft/2020-12/schema",
  	$id: "urn:twts:placement-camera-model",
  	type: "object",
  	required: ["intrinsics", "distortion"],
  	properties: {
  		"intrinsics": {
  			"type": "object",
  			"required": [
  				"fx",
  				"fy",
  				"cx",
  				"cy",
  				"skew"
  			],
  			"properties": {
  				"fx": {
  					"type": "number",
  					"exclusiveMinimum": 0
  				},
  				"fy": {
  					"type": "number",
  					"exclusiveMinimum": 0
  				},
  				"cx": { "type": "number" },
  				"cy": { "type": "number" },
  				"skew": { "type": "number" }
  			}
  		},
  		"distortion": {
  			"type": "object",
  			"required": ["model", "coefficients"],
  			"properties": {
  				"model": { "enum": ["none", "brown-conrady"] },
  				"coefficients": {
  					"type": "array",
  					"items": { "type": "number" }
  				}
  			},
  			"if": { "properties": { "model": { "const": "brown-conrady" } } },
  			"then": { "properties": { "coefficients": { "minItems": 4 } } }
  		},
  		"intrinsicProfileId": {
  			"type": "string",
  			"minLength": 1
  		},
  		"imageWidth": {
  			"type": "integer",
  			"minimum": 1
  		},
  		"imageHeight": {
  			"type": "integer",
  			"minimum": 1
  		}
  	}
  };
  function bundle(document, name, symbol) {
  	const canonical = {
  		repository: "turbowarp-time-space-sync",
  		path: "src/contracts/placement.ts",
  		symbol
  	};
  	const generated = {
  		repository: "turbowarp-time-space-sync",
  		path: `schemas/${name}-v1.schema.json`
  	};
  	return {
  		identity: {
  			ownerId: "turbowarp-time-space-sync",
  			contractId: name,
  			revision: "spec-v0.2.0",
  			variantId: "v1-json"
  		},
  		dialect: "2020-12",
  		root: {
  			retrievalUri: document.$id,
  			document,
  			artifact: {
  				role: "generated-schema",
  				source: generated,
  				generatedFrom: [canonical]
  			}
  		},
  		resources: [],
  		provenance: {
  			canonicalSources: [canonical],
  			generatedFiles: [generated],
  			referenceSchemas: [],
  			generationSources: [
  				{
  					repository: "turbowarp-time-space-sync",
  					path: "src/contracts/spec.ts",
  					symbol: "toJsonSchema"
  				},
  				{
  					repository: "turbowarp-time-space-sync",
  					path: "src/contracts/index.ts",
  					symbol: "publishedContracts"
  				},
  				{
  					repository: "turbowarp-time-space-sync",
  					path: "scripts/generate-schemas.ts"
  				}
  			]
  		}
  	};
  }
  var placementSchemaBundles = {
  	reference: bundle(placement_reference_v1_schema_default, "placement-reference", "referenceDefinitionSpec"),
  	observation: bundle(placement_observation_v1_schema_default, "placement-observation", "placementObservationSpec")
  };
  var validatePlacementReferenceInput = (data) => parseReferenceDefinition(data).ok ? {
  	kind: "valid",
  	issues: []
  } : {
  	kind: "invalid",
  	issues: [{
  		dataPath: "",
  		ruleId: "reference-definition-input"
  	}]
  };
  var validatePlacementObservationInput = (data) => parsePlacementObservation(data).ok ? {
  	kind: "valid",
  	issues: []
  } : {
  	kind: "invalid",
  	issues: [{
  		dataPath: "",
  		ruleId: "placement-observation-input"
  	}]
  };
  function decodePlacementSource(source, contract) {
  	return {
  		source,
  		format: "json",
  		variantId: "v1-json",
  		contract,
  		data: JSON.parse(source)
  	};
  }
  var sourceCompilations = Object.fromEntries(Object.entries(placementSchemaBundles).map(([key, bundle]) => [key, compileSchemaBundle(bundle)]));
  /** Safe source boundary: preserve raw input separately from diagnostics and normalized values. */
  function validatePlacementSource(source, contract, context) {
  	let consumerId;
  	try {
  		const descriptor = Object.getOwnPropertyDescriptor(context, "consumerId");
  		if (descriptor && "value" in descriptor && typeof descriptor.value === "string") consumerId = descriptor.value;
  	} catch {}
  	let decoded;
  	try {
  		decoded = decodePlacementSource(source, contract);
  	} catch (error) {
  		const code = error instanceof TypeError && error.message === "Unrecognized camera profile variant." ? "variant-unrecognized" : "input-format-invalid";
  		return {
  			source,
  			result: {
  				kind: "invalid",
  				diagnostics: [{
  					scope: {
  						identity: placementSchemaBundles[contract].identity,
  						...consumerId === void 0 ? {} : { consumerId }
  					},
  					phase: "decode",
  					code,
  					dataPath: ""
  				}]
  			}
  		};
  	}
  	const compilation = sourceCompilations[contract];
  	if (compilation.kind !== "compiled") return {
  		...decoded,
  		result: compilation
  	};
  	return {
  		...decoded,
  		result: validateSchemaInput(compilation.validator, decoded.data, {
  			context,
  			ownerValidate: contract === "reference" ? validatePlacementReferenceInput : validatePlacementObservationInput
  		})
  	};
  }
  var cameraModelSchemaBundle = {
  	identity: {
  		ownerId: "turbowarp-time-space-sync",
  		contractId: "placement-camera-model",
  		revision: "source-v1",
  		variantId: "json"
  	},
  	dialect: "2020-12",
  	root: {
  		retrievalUri: placement_camera_model_schema_default.$id,
  		document: placement_camera_model_schema_default,
  		artifact: {
  			role: "canonical-schema",
  			source: {
  				"repository": "turbowarp-time-space-sync",
  				"path": "schemas/placement-camera-model.schema.json"
  			}
  		}
  	},
  	resources: [],
  	provenance: {
  		canonicalSources: [{
  			"repository": "turbowarp-time-space-sync",
  			"path": "schemas/placement-camera-model.schema.json"
  		}, {
  			repository: "turbowarp-time-space-sync",
  			path: "src/placement/camera-model.ts"
  		}],
  		generatedFiles: [],
  		referenceSchemas: [],
  		generationSources: []
  	}
  };
  var cameraModelCompilation = compileSchemaBundle(cameraModelSchemaBundle);
  function decodeCameraModelSource(source) {
  	return {
  		source,
  		format: "json",
  		variantId: "json",
  		data: JSON.parse(source)
  	};
  }
  /** Validate only the supplied source; no controller or runtime resources are touched. */
  function validateCameraModelSource(source, context) {
  	if (cameraModelCompilation.kind !== "compiled") return {
  		source,
  		result: cameraModelCompilation
  	};
  	let data;
  	try {
  		data = JSON.parse(source);
  	} catch {
  		return {
  			source,
  			result: {
  				kind: "invalid",
  				diagnostics: [{
  					scope: { identity: cameraModelSchemaBundle.identity },
  					phase: "decode",
  					code: "input-format-invalid",
  					dataPath: ""
  				}]
  			}
  		};
  	}
  	const accepted = () => {
  		try {
  			const parsed = parseCameraModel(JSON.parse(source));
  			if (!parsed.ok) return false;
  			requireSupportedDistortion(parsed.distortion);
  			return true;
  		} catch {
  			return false;
  		}
  	};
  	return {
  		source,
  		result: validateSchemaInput(cameraModelCompilation.validator, data, {
  			context,
  			ownerValidate: () => accepted() ? {
  				kind: "valid",
  				issues: []
  			} : {
  				kind: "invalid",
  				issues: [{
  					dataPath: "",
  					ruleId: "placement-camera-model-owner-input"
  				}]
  			}
  		})
  	};
  }
  function checkedSource(value) {
  	return value.result.kind === "valid" ? {
  		source: value.source,
  		result: {
  			kind: "valid",
  			diagnostics: []
  		}
  	} : {
  		source: value.source,
  		result: {
  			kind: value.result.kind,
  			diagnostics: value.result.diagnostics
  		}
  	};
  }
  function createSourceEditorOptions(nowMs = Date.now) {
  	const context = () => ({
  		consumerId: extensionConfig.id,
  		nowMs: nowMs(),
  		settings: null
  	});
  	return [
  		{
  			apiVersion: 1,
  			extensionId: extensionConfig.id,
  			editorId: "reference-source",
  			opcodes: ["defineReference"].map((opcode) => `${extensionConfig.id}_${opcode}`),
  			bindings: [{
  				argument: "REFERENCE_JSON",
  				variants: [{
  					variantId: "v1-json",
  					format: "json",
  					schemaBundle: placementSchemaBundles.reference
  				}],
  				decode: (source) => {
  					const decoded = decodePlacementSource(source, "reference");
  					return {
  						...decoded,
  						data: decoded.data
  					};
  				},
  				validateSource: (source, context) => checkedSource(validatePlacementSource(source, "reference", context))
  			}],
  			validationContext: context
  		},
  		{
  			apiVersion: 1,
  			extensionId: extensionConfig.id,
  			editorId: "observation-source",
  			opcodes: ["addPlacementObservation"].map((opcode) => `${extensionConfig.id}_${opcode}`),
  			bindings: [{
  				argument: "OBSERVATION_JSON",
  				variants: [{
  					variantId: "v1-json",
  					format: "json",
  					schemaBundle: placementSchemaBundles.observation
  				}],
  				decode: (source) => {
  					const decoded = decodePlacementSource(source, "observation");
  					return {
  						...decoded,
  						data: decoded.data
  					};
  				},
  				validateSource: (source, context) => checkedSource(validatePlacementSource(source, "observation", context))
  			}],
  			validationContext: context
  		},
  		{
  			apiVersion: 1,
  			extensionId: extensionConfig.id,
  			editorId: "camera-model-source",
  			opcodes: ["setCameraModel"].map((opcode) => `${extensionConfig.id}_${opcode}`),
  			bindings: [{
  				argument: "MODEL_JSON",
  				variants: [{
  					variantId: "json",
  					format: "json",
  					schemaBundle: cameraModelSchemaBundle
  				}],
  				decode: decodeCameraModelSource,
  				validateSource: (source, context) => checkedSource(validateCameraModelSource(source, context))
  			}],
  			validationContext: context
  		}
  	];
  }
  /** Optional capability: old GUIs continue executing blocks without editor registration. */
  function registerSourceEditors(scratch, nowMs = Date.now) {
  	const api = scratch?.gui?.blockEditors;
  	if (api?.apiVersion !== 1 || typeof api.registerSourceEditor !== "function") return () => {};
  	const removers = [];
  	try {
  		for (const options of createSourceEditorOptions(nowMs)) removers.push(api.registerSourceEditor(options));
  	} catch {
  		for (const remove of removers.reverse()) remove();
  		return () => {};
  	}
  	let active = true;
  	return () => {
  		if (active) {
  			active = false;
  			for (const remove of removers.reverse()) remove();
  		}
  	};
  }
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
  		this.removeFixedEditors = () => {};
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
  		this.removeSourceEditors = this.placementEnabled ? registerSourceEditors(Scratch) : () => {};
  		try {
  			const visibleOpcodes = new Set(blockDefinitions.filter((block) => this.featureEnabled(block.feature)).map((block) => `${extensionConfig.id}_${block.opcode}`));
  			this.removeFixedEditors = registerFixedInputEditors(typeof Scratch === "undefined" ? void 0 : Scratch, fixedInputEditors.filter((editor) => editor.opcodes.every((opcode) => visibleOpcodes.has(opcode))), this.runtime);
  			this.publishCapability();
  			this.watchRuntime();
  		} catch (error) {
  			this.removeFixedEditors();
  			this.removeSourceEditors();
  			throw error;
  		}
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
  		]) this.runtime.on?.(event, event === "RUNTIME_DISPOSED" ? () => {
  			stop();
  			this.removeFixedEditors();
  			this.removeSourceEditors();
  		} : stop);
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
  if (extensionConfig.unsandboxed && !Scratch.extensions.unsandboxed) throw new Error(`${extensionConfig.name} must run unsandboxed.`);
  Scratch.extensions.register(new TimeSpaceSyncExtension());

})(Scratch);
