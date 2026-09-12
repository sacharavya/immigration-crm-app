"use strict";
var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.BBI;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx2(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs2(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsxs2;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs2 : jsx2)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Field.tsx
  var Field_exports = {};
  __export(Field_exports, {
    Grouped: () => Grouped,
    HorizontalChoice: () => HorizontalChoice,
    VerticalForm: () => VerticalForm,
    WithError: () => WithError
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.BBI;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/Field.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var VerticalForm = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.FieldGroup, { className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLabel, { htmlFor: "f-name", children: "Full legal name" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "f-name", placeholder: "As shown on passport" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldDescription, { children: "Include all given names." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLabel, { htmlFor: "f-uci", children: "UCI number" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "f-uci", placeholder: "0000-0000" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldDescription, { children: "Found on any IRCC letter. Leave blank if this is a first application." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { className: "self-start", children: "Continue" })
  ] });
  var WithError = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { "data-invalid": true, className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLabel, { htmlFor: "f-pass", children: "Passport number" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "f-pass", defaultValue: "AB12", "aria-invalid": true }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldError, { errors: [{ message: "Passport numbers are 8 or 9 characters." }] })
  ] });
  var HorizontalChoice = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { orientation: "horizontal", className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", id: "f-consent", defaultChecked: true, className: "mt-0.5 size-4 accent-primary" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.FieldContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldTitle, { children: "Use of representative" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldDescription, { children: "Authorize BBI to communicate with IRCC on your behalf (IMM 5476)." })
    ] })
  ] });
  var Grouped = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.FieldSet, { className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLegend, { children: "Contact" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.FieldGroup, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLabel, { htmlFor: "f-email", children: "Email" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "f-email", type: "email", placeholder: "client@example.com" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldSeparator, { children: "or" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Field, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FieldLabel, { htmlFor: "f-phone", children: "Phone" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "f-phone", type: "tel", placeholder: "+1 604 555 0142" })
      ] })
    ] })
  ] });
  return __toCommonJS(Field_exports);
})();
