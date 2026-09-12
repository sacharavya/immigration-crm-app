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

  // .design-sync/previews/Table.tsx
  var Table_exports = {};
  __export(Table_exports, {
    Cases: () => Cases,
    FeesWithFooter: () => FeesWithFooter
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

  // .design-sync/previews/Table.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var rows = [
    { file: "BBI-2026-0142", client: "Mateo Alvarez", program: "Spousal sponsorship", status: "In progress", due: "30 Sep 2026" },
    { file: "BBI-2026-0139", client: "Priya Raman", program: "Express Entry", status: "ITA received", due: "18 Oct 2026" },
    { file: "BBI-2026-0127", client: "Omar Haddad", program: "Study permit", status: "Awaiting documents", due: "12 Sep 2026" },
    { file: "BBI-2025-0981", client: "Lin Wei", program: "PR card renewal", status: "Submitted", due: "" }
  ];
  var Cases = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCaption, { children: "Open cases, sorted by next deadline." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "File" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "Client" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "Program" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "Status" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { className: "text-right", children: "Next deadline" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableBody, { children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "font-medium", children: r.file }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: r.client }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: r.program }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: r.status === "Awaiting documents" ? "destructive" : r.status === "Submitted" ? "secondary" : "default", children: r.status }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "text-right text-muted-foreground", children: r.due || "None" })
    ] }, r.file)) })
  ] });
  var FeesWithFooter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "Instalment" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { children: "Due" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableHead, { className: "text-right", children: "Amount" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableBody, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "Retainer" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "Paid 12 Mar 2026" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "text-right", children: "$2,500.00" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "On submission" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "1 Oct 2026" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "text-right", children: "$2,000.00" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "On decision" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { children: "TBD" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "text-right", children: "$1,500.00" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TableRow, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { colSpan: 2, children: "Total" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TableCell, { className: "text-right", children: "$6,000.00" })
    ] }) })
  ] });
  return __toCommonJS(Table_exports);
})();
