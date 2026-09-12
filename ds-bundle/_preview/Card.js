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

  // .design-sync/previews/Card.tsx
  var Card_exports = {};
  __export(Card_exports, {
    CaseSummary: () => CaseSummary,
    Small: () => Small,
    Stat: () => Stat
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

  // .design-sync/previews/Card.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var CaseSummary = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Card, { className: "w-96", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardTitle, { children: "Spousal sponsorship, inland" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardDescription, { children: "File BBI-2026-0142 opened 14 Mar 2026" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardAction, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { children: "In progress" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { className: "grid grid-cols-2 gap-x-4 gap-y-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { className: "text-muted-foreground", children: "Applicant" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Mateo Alvarez" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { className: "text-muted-foreground", children: "Sponsor" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Hannah Alvarez" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { className: "text-muted-foreground", children: "Next deadline" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Police certificate, 30 Sep" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { className: "text-muted-foreground", children: "Agent" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Northern Path Consulting" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardFooter, { className: "gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { size: "sm", children: "Open case" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { size: "sm", variant: "outline", children: "Send checklist" })
    ] })
  ] });
  var Small = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Card, { size: "sm", className: "w-72", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardTitle, { children: "Upcoming appointments" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardDescription, { children: "This week" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardContent, { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Consultation, Lin Wei" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-muted-foreground", children: "Tue 10:00" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Biometrics prep, Omar Haddad" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-muted-foreground", children: "Thu 14:30" })
      ] })
    ] })
  ] });
  var Stat = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { size: "sm", className: "w-40", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardDescription, { children: "Open cases" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardTitle, { className: "text-2xl", children: "38" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { size: "sm", className: "w-40", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardDescription, { children: "Fees outstanding" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CardTitle, { className: "text-2xl", children: "$12,450" })
    ] }) })
  ] });
  return __toCommonJS(Card_exports);
})();
