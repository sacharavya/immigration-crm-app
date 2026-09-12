/* @ds-bundle: {"namespace":"BBI","components":[{"name":"Badge","sourcePath":"components/general/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/general/Button/Button.jsx"},{"name":"Card","sourcePath":"components/general/Card/Card.jsx"},{"name":"DateInput","sourcePath":"components/general/DateInput/DateInput.jsx"},{"name":"Dialog","sourcePath":"components/general/Dialog/Dialog.jsx"},{"name":"Field","sourcePath":"components/general/Field/Field.jsx"},{"name":"Input","sourcePath":"components/general/Input/Input.jsx"},{"name":"Label","sourcePath":"components/general/Label/Label.jsx"},{"name":"Separator","sourcePath":"components/general/Separator/Separator.jsx"},{"name":"Table","sourcePath":"components/general/Table/Table.jsx"}],"sourceHashes":{"components/general/Badge/Badge.jsx":"ce7646362469","components/general/Badge/Badge.d.ts":"f8acb7d673d4","components/general/Badge/Badge.prompt.md":"af0437767f2a","components/general/Button/Button.jsx":"558902b37052","components/general/Button/Button.d.ts":"9a75c86717fb","components/general/Button/Button.prompt.md":"44fa8ac07cc3","components/general/Card/Card.jsx":"b2897478ca81","components/general/Card/Card.d.ts":"577201f943cc","components/general/Card/Card.prompt.md":"33e2c5d4ed30","components/general/DateInput/DateInput.jsx":"51bfc159d71d","components/general/DateInput/DateInput.d.ts":"52d7d12a2bdc","components/general/DateInput/DateInput.prompt.md":"2f83c5c93baa","components/general/Dialog/Dialog.jsx":"b21f83d85788","components/general/Dialog/Dialog.d.ts":"803b0a948c55","components/general/Dialog/Dialog.prompt.md":"d81fadd6ba41","components/general/Field/Field.jsx":"e293b7aac043","components/general/Field/Field.d.ts":"c07de2306b7f","components/general/Field/Field.prompt.md":"4cc66a7510cb","components/general/Input/Input.jsx":"cf3e7770633a","components/general/Input/Input.d.ts":"8a64478f9c47","components/general/Input/Input.prompt.md":"f3dae7069dba","components/general/Label/Label.jsx":"8c7c9f1c95e8","components/general/Label/Label.d.ts":"109d67ee4ba5","components/general/Label/Label.prompt.md":"aa127aba8ab5","components/general/Separator/Separator.jsx":"20598629078a","components/general/Separator/Separator.d.ts":"99a77a8af5af","components/general/Separator/Separator.prompt.md":"95dc68f90248","components/general/Table/Table.jsx":"9e9cfc3f37ca","components/general/Table/Table.d.ts":"a12f1e03662e","components/general/Table/Table.prompt.md":"37b9f8749eb0"},"inlinedExternals":["@base-ui/react","@base-ui/utils","@floating-ui/core","@floating-ui/dom","@floating-ui/react-dom","@floating-ui/utils","class-variance-authority","clsx","lucide-react","reselect","tailwind-merge","use-sync-external-store"],"builtBy":"cc-design-sync"} */
"use strict";
var BBI = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
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
      function jsx10(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs4(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx10;
      module.exports.jsxs = jsxs4;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs4 : jsx10)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // shim:react-dom-shim
  var require_react_dom_shim = __commonJS({
    "shim:react-dom-shim"(exports, module) {
      init_define_import_meta_env();
      var D = window.ReactDOM;
      var n = function() {
      };
      module.exports = Object.assign({ preload: n, preinit: n, preconnect: n, prefetchDNS: n, preloadModule: n, preinitModule: n }, D);
    }
  });

  // node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
  var require_use_sync_external_store_shim_development = __commonJS({
    "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
      "use strict";
      init_define_import_meta_env();
      (function() {
        function is(x, y) {
          return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
        }
        function useSyncExternalStore$2(subscribe, getSnapshot) {
          didWarnOld18Alpha || void 0 === React68.startTransition || (didWarnOld18Alpha = true, console.error(
            "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
          ));
          var value = getSnapshot();
          if (!didWarnUncachedGetSnapshot) {
            var cachedValue = getSnapshot();
            objectIs(value, cachedValue) || (console.error(
              "The result of getSnapshot should be cached to avoid an infinite loop"
            ), didWarnUncachedGetSnapshot = true);
          }
          cachedValue = useState12({
            inst: { value, getSnapshot }
          });
          var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
          useLayoutEffect3(
            function() {
              inst.value = value;
              inst.getSnapshot = getSnapshot;
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            },
            [subscribe, value, getSnapshot]
          );
          useEffect12(
            function() {
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
              return subscribe(function() {
                checkIfSnapshotChanged(inst) && forceUpdate({ inst });
              });
            },
            [subscribe]
          );
          useDebugValue2(value);
          return value;
        }
        function checkIfSnapshotChanged(inst) {
          var latestGetSnapshot = inst.getSnapshot;
          inst = inst.value;
          try {
            var nextValue = latestGetSnapshot();
            return !objectIs(inst, nextValue);
          } catch (error2) {
            return true;
          }
        }
        function useSyncExternalStore$1(subscribe, getSnapshot) {
          return getSnapshot();
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var React68 = require_react_shim(), objectIs = "function" === typeof Object.is ? Object.is : is, useState12 = React68.useState, useEffect12 = React68.useEffect, useLayoutEffect3 = React68.useLayoutEffect, useDebugValue2 = React68.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
        exports.useSyncExternalStore = void 0 !== React68.useSyncExternalStore ? React68.useSyncExternalStore : shim;
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/use-sync-external-store/shim/index.js
  var require_shim = __commonJS({
    "node_modules/use-sync-external-store/shim/index.js"(exports, module) {
      "use strict";
      init_define_import_meta_env();
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_use_sync_external_store_shim_development();
      }
    }
  });

  // node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js
  var require_with_selector_development = __commonJS({
    "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js"(exports) {
      "use strict";
      init_define_import_meta_env();
      (function() {
        function is(x, y) {
          return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var React68 = require_react_shim(), shim = require_shim(), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore2 = shim.useSyncExternalStore, useRef23 = React68.useRef, useEffect12 = React68.useEffect, useMemo18 = React68.useMemo, useDebugValue2 = React68.useDebugValue;
        exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
          var instRef = useRef23(null);
          if (null === instRef.current) {
            var inst = { hasValue: false, value: null };
            instRef.current = inst;
          } else inst = instRef.current;
          instRef = useMemo18(
            function() {
              function memoizedSelector(nextSnapshot) {
                if (!hasMemo) {
                  hasMemo = true;
                  memoizedSnapshot = nextSnapshot;
                  nextSnapshot = selector(nextSnapshot);
                  if (void 0 !== isEqual && inst.hasValue) {
                    var currentSelection = inst.value;
                    if (isEqual(currentSelection, nextSnapshot))
                      return memoizedSelection = currentSelection;
                  }
                  return memoizedSelection = nextSnapshot;
                }
                currentSelection = memoizedSelection;
                if (objectIs(memoizedSnapshot, nextSnapshot))
                  return currentSelection;
                var nextSelection = selector(nextSnapshot);
                if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
                  return memoizedSnapshot = nextSnapshot, currentSelection;
                memoizedSnapshot = nextSnapshot;
                return memoizedSelection = nextSelection;
              }
              var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
              return [
                function() {
                  return memoizedSelector(getSnapshot());
                },
                null === maybeGetServerSnapshot ? void 0 : function() {
                  return memoizedSelector(maybeGetServerSnapshot());
                }
              ];
            },
            [getSnapshot, getServerSnapshot, selector, isEqual]
          );
          var value = useSyncExternalStore2(subscribe, instRef[0], instRef[1]);
          useEffect12(
            function() {
              inst.hasValue = true;
              inst.value = value;
            },
            [value]
          );
          useDebugValue2(value);
          return value;
        };
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/use-sync-external-store/shim/with-selector.js
  var require_with_selector = __commonJS({
    "node_modules/use-sync-external-store/shim/with-selector.js"(exports, module) {
      "use strict";
      init_define_import_meta_env();
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_with_selector_development();
      }
    }
  });

  // ds-bundle/.pkg-entry.mjs
  var pkg_entry_exports = {};
  __export(pkg_entry_exports, {
    Badge: () => Badge,
    Button: () => Button3,
    Card: () => Card,
    CardAction: () => CardAction,
    CardContent: () => CardContent,
    CardDescription: () => CardDescription,
    CardFooter: () => CardFooter,
    CardHeader: () => CardHeader,
    CardTitle: () => CardTitle,
    DateInput: () => DateInput,
    Dialog: () => Dialog,
    DialogClose: () => DialogClose3,
    DialogContent: () => DialogContent,
    DialogDescription: () => DialogDescription3,
    DialogFooter: () => DialogFooter,
    DialogHeader: () => DialogHeader,
    DialogOverlay: () => DialogOverlay,
    DialogPortal: () => DialogPortal3,
    DialogTitle: () => DialogTitle3,
    DialogTrigger: () => DialogTrigger3,
    Field: () => Field,
    FieldContent: () => FieldContent,
    FieldDescription: () => FieldDescription,
    FieldError: () => FieldError,
    FieldGroup: () => FieldGroup,
    FieldLabel: () => FieldLabel,
    FieldLegend: () => FieldLegend,
    FieldSeparator: () => FieldSeparator,
    FieldSet: () => FieldSet,
    FieldTitle: () => FieldTitle,
    Input: () => Input3,
    Label: () => Label,
    Separator: () => Separator2,
    Table: () => Table,
    TableBody: () => TableBody,
    TableCaption: () => TableCaption,
    TableCell: () => TableCell,
    TableFooter: () => TableFooter,
    TableHead: () => TableHead,
    TableHeader: () => TableHeader,
    TableRow: () => TableRow,
    badgeVariants: () => badgeVariants,
    buttonVariants: () => buttonVariants,
    maskDateValue: () => maskDateValue
  });
  init_define_import_meta_env();

  // src/components/ui/badge.tsx
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/merge-props/mergeProps.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/mergeObjects.js
  init_define_import_meta_env();
  function mergeObjects(a, b) {
    if (a && !b) {
      return a;
    }
    if (!a && b) {
      return b;
    }
    if (a || b) {
      return {
        ...a,
        ...b
      };
    }
    return void 0;
  }

  // node_modules/@base-ui/react/esm/merge-props/mergeProps.js
  var EMPTY_PROPS = {};
  function mergeProps(a, b, c, d, e) {
    if (!c && !d && !e && !a) {
      return createInitialMergedProps(b);
    }
    let merged = createInitialMergedProps(a);
    if (b) {
      merged = mergeInto(merged, b);
    }
    if (c) {
      merged = mergeInto(merged, c);
    }
    if (d) {
      merged = mergeInto(merged, d);
    }
    if (e) {
      merged = mergeInto(merged, e);
    }
    return merged;
  }
  function mergePropsN(props) {
    if (props.length === 0) {
      return EMPTY_PROPS;
    }
    if (props.length === 1) {
      return createInitialMergedProps(props[0]);
    }
    let merged = createInitialMergedProps(props[0]);
    for (let i = 1; i < props.length; i += 1) {
      merged = mergeInto(merged, props[i]);
    }
    return merged;
  }
  function createInitialMergedProps(inputProps) {
    if (isPropsGetter(inputProps)) {
      return {
        ...resolvePropsGetter(inputProps, EMPTY_PROPS)
      };
    }
    return copyInitialProps(inputProps);
  }
  function mergeInto(merged, inputProps) {
    if (isPropsGetter(inputProps)) {
      return resolvePropsGetter(inputProps, merged);
    }
    return mutablyMergeInto(merged, inputProps);
  }
  function copyInitialProps(inputProps) {
    const copiedProps = {
      ...inputProps
    };
    for (const propName in copiedProps) {
      const propValue = copiedProps[propName];
      if (isEventHandler(propName, propValue)) {
        copiedProps[propName] = wrapEventHandler(propValue);
      }
    }
    return copiedProps;
  }
  function mutablyMergeInto(mergedProps, externalProps) {
    if (!externalProps) {
      return mergedProps;
    }
    for (const propName in externalProps) {
      const externalPropValue = externalProps[propName];
      switch (propName) {
        case "style": {
          mergedProps[propName] = mergeObjects(mergedProps.style, externalPropValue);
          break;
        }
        case "className": {
          mergedProps[propName] = mergeClassNames(mergedProps.className, externalPropValue);
          break;
        }
        default: {
          if (isEventHandler(propName, externalPropValue)) {
            mergedProps[propName] = mergeEventHandlers(mergedProps[propName], externalPropValue);
          } else {
            mergedProps[propName] = externalPropValue;
          }
        }
      }
    }
    return mergedProps;
  }
  function isEventHandler(key, value) {
    const code0 = key.charCodeAt(0);
    const code1 = key.charCodeAt(1);
    const code2 = key.charCodeAt(2);
    return code0 === 111 && code1 === 110 && code2 >= 65 && code2 <= 90 && (typeof value === "function" || typeof value === "undefined");
  }
  function isPropsGetter(inputProps) {
    return typeof inputProps === "function";
  }
  function resolvePropsGetter(inputProps, previousProps) {
    if (isPropsGetter(inputProps)) {
      return inputProps(previousProps);
    }
    return inputProps ?? EMPTY_PROPS;
  }
  function mergeEventHandlers(ourHandler, theirHandler) {
    if (!theirHandler) {
      return ourHandler;
    }
    if (!ourHandler) {
      return wrapEventHandler(theirHandler);
    }
    return (...args) => {
      const event = args[0];
      if (isSyntheticEvent(event)) {
        const baseUIEvent = event;
        makeEventPreventable(baseUIEvent);
        const result2 = theirHandler(...args);
        if (!baseUIEvent.baseUIHandlerPrevented) {
          ourHandler?.(...args);
        }
        return result2;
      }
      const result = theirHandler(...args);
      ourHandler?.(...args);
      return result;
    };
  }
  function wrapEventHandler(handler) {
    if (!handler) {
      return handler;
    }
    return (...args) => {
      const event = args[0];
      if (isSyntheticEvent(event)) {
        makeEventPreventable(event);
      }
      return handler(...args);
    };
  }
  function makeEventPreventable(event) {
    event.preventBaseUIHandler = () => {
      event.baseUIHandlerPrevented = true;
    };
    return event;
  }
  function mergeClassNames(ourClassName, theirClassName) {
    if (theirClassName) {
      if (ourClassName) {
        return theirClassName + " " + ourClassName;
      }
      return theirClassName;
    }
    return ourClassName;
  }
  function isSyntheticEvent(event) {
    return event != null && typeof event === "object" && "nativeEvent" in event;
  }

  // node_modules/@base-ui/react/esm/use-render/useRender.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/useRenderElement.js
  init_define_import_meta_env();
  var React4 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/useMergedRefs.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/useRefWithInit.js
  init_define_import_meta_env();
  var React = __toESM(require_react_shim(), 1);
  var UNINITIALIZED = {};
  function useRefWithInit(init, initArg) {
    const ref = React.useRef(UNINITIALIZED);
    if (ref.current === UNINITIALIZED) {
      ref.current = init(initArg);
    }
    return ref;
  }

  // node_modules/@base-ui/utils/esm/useMergedRefs.js
  function useMergedRefs(a, b, c, d) {
    const forkRef = useRefWithInit(createForkRef).current;
    if (didChange(forkRef, a, b, c, d)) {
      update(forkRef, [a, b, c, d]);
    }
    return forkRef.callback;
  }
  function useMergedRefsN(refs) {
    const forkRef = useRefWithInit(createForkRef).current;
    if (didChangeN(forkRef, refs)) {
      update(forkRef, refs);
    }
    return forkRef.callback;
  }
  function createForkRef() {
    return {
      callback: null,
      cleanup: null,
      refs: []
    };
  }
  function didChange(forkRef, a, b, c, d) {
    return forkRef.refs[0] !== a || forkRef.refs[1] !== b || forkRef.refs[2] !== c || forkRef.refs[3] !== d;
  }
  function didChangeN(forkRef, newRefs) {
    return forkRef.refs.length !== newRefs.length || forkRef.refs.some((ref, index) => ref !== newRefs[index]);
  }
  function update(forkRef, refs) {
    forkRef.refs = refs;
    if (refs.every((ref) => ref == null)) {
      forkRef.callback = null;
      return;
    }
    forkRef.callback = (instance) => {
      if (forkRef.cleanup) {
        forkRef.cleanup();
        forkRef.cleanup = null;
      }
      if (instance != null) {
        const cleanupCallbacks = Array(refs.length).fill(null);
        for (let i = 0; i < refs.length; i += 1) {
          const ref = refs[i];
          if (ref == null) {
            continue;
          }
          switch (typeof ref) {
            case "function": {
              const refCleanup = ref(instance);
              if (typeof refCleanup === "function") {
                cleanupCallbacks[i] = refCleanup;
              }
              break;
            }
            case "object": {
              ref.current = instance;
              break;
            }
            default:
          }
        }
        forkRef.cleanup = () => {
          for (let i = 0; i < refs.length; i += 1) {
            const ref = refs[i];
            if (ref == null) {
              continue;
            }
            switch (typeof ref) {
              case "function": {
                const cleanupCallback = cleanupCallbacks[i];
                if (typeof cleanupCallback === "function") {
                  cleanupCallback();
                } else {
                  ref(null);
                }
                break;
              }
              case "object": {
                ref.current = null;
                break;
              }
              default:
            }
          }
        };
      }
    };
  }

  // node_modules/@base-ui/utils/esm/getReactElementRef.js
  init_define_import_meta_env();
  var React3 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/reactVersion.js
  init_define_import_meta_env();
  var React2 = __toESM(require_react_shim(), 1);
  var majorVersion = parseInt(React2.version, 10);
  function isReactVersionAtLeast(reactVersionToCheck) {
    return majorVersion >= reactVersionToCheck;
  }

  // node_modules/@base-ui/utils/esm/getReactElementRef.js
  function getReactElementRef(element) {
    if (!/* @__PURE__ */ React3.isValidElement(element)) {
      return null;
    }
    const reactElement = element;
    const propsWithRef = reactElement.props;
    return (isReactVersionAtLeast(19) ? propsWithRef?.ref : reactElement.ref) ?? null;
  }

  // node_modules/@base-ui/utils/esm/warn.js
  init_define_import_meta_env();
  var set;
  if (true) {
    set = /* @__PURE__ */ new Set();
  }
  function warn(...messages) {
    if (true) {
      const messageKey = messages.join(" ");
      if (!set.has(messageKey)) {
        set.add(messageKey);
        console.warn(`Base UI: ${messageKey}`);
      }
    }
  }

  // node_modules/@base-ui/utils/esm/empty.js
  init_define_import_meta_env();
  function NOOP() {
  }
  var EMPTY_ARRAY = Object.freeze([]);
  var EMPTY_OBJECT = Object.freeze({});

  // node_modules/@base-ui/react/esm/internals/getStateAttributesProps.js
  init_define_import_meta_env();
  function getStateAttributesProps(state, customMapping) {
    const props = {};
    for (const key in state) {
      const value = state[key];
      if (customMapping?.hasOwnProperty(key)) {
        const customProps = customMapping[key](value);
        if (customProps != null) {
          Object.assign(props, customProps);
        }
        continue;
      }
      if (value === true) {
        props[`data-${key.toLowerCase()}`] = "";
      } else if (value) {
        props[`data-${key.toLowerCase()}`] = value.toString();
      }
    }
    return props;
  }

  // node_modules/@base-ui/react/esm/utils/resolveClassName.js
  init_define_import_meta_env();
  function resolveClassName(className, state) {
    return typeof className === "function" ? className(state) : className;
  }

  // node_modules/@base-ui/react/esm/utils/resolveStyle.js
  init_define_import_meta_env();
  function resolveStyle(style, state) {
    return typeof style === "function" ? style(state) : style;
  }

  // node_modules/@base-ui/react/esm/internals/useRenderElement.js
  var import_react = __toESM(require_react_shim(), 1);
  function useRenderElement(element, componentProps, params = {}) {
    const renderProp = componentProps.render;
    const outProps = useRenderElementProps(componentProps, params);
    if (params.enabled === false) {
      return null;
    }
    const state = params.state ?? EMPTY_OBJECT;
    return evaluateRenderProp(element, renderProp, outProps, state);
  }
  function useRenderElementProps(componentProps, params = {}) {
    const {
      className: classNameProp,
      style: styleProp,
      render: renderProp
    } = componentProps;
    const {
      state = EMPTY_OBJECT,
      ref,
      props,
      stateAttributesMapping: stateAttributesMapping5,
      enabled = true
    } = params;
    const className = enabled ? resolveClassName(classNameProp, state) : void 0;
    const style = enabled ? resolveStyle(styleProp, state) : void 0;
    const stateProps = enabled ? getStateAttributesProps(state, stateAttributesMapping5) : EMPTY_OBJECT;
    const resolvedProps = enabled && props ? resolveRenderFunctionProps(props) : void 0;
    const outProps = enabled ? mergeObjects(stateProps, resolvedProps) ?? {} : EMPTY_OBJECT;
    if (typeof document !== "undefined") {
      if (!enabled) {
        useMergedRefs(null, null);
      } else if (Array.isArray(ref)) {
        outProps.ref = useMergedRefsN([outProps.ref, getReactElementRef(renderProp), ...ref]);
      } else {
        outProps.ref = useMergedRefs(outProps.ref, getReactElementRef(renderProp), ref);
      }
    }
    if (!enabled) {
      return EMPTY_OBJECT;
    }
    if (className !== void 0) {
      outProps.className = mergeClassNames(outProps.className, className);
    }
    if (style !== void 0) {
      outProps.style = mergeObjects(outProps.style, style);
    }
    return outProps;
  }
  function resolveRenderFunctionProps(props) {
    if (Array.isArray(props)) {
      return mergePropsN(props);
    }
    return mergeProps(void 0, props);
  }
  var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
  var COMPONENT_IDENTIFIER_PATTERN = /^[A-Z][A-Za-z0-9$]*$/;
  var LOWERCASE_CHARACTER_PATTERN = /[a-z]/;
  function evaluateRenderProp(element, render, props, state) {
    if (render) {
      if (typeof render === "function") {
        if (true) {
          warnIfRenderPropLooksLikeComponent(render);
        }
        return render(props, state);
      }
      const mergedProps = mergeProps(props, render.props);
      mergedProps.ref = props.ref;
      let newElement = render;
      if (newElement?.$$typeof === REACT_LAZY_TYPE) {
        const children = React4.Children.toArray(render);
        newElement = children[0];
      }
      if (true) {
        if (!/* @__PURE__ */ React4.isValidElement(newElement)) {
          throw new Error(["Base UI: The `render` prop was provided an invalid React element as `React.isValidElement(render)` is `false`.", "A valid React element must be provided to the `render` prop because it is cloned with props to replace the default element.", "https://base-ui.com/r/invalid-render-prop"].join("\n"));
        }
      }
      return /* @__PURE__ */ React4.cloneElement(newElement, mergedProps);
    }
    if (element) {
      if (typeof element === "string") {
        return renderTag(element, props);
      }
    }
    throw new Error(true ? "Base UI: Render element or function are not defined." : formatErrorMessage_default(8));
  }
  function warnIfRenderPropLooksLikeComponent(renderFn) {
    const functionName = renderFn.name;
    if (functionName.length === 0) {
      return;
    }
    if (!COMPONENT_IDENTIFIER_PATTERN.test(functionName)) {
      return;
    }
    if (!LOWERCASE_CHARACTER_PATTERN.test(functionName)) {
      return;
    }
    warn(`The \`render\` prop received a function named \`${functionName}\` that starts with an uppercase letter.`, "This usually means a React component was passed directly as `render={Component}`.", "Base UI calls `render` as a plain function, which can break the Rules of Hooks during reconciliation.", "If this is an intentional render callback, rename it to start with a lowercase letter.", "Use `render={<Component />}` or `render={(props) => <Component {...props} />}` instead.", "https://base-ui.com/r/invalid-render-prop");
  }
  function renderTag(Tag, props) {
    if (Tag === "button") {
      return /* @__PURE__ */ (0, import_react.createElement)("button", {
        type: "button",
        ...props,
        key: props.key
      });
    }
    if (Tag === "img") {
      return /* @__PURE__ */ (0, import_react.createElement)("img", {
        alt: "",
        ...props,
        key: props.key
      });
    }
    return /* @__PURE__ */ React4.createElement(Tag, props);
  }

  // node_modules/@base-ui/react/esm/use-render/useRender.js
  function useRender(params) {
    return useRenderElement(params.defaultTagName ?? "div", params, params);
  }

  // node_modules/class-variance-authority/dist/index.mjs
  init_define_import_meta_env();

  // node_modules/clsx/dist/clsx.mjs
  init_define_import_meta_env();
  function r(e) {
    var t, f, n = "";
    if ("string" == typeof e || "number" == typeof e) n += e;
    else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
    } else for (f in e) e[f] && (n && (n += " "), n += f);
    return n;
  }
  function clsx() {
    for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
    return n;
  }

  // node_modules/class-variance-authority/dist/index.mjs
  var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
  var cx = clsx;
  var cva = (base, config) => (props) => {
    var _config_compoundVariants;
    if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
    const { variants, defaultVariants } = config;
    const getVariantClassNames = Object.keys(variants).map((variant) => {
      const variantProp = props === null || props === void 0 ? void 0 : props[variant];
      const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
      if (variantProp === null) return null;
      const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
      return variants[variant][variantKey];
    });
    const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
      let [key, value] = param;
      if (value === void 0) {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});
    const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
      let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
      return Object.entries(compoundVariantOptions).every((param2) => {
        let [key, value] = param2;
        return Array.isArray(value) ? value.includes({
          ...defaultVariants,
          ...propsWithoutUndefined
        }[key]) : {
          ...defaultVariants,
          ...propsWithoutUndefined
        }[key] === value;
      }) ? [
        ...acc,
        cvClass,
        cvClassName
      ] : acc;
    }, []);
    return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  };

  // src/lib/utils/index.ts
  init_define_import_meta_env();

  // node_modules/tailwind-merge/dist/bundle-mjs.mjs
  init_define_import_meta_env();
  var concatArrays = (array1, array2) => {
    const combinedArray = new Array(array1.length + array2.length);
    for (let i = 0; i < array1.length; i++) {
      combinedArray[i] = array1[i];
    }
    for (let i = 0; i < array2.length; i++) {
      combinedArray[array1.length + i] = array2[i];
    }
    return combinedArray;
  };
  var createClassValidatorObject = (classGroupId, validator) => ({
    classGroupId,
    validator
  });
  var createClassPartObject = (nextPart = /* @__PURE__ */ new Map(), validators = null, classGroupId) => ({
    nextPart,
    validators,
    classGroupId
  });
  var CLASS_PART_SEPARATOR = "-";
  var EMPTY_CONFLICTS = [];
  var ARBITRARY_PROPERTY_PREFIX = "arbitrary..";
  var createClassGroupUtils = (config) => {
    const classMap = createClassMap(config);
    const {
      conflictingClassGroups,
      conflictingClassGroupModifiers
    } = config;
    const getClassGroupId = (className) => {
      if (className.startsWith("[") && className.endsWith("]")) {
        return getGroupIdForArbitraryProperty(className);
      }
      const classParts = className.split(CLASS_PART_SEPARATOR);
      const startIndex = classParts[0] === "" && classParts.length > 1 ? 1 : 0;
      return getGroupRecursive(classParts, startIndex, classMap);
    };
    const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
      if (hasPostfixModifier) {
        const modifierConflicts = conflictingClassGroupModifiers[classGroupId];
        const baseConflicts = conflictingClassGroups[classGroupId];
        if (modifierConflicts) {
          if (baseConflicts) {
            return concatArrays(baseConflicts, modifierConflicts);
          }
          return modifierConflicts;
        }
        return baseConflicts || EMPTY_CONFLICTS;
      }
      return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS;
    };
    return {
      getClassGroupId,
      getConflictingClassGroupIds
    };
  };
  var getGroupRecursive = (classParts, startIndex, classPartObject) => {
    const classPathsLength = classParts.length - startIndex;
    if (classPathsLength === 0) {
      return classPartObject.classGroupId;
    }
    const currentClassPart = classParts[startIndex];
    const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
    if (nextClassPartObject) {
      const result = getGroupRecursive(classParts, startIndex + 1, nextClassPartObject);
      if (result) return result;
    }
    const validators = classPartObject.validators;
    if (validators === null) {
      return void 0;
    }
    const classRest = startIndex === 0 ? classParts.join(CLASS_PART_SEPARATOR) : classParts.slice(startIndex).join(CLASS_PART_SEPARATOR);
    const validatorsLength = validators.length;
    for (let i = 0; i < validatorsLength; i++) {
      const validatorObj = validators[i];
      if (validatorObj.validator(classRest)) {
        return validatorObj.classGroupId;
      }
    }
    return void 0;
  };
  var getGroupIdForArbitraryProperty = (className) => className.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
    const content = className.slice(1, -1);
    const colonIndex = content.indexOf(":");
    const property = content.slice(0, colonIndex);
    return property ? ARBITRARY_PROPERTY_PREFIX + property : void 0;
  })();
  var createClassMap = (config) => {
    const {
      theme,
      classGroups
    } = config;
    return processClassGroups(classGroups, theme);
  };
  var processClassGroups = (classGroups, theme) => {
    const classMap = createClassPartObject();
    for (const classGroupId in classGroups) {
      const group = classGroups[classGroupId];
      processClassesRecursively(group, classMap, classGroupId, theme);
    }
    return classMap;
  };
  var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
    const len = classGroup.length;
    for (let i = 0; i < len; i++) {
      const classDefinition = classGroup[i];
      processClassDefinition(classDefinition, classPartObject, classGroupId, theme);
    }
  };
  var processClassDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
    if (typeof classDefinition === "string") {
      processStringDefinition(classDefinition, classPartObject, classGroupId);
      return;
    }
    if (typeof classDefinition === "function") {
      processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme);
      return;
    }
    processObjectDefinition(classDefinition, classPartObject, classGroupId, theme);
  };
  var processStringDefinition = (classDefinition, classPartObject, classGroupId) => {
    const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
    classPartObjectToEdit.classGroupId = classGroupId;
  };
  var processFunctionDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
    if (isThemeGetter(classDefinition)) {
      processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
      return;
    }
    if (classPartObject.validators === null) {
      classPartObject.validators = [];
    }
    classPartObject.validators.push(createClassValidatorObject(classGroupId, classDefinition));
  };
  var processObjectDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
    const entries = Object.entries(classDefinition);
    const len = entries.length;
    for (let i = 0; i < len; i++) {
      const [key, value] = entries[i];
      processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme);
    }
  };
  var getPart = (classPartObject, path) => {
    let current = classPartObject;
    const parts = path.split(CLASS_PART_SEPARATOR);
    const len = parts.length;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      let next = current.nextPart.get(part);
      if (!next) {
        next = createClassPartObject();
        current.nextPart.set(part, next);
      }
      current = next;
    }
    return current;
  };
  var isThemeGetter = (func) => "isThemeGetter" in func && func.isThemeGetter === true;
  var createLruCache = (maxCacheSize) => {
    if (maxCacheSize < 1) {
      return {
        get: () => void 0,
        set: () => {
        }
      };
    }
    let cacheSize = 0;
    let cache = /* @__PURE__ */ Object.create(null);
    let previousCache = /* @__PURE__ */ Object.create(null);
    const update2 = (key, value) => {
      cache[key] = value;
      cacheSize++;
      if (cacheSize > maxCacheSize) {
        cacheSize = 0;
        previousCache = cache;
        cache = /* @__PURE__ */ Object.create(null);
      }
    };
    return {
      get(key) {
        let value = cache[key];
        if (value !== void 0) {
          return value;
        }
        if ((value = previousCache[key]) !== void 0) {
          update2(key, value);
          return value;
        }
      },
      set(key, value) {
        if (key in cache) {
          cache[key] = value;
        } else {
          update2(key, value);
        }
      }
    };
  };
  var IMPORTANT_MODIFIER = "!";
  var MODIFIER_SEPARATOR = ":";
  var EMPTY_MODIFIERS = [];
  var createResultObject = (modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition, isExternal) => ({
    modifiers,
    hasImportantModifier,
    baseClassName,
    maybePostfixModifierPosition,
    isExternal
  });
  var createParseClassName = (config) => {
    const {
      prefix,
      experimentalParseClassName
    } = config;
    let parseClassName = (className) => {
      const modifiers = [];
      let bracketDepth = 0;
      let parenDepth = 0;
      let modifierStart = 0;
      let postfixModifierPosition;
      const len = className.length;
      for (let index = 0; index < len; index++) {
        const currentCharacter = className[index];
        if (bracketDepth === 0 && parenDepth === 0) {
          if (currentCharacter === MODIFIER_SEPARATOR) {
            modifiers.push(className.slice(modifierStart, index));
            modifierStart = index + 1;
            continue;
          }
          if (currentCharacter === "/") {
            postfixModifierPosition = index;
            continue;
          }
        }
        if (currentCharacter === "[") bracketDepth++;
        else if (currentCharacter === "]") bracketDepth--;
        else if (currentCharacter === "(") parenDepth++;
        else if (currentCharacter === ")") parenDepth--;
      }
      const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.slice(modifierStart);
      let baseClassName = baseClassNameWithImportantModifier;
      let hasImportantModifier = false;
      if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
        baseClassName = baseClassNameWithImportantModifier.slice(0, -1);
        hasImportantModifier = true;
      } else if (
        /**
         * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
         * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
         */
        baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
      ) {
        baseClassName = baseClassNameWithImportantModifier.slice(1);
        hasImportantModifier = true;
      }
      const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
      return createResultObject(modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition);
    };
    if (prefix) {
      const fullPrefix = prefix + MODIFIER_SEPARATOR;
      const parseClassNameOriginal = parseClassName;
      parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.slice(fullPrefix.length)) : createResultObject(EMPTY_MODIFIERS, false, className, void 0, true);
    }
    if (experimentalParseClassName) {
      const parseClassNameOriginal = parseClassName;
      parseClassName = (className) => experimentalParseClassName({
        className,
        parseClassName: parseClassNameOriginal
      });
    }
    return parseClassName;
  };
  var createSortModifiers = (config) => {
    const modifierWeights = /* @__PURE__ */ new Map();
    config.orderSensitiveModifiers.forEach((mod, index) => {
      modifierWeights.set(mod, 1e6 + index);
    });
    return (modifiers) => {
      const result = [];
      let currentSegment = [];
      for (let i = 0; i < modifiers.length; i++) {
        const modifier = modifiers[i];
        const isArbitrary = modifier[0] === "[";
        const isOrderSensitive = modifierWeights.has(modifier);
        if (isArbitrary || isOrderSensitive) {
          if (currentSegment.length > 0) {
            currentSegment.sort();
            result.push(...currentSegment);
            currentSegment = [];
          }
          result.push(modifier);
        } else {
          currentSegment.push(modifier);
        }
      }
      if (currentSegment.length > 0) {
        currentSegment.sort();
        result.push(...currentSegment);
      }
      return result;
    };
  };
  var createConfigUtils = (config) => ({
    cache: createLruCache(config.cacheSize),
    parseClassName: createParseClassName(config),
    sortModifiers: createSortModifiers(config),
    ...createClassGroupUtils(config)
  });
  var SPLIT_CLASSES_REGEX = /\s+/;
  var mergeClassList = (classList, configUtils) => {
    const {
      parseClassName,
      getClassGroupId,
      getConflictingClassGroupIds,
      sortModifiers
    } = configUtils;
    const classGroupsInConflict = [];
    const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
    let result = "";
    for (let index = classNames.length - 1; index >= 0; index -= 1) {
      const originalClassName = classNames[index];
      const {
        isExternal,
        modifiers,
        hasImportantModifier,
        baseClassName,
        maybePostfixModifierPosition
      } = parseClassName(originalClassName);
      if (isExternal) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      let hasPostfixModifier = !!maybePostfixModifierPosition;
      let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
      if (!classGroupId) {
        if (!hasPostfixModifier) {
          result = originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        classGroupId = getClassGroupId(baseClassName);
        if (!classGroupId) {
          result = originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        hasPostfixModifier = false;
      }
      const variantModifier = modifiers.length === 0 ? "" : modifiers.length === 1 ? modifiers[0] : sortModifiers(modifiers).join(":");
      const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
      const classId = modifierId + classGroupId;
      if (classGroupsInConflict.indexOf(classId) > -1) {
        continue;
      }
      classGroupsInConflict.push(classId);
      const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
      for (let i = 0; i < conflictGroups.length; ++i) {
        const group = conflictGroups[i];
        classGroupsInConflict.push(modifierId + group);
      }
      result = originalClassName + (result.length > 0 ? " " + result : result);
    }
    return result;
  };
  var twJoin = (...classLists) => {
    let index = 0;
    let argument;
    let resolvedValue;
    let string = "";
    while (index < classLists.length) {
      if (argument = classLists[index++]) {
        if (resolvedValue = toValue(argument)) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  };
  var toValue = (mix) => {
    if (typeof mix === "string") {
      return mix;
    }
    let resolvedValue;
    let string = "";
    for (let k = 0; k < mix.length; k++) {
      if (mix[k]) {
        if (resolvedValue = toValue(mix[k])) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  };
  var createTailwindMerge = (createConfigFirst, ...createConfigRest) => {
    let configUtils;
    let cacheGet;
    let cacheSet;
    let functionToCall;
    const initTailwindMerge = (classList) => {
      const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
      configUtils = createConfigUtils(config);
      cacheGet = configUtils.cache.get;
      cacheSet = configUtils.cache.set;
      functionToCall = tailwindMerge;
      return tailwindMerge(classList);
    };
    const tailwindMerge = (classList) => {
      const cachedResult = cacheGet(classList);
      if (cachedResult) {
        return cachedResult;
      }
      const result = mergeClassList(classList, configUtils);
      cacheSet(classList, result);
      return result;
    };
    functionToCall = initTailwindMerge;
    return (...args) => functionToCall(twJoin(...args));
  };
  var fallbackThemeArr = [];
  var fromTheme = (key) => {
    const themeGetter = (theme) => theme[key] || fallbackThemeArr;
    themeGetter.isThemeGetter = true;
    return themeGetter;
  };
  var arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
  var arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
  var fractionRegex = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
  var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
  var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
  var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
  var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
  var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
  var isFraction = (value) => fractionRegex.test(value);
  var isNumber = (value) => !!value && !Number.isNaN(Number(value));
  var isInteger = (value) => !!value && Number.isInteger(Number(value));
  var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
  var isTshirtSize = (value) => tshirtUnitRegex.test(value);
  var isAny = () => true;
  var isLengthOnly = (value) => (
    // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
    // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
    // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
    lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
  );
  var isNever = () => false;
  var isShadow = (value) => shadowRegex.test(value);
  var isImage = (value) => imageRegex.test(value);
  var isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
  var isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
  var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
  var isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
  var isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
  var isArbitraryWeight = (value) => getIsArbitraryValue(value, isLabelWeight, isAny);
  var isArbitraryFamilyName = (value) => getIsArbitraryValue(value, isLabelFamilyName, isNever);
  var isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
  var isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
  var isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
  var isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
  var isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
  var isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
  var isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
  var isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
  var isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
  var isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
  var isArbitraryVariableWeight = (value) => getIsArbitraryVariable(value, isLabelWeight, true);
  var getIsArbitraryValue = (value, testLabel, testValue) => {
    const result = arbitraryValueRegex.exec(value);
    if (result) {
      if (result[1]) {
        return testLabel(result[1]);
      }
      return testValue(result[2]);
    }
    return false;
  };
  var getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
    const result = arbitraryVariableRegex.exec(value);
    if (result) {
      if (result[1]) {
        return testLabel(result[1]);
      }
      return shouldMatchNoLabel;
    }
    return false;
  };
  var isLabelPosition = (label) => label === "position" || label === "percentage";
  var isLabelImage = (label) => label === "image" || label === "url";
  var isLabelSize = (label) => label === "length" || label === "size" || label === "bg-size";
  var isLabelLength = (label) => label === "length";
  var isLabelNumber = (label) => label === "number";
  var isLabelFamilyName = (label) => label === "family-name";
  var isLabelWeight = (label) => label === "number" || label === "weight";
  var isLabelShadow = (label) => label === "shadow";
  var getDefaultConfig = () => {
    const themeColor = fromTheme("color");
    const themeFont = fromTheme("font");
    const themeText = fromTheme("text");
    const themeFontWeight = fromTheme("font-weight");
    const themeTracking = fromTheme("tracking");
    const themeLeading = fromTheme("leading");
    const themeBreakpoint = fromTheme("breakpoint");
    const themeContainer = fromTheme("container");
    const themeSpacing = fromTheme("spacing");
    const themeRadius = fromTheme("radius");
    const themeShadow = fromTheme("shadow");
    const themeInsetShadow = fromTheme("inset-shadow");
    const themeTextShadow = fromTheme("text-shadow");
    const themeDropShadow = fromTheme("drop-shadow");
    const themeBlur = fromTheme("blur");
    const themePerspective = fromTheme("perspective");
    const themeAspect = fromTheme("aspect");
    const themeEase = fromTheme("ease");
    const themeAnimate = fromTheme("animate");
    const scaleBreak = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
    const scalePosition = () => [
      "center",
      "top",
      "bottom",
      "left",
      "right",
      "top-left",
      // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
      "left-top",
      "top-right",
      // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
      "right-top",
      "bottom-right",
      // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
      "right-bottom",
      "bottom-left",
      // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
      "left-bottom"
    ];
    const scalePositionWithArbitrary = () => [...scalePosition(), isArbitraryVariable, isArbitraryValue];
    const scaleOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
    const scaleOverscroll = () => ["auto", "contain", "none"];
    const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
    const scaleInset = () => [isFraction, "full", "auto", ...scaleUnambiguousSpacing()];
    const scaleGridTemplateColsRows = () => [isInteger, "none", "subgrid", isArbitraryVariable, isArbitraryValue];
    const scaleGridColRowStartAndEnd = () => ["auto", {
      span: ["full", isInteger, isArbitraryVariable, isArbitraryValue]
    }, isInteger, isArbitraryVariable, isArbitraryValue];
    const scaleGridColRowStartOrEnd = () => [isInteger, "auto", isArbitraryVariable, isArbitraryValue];
    const scaleGridAutoColsRows = () => ["auto", "min", "max", "fr", isArbitraryVariable, isArbitraryValue];
    const scaleAlignPrimaryAxis = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"];
    const scaleAlignSecondaryAxis = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"];
    const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
    const scaleSizing = () => [isFraction, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
    const scaleSizingInline = () => [isFraction, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", ...scaleUnambiguousSpacing()];
    const scaleSizingBlock = () => [isFraction, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
    const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
    const scaleBgPosition = () => [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition, {
      position: [isArbitraryVariable, isArbitraryValue]
    }];
    const scaleBgRepeat = () => ["no-repeat", {
      repeat: ["", "x", "y", "space", "round"]
    }];
    const scaleBgSize = () => ["auto", "cover", "contain", isArbitraryVariableSize, isArbitrarySize, {
      size: [isArbitraryVariable, isArbitraryValue]
    }];
    const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
    const scaleRadius = () => [
      // Deprecated since Tailwind CSS v4.0.0
      "",
      "none",
      "full",
      themeRadius,
      isArbitraryVariable,
      isArbitraryValue
    ];
    const scaleBorderWidth = () => ["", isNumber, isArbitraryVariableLength, isArbitraryLength];
    const scaleLineStyle = () => ["solid", "dashed", "dotted", "double"];
    const scaleBlendMode = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
    const scaleMaskImagePosition = () => [isNumber, isPercent, isArbitraryVariablePosition, isArbitraryPosition];
    const scaleBlur = () => [
      // Deprecated since Tailwind CSS v4.0.0
      "",
      "none",
      themeBlur,
      isArbitraryVariable,
      isArbitraryValue
    ];
    const scaleRotate = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
    const scaleScale = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
    const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
    const scaleTranslate = () => [isFraction, "full", ...scaleUnambiguousSpacing()];
    return {
      cacheSize: 500,
      theme: {
        animate: ["spin", "ping", "pulse", "bounce"],
        aspect: ["video"],
        blur: [isTshirtSize],
        breakpoint: [isTshirtSize],
        color: [isAny],
        container: [isTshirtSize],
        "drop-shadow": [isTshirtSize],
        ease: ["in", "out", "in-out"],
        font: [isAnyNonArbitrary],
        "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
        "inset-shadow": [isTshirtSize],
        leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
        perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
        radius: [isTshirtSize],
        shadow: [isTshirtSize],
        spacing: ["px", isNumber],
        text: [isTshirtSize],
        "text-shadow": [isTshirtSize],
        tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
      },
      classGroups: {
        // --------------
        // --- Layout ---
        // --------------
        /**
         * Aspect Ratio
         * @see https://tailwindcss.com/docs/aspect-ratio
         */
        aspect: [{
          aspect: ["auto", "square", isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
        }],
        /**
         * Container
         * @see https://tailwindcss.com/docs/container
         * @deprecated since Tailwind CSS v4.0.0
         */
        container: ["container"],
        /**
         * Columns
         * @see https://tailwindcss.com/docs/columns
         */
        columns: [{
          columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer]
        }],
        /**
         * Break After
         * @see https://tailwindcss.com/docs/break-after
         */
        "break-after": [{
          "break-after": scaleBreak()
        }],
        /**
         * Break Before
         * @see https://tailwindcss.com/docs/break-before
         */
        "break-before": [{
          "break-before": scaleBreak()
        }],
        /**
         * Break Inside
         * @see https://tailwindcss.com/docs/break-inside
         */
        "break-inside": [{
          "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
        }],
        /**
         * Box Decoration Break
         * @see https://tailwindcss.com/docs/box-decoration-break
         */
        "box-decoration": [{
          "box-decoration": ["slice", "clone"]
        }],
        /**
         * Box Sizing
         * @see https://tailwindcss.com/docs/box-sizing
         */
        box: [{
          box: ["border", "content"]
        }],
        /**
         * Display
         * @see https://tailwindcss.com/docs/display
         */
        display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
        /**
         * Screen Reader Only
         * @see https://tailwindcss.com/docs/display#screen-reader-only
         */
        sr: ["sr-only", "not-sr-only"],
        /**
         * Floats
         * @see https://tailwindcss.com/docs/float
         */
        float: [{
          float: ["right", "left", "none", "start", "end"]
        }],
        /**
         * Clear
         * @see https://tailwindcss.com/docs/clear
         */
        clear: [{
          clear: ["left", "right", "both", "none", "start", "end"]
        }],
        /**
         * Isolation
         * @see https://tailwindcss.com/docs/isolation
         */
        isolation: ["isolate", "isolation-auto"],
        /**
         * Object Fit
         * @see https://tailwindcss.com/docs/object-fit
         */
        "object-fit": [{
          object: ["contain", "cover", "fill", "none", "scale-down"]
        }],
        /**
         * Object Position
         * @see https://tailwindcss.com/docs/object-position
         */
        "object-position": [{
          object: scalePositionWithArbitrary()
        }],
        /**
         * Overflow
         * @see https://tailwindcss.com/docs/overflow
         */
        overflow: [{
          overflow: scaleOverflow()
        }],
        /**
         * Overflow X
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-x": [{
          "overflow-x": scaleOverflow()
        }],
        /**
         * Overflow Y
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-y": [{
          "overflow-y": scaleOverflow()
        }],
        /**
         * Overscroll Behavior
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        overscroll: [{
          overscroll: scaleOverscroll()
        }],
        /**
         * Overscroll Behavior X
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-x": [{
          "overscroll-x": scaleOverscroll()
        }],
        /**
         * Overscroll Behavior Y
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-y": [{
          "overscroll-y": scaleOverscroll()
        }],
        /**
         * Position
         * @see https://tailwindcss.com/docs/position
         */
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        /**
         * Inset
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        inset: [{
          inset: scaleInset()
        }],
        /**
         * Inset Inline
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-x": [{
          "inset-x": scaleInset()
        }],
        /**
         * Inset Block
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-y": [{
          "inset-y": scaleInset()
        }],
        /**
         * Inset Inline Start
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         * @todo class group will be renamed to `inset-s` in next major release
         */
        start: [{
          "inset-s": scaleInset(),
          /**
           * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
           * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
           */
          start: scaleInset()
        }],
        /**
         * Inset Inline End
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         * @todo class group will be renamed to `inset-e` in next major release
         */
        end: [{
          "inset-e": scaleInset(),
          /**
           * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
           * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
           */
          end: scaleInset()
        }],
        /**
         * Inset Block Start
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-bs": [{
          "inset-bs": scaleInset()
        }],
        /**
         * Inset Block End
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-be": [{
          "inset-be": scaleInset()
        }],
        /**
         * Top
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        top: [{
          top: scaleInset()
        }],
        /**
         * Right
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        right: [{
          right: scaleInset()
        }],
        /**
         * Bottom
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        bottom: [{
          bottom: scaleInset()
        }],
        /**
         * Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        left: [{
          left: scaleInset()
        }],
        /**
         * Visibility
         * @see https://tailwindcss.com/docs/visibility
         */
        visibility: ["visible", "invisible", "collapse"],
        /**
         * Z-Index
         * @see https://tailwindcss.com/docs/z-index
         */
        z: [{
          z: [isInteger, "auto", isArbitraryVariable, isArbitraryValue]
        }],
        // ------------------------
        // --- Flexbox and Grid ---
        // ------------------------
        /**
         * Flex Basis
         * @see https://tailwindcss.com/docs/flex-basis
         */
        basis: [{
          basis: [isFraction, "full", "auto", themeContainer, ...scaleUnambiguousSpacing()]
        }],
        /**
         * Flex Direction
         * @see https://tailwindcss.com/docs/flex-direction
         */
        "flex-direction": [{
          flex: ["row", "row-reverse", "col", "col-reverse"]
        }],
        /**
         * Flex Wrap
         * @see https://tailwindcss.com/docs/flex-wrap
         */
        "flex-wrap": [{
          flex: ["nowrap", "wrap", "wrap-reverse"]
        }],
        /**
         * Flex
         * @see https://tailwindcss.com/docs/flex
         */
        flex: [{
          flex: [isNumber, isFraction, "auto", "initial", "none", isArbitraryValue]
        }],
        /**
         * Flex Grow
         * @see https://tailwindcss.com/docs/flex-grow
         */
        grow: [{
          grow: ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Flex Shrink
         * @see https://tailwindcss.com/docs/flex-shrink
         */
        shrink: [{
          shrink: ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Order
         * @see https://tailwindcss.com/docs/order
         */
        order: [{
          order: [isInteger, "first", "last", "none", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Grid Template Columns
         * @see https://tailwindcss.com/docs/grid-template-columns
         */
        "grid-cols": [{
          "grid-cols": scaleGridTemplateColsRows()
        }],
        /**
         * Grid Column Start / End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start-end": [{
          col: scaleGridColRowStartAndEnd()
        }],
        /**
         * Grid Column Start
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start": [{
          "col-start": scaleGridColRowStartOrEnd()
        }],
        /**
         * Grid Column End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-end": [{
          "col-end": scaleGridColRowStartOrEnd()
        }],
        /**
         * Grid Template Rows
         * @see https://tailwindcss.com/docs/grid-template-rows
         */
        "grid-rows": [{
          "grid-rows": scaleGridTemplateColsRows()
        }],
        /**
         * Grid Row Start / End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start-end": [{
          row: scaleGridColRowStartAndEnd()
        }],
        /**
         * Grid Row Start
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start": [{
          "row-start": scaleGridColRowStartOrEnd()
        }],
        /**
         * Grid Row End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-end": [{
          "row-end": scaleGridColRowStartOrEnd()
        }],
        /**
         * Grid Auto Flow
         * @see https://tailwindcss.com/docs/grid-auto-flow
         */
        "grid-flow": [{
          "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
        }],
        /**
         * Grid Auto Columns
         * @see https://tailwindcss.com/docs/grid-auto-columns
         */
        "auto-cols": [{
          "auto-cols": scaleGridAutoColsRows()
        }],
        /**
         * Grid Auto Rows
         * @see https://tailwindcss.com/docs/grid-auto-rows
         */
        "auto-rows": [{
          "auto-rows": scaleGridAutoColsRows()
        }],
        /**
         * Gap
         * @see https://tailwindcss.com/docs/gap
         */
        gap: [{
          gap: scaleUnambiguousSpacing()
        }],
        /**
         * Gap X
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-x": [{
          "gap-x": scaleUnambiguousSpacing()
        }],
        /**
         * Gap Y
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-y": [{
          "gap-y": scaleUnambiguousSpacing()
        }],
        /**
         * Justify Content
         * @see https://tailwindcss.com/docs/justify-content
         */
        "justify-content": [{
          justify: [...scaleAlignPrimaryAxis(), "normal"]
        }],
        /**
         * Justify Items
         * @see https://tailwindcss.com/docs/justify-items
         */
        "justify-items": [{
          "justify-items": [...scaleAlignSecondaryAxis(), "normal"]
        }],
        /**
         * Justify Self
         * @see https://tailwindcss.com/docs/justify-self
         */
        "justify-self": [{
          "justify-self": ["auto", ...scaleAlignSecondaryAxis()]
        }],
        /**
         * Align Content
         * @see https://tailwindcss.com/docs/align-content
         */
        "align-content": [{
          content: ["normal", ...scaleAlignPrimaryAxis()]
        }],
        /**
         * Align Items
         * @see https://tailwindcss.com/docs/align-items
         */
        "align-items": [{
          items: [...scaleAlignSecondaryAxis(), {
            baseline: ["", "last"]
          }]
        }],
        /**
         * Align Self
         * @see https://tailwindcss.com/docs/align-self
         */
        "align-self": [{
          self: ["auto", ...scaleAlignSecondaryAxis(), {
            baseline: ["", "last"]
          }]
        }],
        /**
         * Place Content
         * @see https://tailwindcss.com/docs/place-content
         */
        "place-content": [{
          "place-content": scaleAlignPrimaryAxis()
        }],
        /**
         * Place Items
         * @see https://tailwindcss.com/docs/place-items
         */
        "place-items": [{
          "place-items": [...scaleAlignSecondaryAxis(), "baseline"]
        }],
        /**
         * Place Self
         * @see https://tailwindcss.com/docs/place-self
         */
        "place-self": [{
          "place-self": ["auto", ...scaleAlignSecondaryAxis()]
        }],
        // Spacing
        /**
         * Padding
         * @see https://tailwindcss.com/docs/padding
         */
        p: [{
          p: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Inline
         * @see https://tailwindcss.com/docs/padding
         */
        px: [{
          px: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Block
         * @see https://tailwindcss.com/docs/padding
         */
        py: [{
          py: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Inline Start
         * @see https://tailwindcss.com/docs/padding
         */
        ps: [{
          ps: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Inline End
         * @see https://tailwindcss.com/docs/padding
         */
        pe: [{
          pe: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Block Start
         * @see https://tailwindcss.com/docs/padding
         */
        pbs: [{
          pbs: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Block End
         * @see https://tailwindcss.com/docs/padding
         */
        pbe: [{
          pbe: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Top
         * @see https://tailwindcss.com/docs/padding
         */
        pt: [{
          pt: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Right
         * @see https://tailwindcss.com/docs/padding
         */
        pr: [{
          pr: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Bottom
         * @see https://tailwindcss.com/docs/padding
         */
        pb: [{
          pb: scaleUnambiguousSpacing()
        }],
        /**
         * Padding Left
         * @see https://tailwindcss.com/docs/padding
         */
        pl: [{
          pl: scaleUnambiguousSpacing()
        }],
        /**
         * Margin
         * @see https://tailwindcss.com/docs/margin
         */
        m: [{
          m: scaleMargin()
        }],
        /**
         * Margin Inline
         * @see https://tailwindcss.com/docs/margin
         */
        mx: [{
          mx: scaleMargin()
        }],
        /**
         * Margin Block
         * @see https://tailwindcss.com/docs/margin
         */
        my: [{
          my: scaleMargin()
        }],
        /**
         * Margin Inline Start
         * @see https://tailwindcss.com/docs/margin
         */
        ms: [{
          ms: scaleMargin()
        }],
        /**
         * Margin Inline End
         * @see https://tailwindcss.com/docs/margin
         */
        me: [{
          me: scaleMargin()
        }],
        /**
         * Margin Block Start
         * @see https://tailwindcss.com/docs/margin
         */
        mbs: [{
          mbs: scaleMargin()
        }],
        /**
         * Margin Block End
         * @see https://tailwindcss.com/docs/margin
         */
        mbe: [{
          mbe: scaleMargin()
        }],
        /**
         * Margin Top
         * @see https://tailwindcss.com/docs/margin
         */
        mt: [{
          mt: scaleMargin()
        }],
        /**
         * Margin Right
         * @see https://tailwindcss.com/docs/margin
         */
        mr: [{
          mr: scaleMargin()
        }],
        /**
         * Margin Bottom
         * @see https://tailwindcss.com/docs/margin
         */
        mb: [{
          mb: scaleMargin()
        }],
        /**
         * Margin Left
         * @see https://tailwindcss.com/docs/margin
         */
        ml: [{
          ml: scaleMargin()
        }],
        /**
         * Space Between X
         * @see https://tailwindcss.com/docs/margin#adding-space-between-children
         */
        "space-x": [{
          "space-x": scaleUnambiguousSpacing()
        }],
        /**
         * Space Between X Reverse
         * @see https://tailwindcss.com/docs/margin#adding-space-between-children
         */
        "space-x-reverse": ["space-x-reverse"],
        /**
         * Space Between Y
         * @see https://tailwindcss.com/docs/margin#adding-space-between-children
         */
        "space-y": [{
          "space-y": scaleUnambiguousSpacing()
        }],
        /**
         * Space Between Y Reverse
         * @see https://tailwindcss.com/docs/margin#adding-space-between-children
         */
        "space-y-reverse": ["space-y-reverse"],
        // --------------
        // --- Sizing ---
        // --------------
        /**
         * Size
         * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
         */
        size: [{
          size: scaleSizing()
        }],
        /**
         * Inline Size
         * @see https://tailwindcss.com/docs/width
         */
        "inline-size": [{
          inline: ["auto", ...scaleSizingInline()]
        }],
        /**
         * Min-Inline Size
         * @see https://tailwindcss.com/docs/min-width
         */
        "min-inline-size": [{
          "min-inline": ["auto", ...scaleSizingInline()]
        }],
        /**
         * Max-Inline Size
         * @see https://tailwindcss.com/docs/max-width
         */
        "max-inline-size": [{
          "max-inline": ["none", ...scaleSizingInline()]
        }],
        /**
         * Block Size
         * @see https://tailwindcss.com/docs/height
         */
        "block-size": [{
          block: ["auto", ...scaleSizingBlock()]
        }],
        /**
         * Min-Block Size
         * @see https://tailwindcss.com/docs/min-height
         */
        "min-block-size": [{
          "min-block": ["auto", ...scaleSizingBlock()]
        }],
        /**
         * Max-Block Size
         * @see https://tailwindcss.com/docs/max-height
         */
        "max-block-size": [{
          "max-block": ["none", ...scaleSizingBlock()]
        }],
        /**
         * Width
         * @see https://tailwindcss.com/docs/width
         */
        w: [{
          w: [themeContainer, "screen", ...scaleSizing()]
        }],
        /**
         * Min-Width
         * @see https://tailwindcss.com/docs/min-width
         */
        "min-w": [{
          "min-w": [
            themeContainer,
            "screen",
            /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
            "none",
            ...scaleSizing()
          ]
        }],
        /**
         * Max-Width
         * @see https://tailwindcss.com/docs/max-width
         */
        "max-w": [{
          "max-w": [
            themeContainer,
            "screen",
            "none",
            /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
            "prose",
            /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
            {
              screen: [themeBreakpoint]
            },
            ...scaleSizing()
          ]
        }],
        /**
         * Height
         * @see https://tailwindcss.com/docs/height
         */
        h: [{
          h: ["screen", "lh", ...scaleSizing()]
        }],
        /**
         * Min-Height
         * @see https://tailwindcss.com/docs/min-height
         */
        "min-h": [{
          "min-h": ["screen", "lh", "none", ...scaleSizing()]
        }],
        /**
         * Max-Height
         * @see https://tailwindcss.com/docs/max-height
         */
        "max-h": [{
          "max-h": ["screen", "lh", ...scaleSizing()]
        }],
        // ------------------
        // --- Typography ---
        // ------------------
        /**
         * Font Size
         * @see https://tailwindcss.com/docs/font-size
         */
        "font-size": [{
          text: ["base", themeText, isArbitraryVariableLength, isArbitraryLength]
        }],
        /**
         * Font Smoothing
         * @see https://tailwindcss.com/docs/font-smoothing
         */
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        /**
         * Font Style
         * @see https://tailwindcss.com/docs/font-style
         */
        "font-style": ["italic", "not-italic"],
        /**
         * Font Weight
         * @see https://tailwindcss.com/docs/font-weight
         */
        "font-weight": [{
          font: [themeFontWeight, isArbitraryVariableWeight, isArbitraryWeight]
        }],
        /**
         * Font Stretch
         * @see https://tailwindcss.com/docs/font-stretch
         */
        "font-stretch": [{
          "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", isPercent, isArbitraryValue]
        }],
        /**
         * Font Family
         * @see https://tailwindcss.com/docs/font-family
         */
        "font-family": [{
          font: [isArbitraryVariableFamilyName, isArbitraryFamilyName, themeFont]
        }],
        /**
         * Font Feature Settings
         * @see https://tailwindcss.com/docs/font-feature-settings
         */
        "font-features": [{
          "font-features": [isArbitraryValue]
        }],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-normal": ["normal-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-ordinal": ["ordinal"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-slashed-zero": ["slashed-zero"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
        /**
         * Letter Spacing
         * @see https://tailwindcss.com/docs/letter-spacing
         */
        tracking: [{
          tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Line Clamp
         * @see https://tailwindcss.com/docs/line-clamp
         */
        "line-clamp": [{
          "line-clamp": [isNumber, "none", isArbitraryVariable, isArbitraryNumber]
        }],
        /**
         * Line Height
         * @see https://tailwindcss.com/docs/line-height
         */
        leading: [{
          leading: [
            /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
            themeLeading,
            ...scaleUnambiguousSpacing()
          ]
        }],
        /**
         * List Style Image
         * @see https://tailwindcss.com/docs/list-style-image
         */
        "list-image": [{
          "list-image": ["none", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * List Style Position
         * @see https://tailwindcss.com/docs/list-style-position
         */
        "list-style-position": [{
          list: ["inside", "outside"]
        }],
        /**
         * List Style Type
         * @see https://tailwindcss.com/docs/list-style-type
         */
        "list-style-type": [{
          list: ["disc", "decimal", "none", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Text Alignment
         * @see https://tailwindcss.com/docs/text-align
         */
        "text-alignment": [{
          text: ["left", "center", "right", "justify", "start", "end"]
        }],
        /**
         * Placeholder Color
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://v3.tailwindcss.com/docs/placeholder-color
         */
        "placeholder-color": [{
          placeholder: scaleColor()
        }],
        /**
         * Text Color
         * @see https://tailwindcss.com/docs/text-color
         */
        "text-color": [{
          text: scaleColor()
        }],
        /**
         * Text Decoration
         * @see https://tailwindcss.com/docs/text-decoration
         */
        "text-decoration": ["underline", "overline", "line-through", "no-underline"],
        /**
         * Text Decoration Style
         * @see https://tailwindcss.com/docs/text-decoration-style
         */
        "text-decoration-style": [{
          decoration: [...scaleLineStyle(), "wavy"]
        }],
        /**
         * Text Decoration Thickness
         * @see https://tailwindcss.com/docs/text-decoration-thickness
         */
        "text-decoration-thickness": [{
          decoration: [isNumber, "from-font", "auto", isArbitraryVariable, isArbitraryLength]
        }],
        /**
         * Text Decoration Color
         * @see https://tailwindcss.com/docs/text-decoration-color
         */
        "text-decoration-color": [{
          decoration: scaleColor()
        }],
        /**
         * Text Underline Offset
         * @see https://tailwindcss.com/docs/text-underline-offset
         */
        "underline-offset": [{
          "underline-offset": [isNumber, "auto", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Text Transform
         * @see https://tailwindcss.com/docs/text-transform
         */
        "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
        /**
         * Text Overflow
         * @see https://tailwindcss.com/docs/text-overflow
         */
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        /**
         * Text Wrap
         * @see https://tailwindcss.com/docs/text-wrap
         */
        "text-wrap": [{
          text: ["wrap", "nowrap", "balance", "pretty"]
        }],
        /**
         * Text Indent
         * @see https://tailwindcss.com/docs/text-indent
         */
        indent: [{
          indent: scaleUnambiguousSpacing()
        }],
        /**
         * Vertical Alignment
         * @see https://tailwindcss.com/docs/vertical-align
         */
        "vertical-align": [{
          align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Whitespace
         * @see https://tailwindcss.com/docs/whitespace
         */
        whitespace: [{
          whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
        }],
        /**
         * Word Break
         * @see https://tailwindcss.com/docs/word-break
         */
        break: [{
          break: ["normal", "words", "all", "keep"]
        }],
        /**
         * Overflow Wrap
         * @see https://tailwindcss.com/docs/overflow-wrap
         */
        wrap: [{
          wrap: ["break-word", "anywhere", "normal"]
        }],
        /**
         * Hyphens
         * @see https://tailwindcss.com/docs/hyphens
         */
        hyphens: [{
          hyphens: ["none", "manual", "auto"]
        }],
        /**
         * Content
         * @see https://tailwindcss.com/docs/content
         */
        content: [{
          content: ["none", isArbitraryVariable, isArbitraryValue]
        }],
        // -------------------
        // --- Backgrounds ---
        // -------------------
        /**
         * Background Attachment
         * @see https://tailwindcss.com/docs/background-attachment
         */
        "bg-attachment": [{
          bg: ["fixed", "local", "scroll"]
        }],
        /**
         * Background Clip
         * @see https://tailwindcss.com/docs/background-clip
         */
        "bg-clip": [{
          "bg-clip": ["border", "padding", "content", "text"]
        }],
        /**
         * Background Origin
         * @see https://tailwindcss.com/docs/background-origin
         */
        "bg-origin": [{
          "bg-origin": ["border", "padding", "content"]
        }],
        /**
         * Background Position
         * @see https://tailwindcss.com/docs/background-position
         */
        "bg-position": [{
          bg: scaleBgPosition()
        }],
        /**
         * Background Repeat
         * @see https://tailwindcss.com/docs/background-repeat
         */
        "bg-repeat": [{
          bg: scaleBgRepeat()
        }],
        /**
         * Background Size
         * @see https://tailwindcss.com/docs/background-size
         */
        "bg-size": [{
          bg: scaleBgSize()
        }],
        /**
         * Background Image
         * @see https://tailwindcss.com/docs/background-image
         */
        "bg-image": [{
          bg: ["none", {
            linear: [{
              to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
            }, isInteger, isArbitraryVariable, isArbitraryValue],
            radial: ["", isArbitraryVariable, isArbitraryValue],
            conic: [isInteger, isArbitraryVariable, isArbitraryValue]
          }, isArbitraryVariableImage, isArbitraryImage]
        }],
        /**
         * Background Color
         * @see https://tailwindcss.com/docs/background-color
         */
        "bg-color": [{
          bg: scaleColor()
        }],
        /**
         * Gradient Color Stops From Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from-pos": [{
          from: scaleGradientStopPosition()
        }],
        /**
         * Gradient Color Stops Via Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via-pos": [{
          via: scaleGradientStopPosition()
        }],
        /**
         * Gradient Color Stops To Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to-pos": [{
          to: scaleGradientStopPosition()
        }],
        /**
         * Gradient Color Stops From
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from": [{
          from: scaleColor()
        }],
        /**
         * Gradient Color Stops Via
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via": [{
          via: scaleColor()
        }],
        /**
         * Gradient Color Stops To
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to": [{
          to: scaleColor()
        }],
        // ---------------
        // --- Borders ---
        // ---------------
        /**
         * Border Radius
         * @see https://tailwindcss.com/docs/border-radius
         */
        rounded: [{
          rounded: scaleRadius()
        }],
        /**
         * Border Radius Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-s": [{
          "rounded-s": scaleRadius()
        }],
        /**
         * Border Radius End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-e": [{
          "rounded-e": scaleRadius()
        }],
        /**
         * Border Radius Top
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-t": [{
          "rounded-t": scaleRadius()
        }],
        /**
         * Border Radius Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-r": [{
          "rounded-r": scaleRadius()
        }],
        /**
         * Border Radius Bottom
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-b": [{
          "rounded-b": scaleRadius()
        }],
        /**
         * Border Radius Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-l": [{
          "rounded-l": scaleRadius()
        }],
        /**
         * Border Radius Start Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ss": [{
          "rounded-ss": scaleRadius()
        }],
        /**
         * Border Radius Start End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-se": [{
          "rounded-se": scaleRadius()
        }],
        /**
         * Border Radius End End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ee": [{
          "rounded-ee": scaleRadius()
        }],
        /**
         * Border Radius End Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-es": [{
          "rounded-es": scaleRadius()
        }],
        /**
         * Border Radius Top Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tl": [{
          "rounded-tl": scaleRadius()
        }],
        /**
         * Border Radius Top Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tr": [{
          "rounded-tr": scaleRadius()
        }],
        /**
         * Border Radius Bottom Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-br": [{
          "rounded-br": scaleRadius()
        }],
        /**
         * Border Radius Bottom Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-bl": [{
          "rounded-bl": scaleRadius()
        }],
        /**
         * Border Width
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w": [{
          border: scaleBorderWidth()
        }],
        /**
         * Border Width Inline
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-x": [{
          "border-x": scaleBorderWidth()
        }],
        /**
         * Border Width Block
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-y": [{
          "border-y": scaleBorderWidth()
        }],
        /**
         * Border Width Inline Start
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-s": [{
          "border-s": scaleBorderWidth()
        }],
        /**
         * Border Width Inline End
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-e": [{
          "border-e": scaleBorderWidth()
        }],
        /**
         * Border Width Block Start
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-bs": [{
          "border-bs": scaleBorderWidth()
        }],
        /**
         * Border Width Block End
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-be": [{
          "border-be": scaleBorderWidth()
        }],
        /**
         * Border Width Top
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-t": [{
          "border-t": scaleBorderWidth()
        }],
        /**
         * Border Width Right
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-r": [{
          "border-r": scaleBorderWidth()
        }],
        /**
         * Border Width Bottom
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-b": [{
          "border-b": scaleBorderWidth()
        }],
        /**
         * Border Width Left
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-l": [{
          "border-l": scaleBorderWidth()
        }],
        /**
         * Divide Width X
         * @see https://tailwindcss.com/docs/border-width#between-children
         */
        "divide-x": [{
          "divide-x": scaleBorderWidth()
        }],
        /**
         * Divide Width X Reverse
         * @see https://tailwindcss.com/docs/border-width#between-children
         */
        "divide-x-reverse": ["divide-x-reverse"],
        /**
         * Divide Width Y
         * @see https://tailwindcss.com/docs/border-width#between-children
         */
        "divide-y": [{
          "divide-y": scaleBorderWidth()
        }],
        /**
         * Divide Width Y Reverse
         * @see https://tailwindcss.com/docs/border-width#between-children
         */
        "divide-y-reverse": ["divide-y-reverse"],
        /**
         * Border Style
         * @see https://tailwindcss.com/docs/border-style
         */
        "border-style": [{
          border: [...scaleLineStyle(), "hidden", "none"]
        }],
        /**
         * Divide Style
         * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
         */
        "divide-style": [{
          divide: [...scaleLineStyle(), "hidden", "none"]
        }],
        /**
         * Border Color
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color": [{
          border: scaleColor()
        }],
        /**
         * Border Color Inline
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-x": [{
          "border-x": scaleColor()
        }],
        /**
         * Border Color Block
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-y": [{
          "border-y": scaleColor()
        }],
        /**
         * Border Color Inline Start
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-s": [{
          "border-s": scaleColor()
        }],
        /**
         * Border Color Inline End
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-e": [{
          "border-e": scaleColor()
        }],
        /**
         * Border Color Block Start
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-bs": [{
          "border-bs": scaleColor()
        }],
        /**
         * Border Color Block End
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-be": [{
          "border-be": scaleColor()
        }],
        /**
         * Border Color Top
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-t": [{
          "border-t": scaleColor()
        }],
        /**
         * Border Color Right
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-r": [{
          "border-r": scaleColor()
        }],
        /**
         * Border Color Bottom
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-b": [{
          "border-b": scaleColor()
        }],
        /**
         * Border Color Left
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-l": [{
          "border-l": scaleColor()
        }],
        /**
         * Divide Color
         * @see https://tailwindcss.com/docs/divide-color
         */
        "divide-color": [{
          divide: scaleColor()
        }],
        /**
         * Outline Style
         * @see https://tailwindcss.com/docs/outline-style
         */
        "outline-style": [{
          outline: [...scaleLineStyle(), "none", "hidden"]
        }],
        /**
         * Outline Offset
         * @see https://tailwindcss.com/docs/outline-offset
         */
        "outline-offset": [{
          "outline-offset": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Outline Width
         * @see https://tailwindcss.com/docs/outline-width
         */
        "outline-w": [{
          outline: ["", isNumber, isArbitraryVariableLength, isArbitraryLength]
        }],
        /**
         * Outline Color
         * @see https://tailwindcss.com/docs/outline-color
         */
        "outline-color": [{
          outline: scaleColor()
        }],
        // ---------------
        // --- Effects ---
        // ---------------
        /**
         * Box Shadow
         * @see https://tailwindcss.com/docs/box-shadow
         */
        shadow: [{
          shadow: [
            // Deprecated since Tailwind CSS v4.0.0
            "",
            "none",
            themeShadow,
            isArbitraryVariableShadow,
            isArbitraryShadow
          ]
        }],
        /**
         * Box Shadow Color
         * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
         */
        "shadow-color": [{
          shadow: scaleColor()
        }],
        /**
         * Inset Box Shadow
         * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
         */
        "inset-shadow": [{
          "inset-shadow": ["none", themeInsetShadow, isArbitraryVariableShadow, isArbitraryShadow]
        }],
        /**
         * Inset Box Shadow Color
         * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
         */
        "inset-shadow-color": [{
          "inset-shadow": scaleColor()
        }],
        /**
         * Ring Width
         * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
         */
        "ring-w": [{
          ring: scaleBorderWidth()
        }],
        /**
         * Ring Width Inset
         * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
         * @deprecated since Tailwind CSS v4.0.0
         * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
         */
        "ring-w-inset": ["ring-inset"],
        /**
         * Ring Color
         * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
         */
        "ring-color": [{
          ring: scaleColor()
        }],
        /**
         * Ring Offset Width
         * @see https://v3.tailwindcss.com/docs/ring-offset-width
         * @deprecated since Tailwind CSS v4.0.0
         * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
         */
        "ring-offset-w": [{
          "ring-offset": [isNumber, isArbitraryLength]
        }],
        /**
         * Ring Offset Color
         * @see https://v3.tailwindcss.com/docs/ring-offset-color
         * @deprecated since Tailwind CSS v4.0.0
         * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
         */
        "ring-offset-color": [{
          "ring-offset": scaleColor()
        }],
        /**
         * Inset Ring Width
         * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
         */
        "inset-ring-w": [{
          "inset-ring": scaleBorderWidth()
        }],
        /**
         * Inset Ring Color
         * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
         */
        "inset-ring-color": [{
          "inset-ring": scaleColor()
        }],
        /**
         * Text Shadow
         * @see https://tailwindcss.com/docs/text-shadow
         */
        "text-shadow": [{
          "text-shadow": ["none", themeTextShadow, isArbitraryVariableShadow, isArbitraryShadow]
        }],
        /**
         * Text Shadow Color
         * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
         */
        "text-shadow-color": [{
          "text-shadow": scaleColor()
        }],
        /**
         * Opacity
         * @see https://tailwindcss.com/docs/opacity
         */
        opacity: [{
          opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Mix Blend Mode
         * @see https://tailwindcss.com/docs/mix-blend-mode
         */
        "mix-blend": [{
          "mix-blend": [...scaleBlendMode(), "plus-darker", "plus-lighter"]
        }],
        /**
         * Background Blend Mode
         * @see https://tailwindcss.com/docs/background-blend-mode
         */
        "bg-blend": [{
          "bg-blend": scaleBlendMode()
        }],
        /**
         * Mask Clip
         * @see https://tailwindcss.com/docs/mask-clip
         */
        "mask-clip": [{
          "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
        }, "mask-no-clip"],
        /**
         * Mask Composite
         * @see https://tailwindcss.com/docs/mask-composite
         */
        "mask-composite": [{
          mask: ["add", "subtract", "intersect", "exclude"]
        }],
        /**
         * Mask Image
         * @see https://tailwindcss.com/docs/mask-image
         */
        "mask-image-linear-pos": [{
          "mask-linear": [isNumber]
        }],
        "mask-image-linear-from-pos": [{
          "mask-linear-from": scaleMaskImagePosition()
        }],
        "mask-image-linear-to-pos": [{
          "mask-linear-to": scaleMaskImagePosition()
        }],
        "mask-image-linear-from-color": [{
          "mask-linear-from": scaleColor()
        }],
        "mask-image-linear-to-color": [{
          "mask-linear-to": scaleColor()
        }],
        "mask-image-t-from-pos": [{
          "mask-t-from": scaleMaskImagePosition()
        }],
        "mask-image-t-to-pos": [{
          "mask-t-to": scaleMaskImagePosition()
        }],
        "mask-image-t-from-color": [{
          "mask-t-from": scaleColor()
        }],
        "mask-image-t-to-color": [{
          "mask-t-to": scaleColor()
        }],
        "mask-image-r-from-pos": [{
          "mask-r-from": scaleMaskImagePosition()
        }],
        "mask-image-r-to-pos": [{
          "mask-r-to": scaleMaskImagePosition()
        }],
        "mask-image-r-from-color": [{
          "mask-r-from": scaleColor()
        }],
        "mask-image-r-to-color": [{
          "mask-r-to": scaleColor()
        }],
        "mask-image-b-from-pos": [{
          "mask-b-from": scaleMaskImagePosition()
        }],
        "mask-image-b-to-pos": [{
          "mask-b-to": scaleMaskImagePosition()
        }],
        "mask-image-b-from-color": [{
          "mask-b-from": scaleColor()
        }],
        "mask-image-b-to-color": [{
          "mask-b-to": scaleColor()
        }],
        "mask-image-l-from-pos": [{
          "mask-l-from": scaleMaskImagePosition()
        }],
        "mask-image-l-to-pos": [{
          "mask-l-to": scaleMaskImagePosition()
        }],
        "mask-image-l-from-color": [{
          "mask-l-from": scaleColor()
        }],
        "mask-image-l-to-color": [{
          "mask-l-to": scaleColor()
        }],
        "mask-image-x-from-pos": [{
          "mask-x-from": scaleMaskImagePosition()
        }],
        "mask-image-x-to-pos": [{
          "mask-x-to": scaleMaskImagePosition()
        }],
        "mask-image-x-from-color": [{
          "mask-x-from": scaleColor()
        }],
        "mask-image-x-to-color": [{
          "mask-x-to": scaleColor()
        }],
        "mask-image-y-from-pos": [{
          "mask-y-from": scaleMaskImagePosition()
        }],
        "mask-image-y-to-pos": [{
          "mask-y-to": scaleMaskImagePosition()
        }],
        "mask-image-y-from-color": [{
          "mask-y-from": scaleColor()
        }],
        "mask-image-y-to-color": [{
          "mask-y-to": scaleColor()
        }],
        "mask-image-radial": [{
          "mask-radial": [isArbitraryVariable, isArbitraryValue]
        }],
        "mask-image-radial-from-pos": [{
          "mask-radial-from": scaleMaskImagePosition()
        }],
        "mask-image-radial-to-pos": [{
          "mask-radial-to": scaleMaskImagePosition()
        }],
        "mask-image-radial-from-color": [{
          "mask-radial-from": scaleColor()
        }],
        "mask-image-radial-to-color": [{
          "mask-radial-to": scaleColor()
        }],
        "mask-image-radial-shape": [{
          "mask-radial": ["circle", "ellipse"]
        }],
        "mask-image-radial-size": [{
          "mask-radial": [{
            closest: ["side", "corner"],
            farthest: ["side", "corner"]
          }]
        }],
        "mask-image-radial-pos": [{
          "mask-radial-at": scalePosition()
        }],
        "mask-image-conic-pos": [{
          "mask-conic": [isNumber]
        }],
        "mask-image-conic-from-pos": [{
          "mask-conic-from": scaleMaskImagePosition()
        }],
        "mask-image-conic-to-pos": [{
          "mask-conic-to": scaleMaskImagePosition()
        }],
        "mask-image-conic-from-color": [{
          "mask-conic-from": scaleColor()
        }],
        "mask-image-conic-to-color": [{
          "mask-conic-to": scaleColor()
        }],
        /**
         * Mask Mode
         * @see https://tailwindcss.com/docs/mask-mode
         */
        "mask-mode": [{
          mask: ["alpha", "luminance", "match"]
        }],
        /**
         * Mask Origin
         * @see https://tailwindcss.com/docs/mask-origin
         */
        "mask-origin": [{
          "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
        }],
        /**
         * Mask Position
         * @see https://tailwindcss.com/docs/mask-position
         */
        "mask-position": [{
          mask: scaleBgPosition()
        }],
        /**
         * Mask Repeat
         * @see https://tailwindcss.com/docs/mask-repeat
         */
        "mask-repeat": [{
          mask: scaleBgRepeat()
        }],
        /**
         * Mask Size
         * @see https://tailwindcss.com/docs/mask-size
         */
        "mask-size": [{
          mask: scaleBgSize()
        }],
        /**
         * Mask Type
         * @see https://tailwindcss.com/docs/mask-type
         */
        "mask-type": [{
          "mask-type": ["alpha", "luminance"]
        }],
        /**
         * Mask Image
         * @see https://tailwindcss.com/docs/mask-image
         */
        "mask-image": [{
          mask: ["none", isArbitraryVariable, isArbitraryValue]
        }],
        // ---------------
        // --- Filters ---
        // ---------------
        /**
         * Filter
         * @see https://tailwindcss.com/docs/filter
         */
        filter: [{
          filter: [
            // Deprecated since Tailwind CSS v3.0.0
            "",
            "none",
            isArbitraryVariable,
            isArbitraryValue
          ]
        }],
        /**
         * Blur
         * @see https://tailwindcss.com/docs/blur
         */
        blur: [{
          blur: scaleBlur()
        }],
        /**
         * Brightness
         * @see https://tailwindcss.com/docs/brightness
         */
        brightness: [{
          brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Contrast
         * @see https://tailwindcss.com/docs/contrast
         */
        contrast: [{
          contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Drop Shadow
         * @see https://tailwindcss.com/docs/drop-shadow
         */
        "drop-shadow": [{
          "drop-shadow": [
            // Deprecated since Tailwind CSS v4.0.0
            "",
            "none",
            themeDropShadow,
            isArbitraryVariableShadow,
            isArbitraryShadow
          ]
        }],
        /**
         * Drop Shadow Color
         * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
         */
        "drop-shadow-color": [{
          "drop-shadow": scaleColor()
        }],
        /**
         * Grayscale
         * @see https://tailwindcss.com/docs/grayscale
         */
        grayscale: [{
          grayscale: ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Hue Rotate
         * @see https://tailwindcss.com/docs/hue-rotate
         */
        "hue-rotate": [{
          "hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Invert
         * @see https://tailwindcss.com/docs/invert
         */
        invert: [{
          invert: ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Saturate
         * @see https://tailwindcss.com/docs/saturate
         */
        saturate: [{
          saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Sepia
         * @see https://tailwindcss.com/docs/sepia
         */
        sepia: [{
          sepia: ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Filter
         * @see https://tailwindcss.com/docs/backdrop-filter
         */
        "backdrop-filter": [{
          "backdrop-filter": [
            // Deprecated since Tailwind CSS v3.0.0
            "",
            "none",
            isArbitraryVariable,
            isArbitraryValue
          ]
        }],
        /**
         * Backdrop Blur
         * @see https://tailwindcss.com/docs/backdrop-blur
         */
        "backdrop-blur": [{
          "backdrop-blur": scaleBlur()
        }],
        /**
         * Backdrop Brightness
         * @see https://tailwindcss.com/docs/backdrop-brightness
         */
        "backdrop-brightness": [{
          "backdrop-brightness": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Contrast
         * @see https://tailwindcss.com/docs/backdrop-contrast
         */
        "backdrop-contrast": [{
          "backdrop-contrast": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Grayscale
         * @see https://tailwindcss.com/docs/backdrop-grayscale
         */
        "backdrop-grayscale": [{
          "backdrop-grayscale": ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Hue Rotate
         * @see https://tailwindcss.com/docs/backdrop-hue-rotate
         */
        "backdrop-hue-rotate": [{
          "backdrop-hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Invert
         * @see https://tailwindcss.com/docs/backdrop-invert
         */
        "backdrop-invert": [{
          "backdrop-invert": ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Opacity
         * @see https://tailwindcss.com/docs/backdrop-opacity
         */
        "backdrop-opacity": [{
          "backdrop-opacity": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Saturate
         * @see https://tailwindcss.com/docs/backdrop-saturate
         */
        "backdrop-saturate": [{
          "backdrop-saturate": [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Backdrop Sepia
         * @see https://tailwindcss.com/docs/backdrop-sepia
         */
        "backdrop-sepia": [{
          "backdrop-sepia": ["", isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        // --------------
        // --- Tables ---
        // --------------
        /**
         * Border Collapse
         * @see https://tailwindcss.com/docs/border-collapse
         */
        "border-collapse": [{
          border: ["collapse", "separate"]
        }],
        /**
         * Border Spacing
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing": [{
          "border-spacing": scaleUnambiguousSpacing()
        }],
        /**
         * Border Spacing X
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-x": [{
          "border-spacing-x": scaleUnambiguousSpacing()
        }],
        /**
         * Border Spacing Y
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-y": [{
          "border-spacing-y": scaleUnambiguousSpacing()
        }],
        /**
         * Table Layout
         * @see https://tailwindcss.com/docs/table-layout
         */
        "table-layout": [{
          table: ["auto", "fixed"]
        }],
        /**
         * Caption Side
         * @see https://tailwindcss.com/docs/caption-side
         */
        caption: [{
          caption: ["top", "bottom"]
        }],
        // ---------------------------------
        // --- Transitions and Animation ---
        // ---------------------------------
        /**
         * Transition Property
         * @see https://tailwindcss.com/docs/transition-property
         */
        transition: [{
          transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Transition Behavior
         * @see https://tailwindcss.com/docs/transition-behavior
         */
        "transition-behavior": [{
          transition: ["normal", "discrete"]
        }],
        /**
         * Transition Duration
         * @see https://tailwindcss.com/docs/transition-duration
         */
        duration: [{
          duration: [isNumber, "initial", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Transition Timing Function
         * @see https://tailwindcss.com/docs/transition-timing-function
         */
        ease: [{
          ease: ["linear", "initial", themeEase, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Transition Delay
         * @see https://tailwindcss.com/docs/transition-delay
         */
        delay: [{
          delay: [isNumber, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Animation
         * @see https://tailwindcss.com/docs/animation
         */
        animate: [{
          animate: ["none", themeAnimate, isArbitraryVariable, isArbitraryValue]
        }],
        // ------------------
        // --- Transforms ---
        // ------------------
        /**
         * Backface Visibility
         * @see https://tailwindcss.com/docs/backface-visibility
         */
        backface: [{
          backface: ["hidden", "visible"]
        }],
        /**
         * Perspective
         * @see https://tailwindcss.com/docs/perspective
         */
        perspective: [{
          perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Perspective Origin
         * @see https://tailwindcss.com/docs/perspective-origin
         */
        "perspective-origin": [{
          "perspective-origin": scalePositionWithArbitrary()
        }],
        /**
         * Rotate
         * @see https://tailwindcss.com/docs/rotate
         */
        rotate: [{
          rotate: scaleRotate()
        }],
        /**
         * Rotate X
         * @see https://tailwindcss.com/docs/rotate
         */
        "rotate-x": [{
          "rotate-x": scaleRotate()
        }],
        /**
         * Rotate Y
         * @see https://tailwindcss.com/docs/rotate
         */
        "rotate-y": [{
          "rotate-y": scaleRotate()
        }],
        /**
         * Rotate Z
         * @see https://tailwindcss.com/docs/rotate
         */
        "rotate-z": [{
          "rotate-z": scaleRotate()
        }],
        /**
         * Scale
         * @see https://tailwindcss.com/docs/scale
         */
        scale: [{
          scale: scaleScale()
        }],
        /**
         * Scale X
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-x": [{
          "scale-x": scaleScale()
        }],
        /**
         * Scale Y
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-y": [{
          "scale-y": scaleScale()
        }],
        /**
         * Scale Z
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-z": [{
          "scale-z": scaleScale()
        }],
        /**
         * Scale 3D
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-3d": ["scale-3d"],
        /**
         * Skew
         * @see https://tailwindcss.com/docs/skew
         */
        skew: [{
          skew: scaleSkew()
        }],
        /**
         * Skew X
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-x": [{
          "skew-x": scaleSkew()
        }],
        /**
         * Skew Y
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-y": [{
          "skew-y": scaleSkew()
        }],
        /**
         * Transform
         * @see https://tailwindcss.com/docs/transform
         */
        transform: [{
          transform: [isArbitraryVariable, isArbitraryValue, "", "none", "gpu", "cpu"]
        }],
        /**
         * Transform Origin
         * @see https://tailwindcss.com/docs/transform-origin
         */
        "transform-origin": [{
          origin: scalePositionWithArbitrary()
        }],
        /**
         * Transform Style
         * @see https://tailwindcss.com/docs/transform-style
         */
        "transform-style": [{
          transform: ["3d", "flat"]
        }],
        /**
         * Translate
         * @see https://tailwindcss.com/docs/translate
         */
        translate: [{
          translate: scaleTranslate()
        }],
        /**
         * Translate X
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-x": [{
          "translate-x": scaleTranslate()
        }],
        /**
         * Translate Y
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-y": [{
          "translate-y": scaleTranslate()
        }],
        /**
         * Translate Z
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-z": [{
          "translate-z": scaleTranslate()
        }],
        /**
         * Translate None
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-none": ["translate-none"],
        // ---------------------
        // --- Interactivity ---
        // ---------------------
        /**
         * Accent Color
         * @see https://tailwindcss.com/docs/accent-color
         */
        accent: [{
          accent: scaleColor()
        }],
        /**
         * Appearance
         * @see https://tailwindcss.com/docs/appearance
         */
        appearance: [{
          appearance: ["none", "auto"]
        }],
        /**
         * Caret Color
         * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
         */
        "caret-color": [{
          caret: scaleColor()
        }],
        /**
         * Color Scheme
         * @see https://tailwindcss.com/docs/color-scheme
         */
        "color-scheme": [{
          scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
        }],
        /**
         * Cursor
         * @see https://tailwindcss.com/docs/cursor
         */
        cursor: [{
          cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryVariable, isArbitraryValue]
        }],
        /**
         * Field Sizing
         * @see https://tailwindcss.com/docs/field-sizing
         */
        "field-sizing": [{
          "field-sizing": ["fixed", "content"]
        }],
        /**
         * Pointer Events
         * @see https://tailwindcss.com/docs/pointer-events
         */
        "pointer-events": [{
          "pointer-events": ["auto", "none"]
        }],
        /**
         * Resize
         * @see https://tailwindcss.com/docs/resize
         */
        resize: [{
          resize: ["none", "", "y", "x"]
        }],
        /**
         * Scroll Behavior
         * @see https://tailwindcss.com/docs/scroll-behavior
         */
        "scroll-behavior": [{
          scroll: ["auto", "smooth"]
        }],
        /**
         * Scroll Margin
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-m": [{
          "scroll-m": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Inline
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mx": [{
          "scroll-mx": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Block
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-my": [{
          "scroll-my": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Inline Start
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ms": [{
          "scroll-ms": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Inline End
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-me": [{
          "scroll-me": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Block Start
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mbs": [{
          "scroll-mbs": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Block End
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mbe": [{
          "scroll-mbe": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Top
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mt": [{
          "scroll-mt": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Right
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mr": [{
          "scroll-mr": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Bottom
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mb": [{
          "scroll-mb": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Margin Left
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ml": [{
          "scroll-ml": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-p": [{
          "scroll-p": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Inline
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-px": [{
          "scroll-px": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Block
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-py": [{
          "scroll-py": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Inline Start
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-ps": [{
          "scroll-ps": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Inline End
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pe": [{
          "scroll-pe": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Block Start
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pbs": [{
          "scroll-pbs": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Block End
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pbe": [{
          "scroll-pbe": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Top
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pt": [{
          "scroll-pt": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Right
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pr": [{
          "scroll-pr": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Bottom
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pb": [{
          "scroll-pb": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Padding Left
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pl": [{
          "scroll-pl": scaleUnambiguousSpacing()
        }],
        /**
         * Scroll Snap Align
         * @see https://tailwindcss.com/docs/scroll-snap-align
         */
        "snap-align": [{
          snap: ["start", "end", "center", "align-none"]
        }],
        /**
         * Scroll Snap Stop
         * @see https://tailwindcss.com/docs/scroll-snap-stop
         */
        "snap-stop": [{
          snap: ["normal", "always"]
        }],
        /**
         * Scroll Snap Type
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-type": [{
          snap: ["none", "x", "y", "both"]
        }],
        /**
         * Scroll Snap Type Strictness
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-strictness": [{
          snap: ["mandatory", "proximity"]
        }],
        /**
         * Touch Action
         * @see https://tailwindcss.com/docs/touch-action
         */
        touch: [{
          touch: ["auto", "none", "manipulation"]
        }],
        /**
         * Touch Action X
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-x": [{
          "touch-pan": ["x", "left", "right"]
        }],
        /**
         * Touch Action Y
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-y": [{
          "touch-pan": ["y", "up", "down"]
        }],
        /**
         * Touch Action Pinch Zoom
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-pz": ["touch-pinch-zoom"],
        /**
         * User Select
         * @see https://tailwindcss.com/docs/user-select
         */
        select: [{
          select: ["none", "text", "all", "auto"]
        }],
        /**
         * Will Change
         * @see https://tailwindcss.com/docs/will-change
         */
        "will-change": [{
          "will-change": ["auto", "scroll", "contents", "transform", isArbitraryVariable, isArbitraryValue]
        }],
        // -----------
        // --- SVG ---
        // -----------
        /**
         * Fill
         * @see https://tailwindcss.com/docs/fill
         */
        fill: [{
          fill: ["none", ...scaleColor()]
        }],
        /**
         * Stroke Width
         * @see https://tailwindcss.com/docs/stroke-width
         */
        "stroke-w": [{
          stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
        }],
        /**
         * Stroke
         * @see https://tailwindcss.com/docs/stroke
         */
        stroke: [{
          stroke: ["none", ...scaleColor()]
        }],
        // ---------------------
        // --- Accessibility ---
        // ---------------------
        /**
         * Forced Color Adjust
         * @see https://tailwindcss.com/docs/forced-color-adjust
         */
        "forced-color-adjust": [{
          "forced-color-adjust": ["auto", "none"]
        }]
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        translate: ["translate-x", "translate-y", "translate-none"],
        "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
        "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"]
      },
      conflictingClassGroupModifiers: {
        "font-size": ["leading"]
      },
      orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
    };
  };
  var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);

  // src/lib/utils/index.ts
  function cn(...inputs) {
    return twMerge(clsx(inputs));
  }

  // src/components/ui/badge.tsx
  var badgeVariants = cva(
    "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
          secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
          destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
          outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
          ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
          link: "text-primary underline-offset-4 hover:underline"
        }
      },
      defaultVariants: {
        variant: "default"
      }
    }
  );
  function Badge({
    className,
    variant = "default",
    render,
    ...props
  }) {
    return useRender({
      defaultTagName: "span",
      props: mergeProps(
        {
          className: cn(badgeVariants({ variant }), className)
        },
        props
      ),
      render,
      state: {
        slot: "badge",
        variant
      }
    });
  }

  // src/components/ui/button.tsx
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/button/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/button/Button.js
  init_define_import_meta_env();
  var React11 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/use-button/useButton.js
  init_define_import_meta_env();
  var React10 = __toESM(require_react_shim(), 1);

  // node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
  init_define_import_meta_env();
  function hasWindow() {
    return typeof window !== "undefined";
  }
  function getNodeName(node) {
    if (isNode(node)) {
      return (node.nodeName || "").toLowerCase();
    }
    return "#document";
  }
  function getWindow(node) {
    var _node$ownerDocument;
    return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
  }
  function getDocumentElement(node) {
    var _ref;
    return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
  }
  function isNode(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof Node || value instanceof getWindow(value).Node;
  }
  function isElement(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof Element || value instanceof getWindow(value).Element;
  }
  function isHTMLElement(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
  }
  function isShadowRoot(value) {
    if (!hasWindow() || typeof ShadowRoot === "undefined") {
      return false;
    }
    return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
  }
  function isOverflowElement(element) {
    const {
      overflow,
      overflowX,
      overflowY,
      display
    } = getComputedStyle2(element);
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
  }
  var isWebKitValue;
  function isWebKit() {
    if (isWebKitValue == null) {
      isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
    }
    return isWebKitValue;
  }
  function isLastTraversableNode(node) {
    return /^(html|body|#document)$/.test(getNodeName(node));
  }
  function getComputedStyle2(element) {
    return getWindow(element).getComputedStyle(element);
  }
  function getParentNode(node) {
    if (getNodeName(node) === "html") {
      return node;
    }
    const result = (
      // Step into the shadow DOM of the parent of a slotted node.
      node.assignedSlot || // DOM Element detected.
      node.parentNode || // ShadowRoot detected.
      isShadowRoot(node) && node.host || // Fallback.
      getDocumentElement(node)
    );
    return isShadowRoot(result) ? result.host : result;
  }

  // node_modules/@base-ui/utils/esm/useStableCallback.js
  init_define_import_meta_env();
  var React5 = __toESM(require_react_shim(), 1);
  var useInsertionEffect = React5[`useInsertionEffect${Math.random().toFixed(1)}`.slice(0, -3)];
  var useSafeInsertionEffect = (
    // React 17 doesn't have useInsertionEffect.
    useInsertionEffect && // Preact replaces useInsertionEffect with useLayoutEffect and fires too late.
    useInsertionEffect !== React5.useLayoutEffect ? useInsertionEffect : (fn) => fn()
  );
  function useStableCallback(callback) {
    const stable = useRefWithInit(createStableCallback).current;
    stable.next = callback;
    useSafeInsertionEffect(stable.effect);
    return stable.trampoline;
  }
  function createStableCallback() {
    const stable = {
      next: void 0,
      callback: assertNotCalled,
      trampoline: (...args) => stable.callback?.(...args),
      effect: () => {
        stable.callback = stable.next;
      }
    };
    return stable;
  }
  function assertNotCalled() {
    if (true) {
      throw (
        /* minify-error-disabled */
        new Error("Base UI: Cannot call an event handler while rendering.")
      );
    }
  }

  // node_modules/@base-ui/utils/esm/error.js
  init_define_import_meta_env();
  var set2;
  if (true) {
    set2 = /* @__PURE__ */ new Set();
  }
  function error(...messages) {
    if (true) {
      const messageKey = messages.join(" ");
      if (!set2.has(messageKey)) {
        set2.add(messageKey);
        console.error(`Base UI: ${messageKey}`);
      }
    }
  }

  // node_modules/@base-ui/utils/esm/safeReact.js
  init_define_import_meta_env();
  var React6 = __toESM(require_react_shim(), 1);
  var SafeReact = {
    ...React6
  };

  // node_modules/@base-ui/utils/esm/useIsoLayoutEffect.js
  init_define_import_meta_env();
  var React7 = __toESM(require_react_shim(), 1);
  var noop = () => {
  };
  var useIsoLayoutEffect = typeof document !== "undefined" ? React7.useLayoutEffect : noop;

  // node_modules/@base-ui/react/esm/internals/composite/root/CompositeRootContext.js
  init_define_import_meta_env();
  var React8 = __toESM(require_react_shim(), 1);
  var CompositeRootContext = /* @__PURE__ */ React8.createContext(void 0);
  if (true) CompositeRootContext.displayName = "CompositeRootContext";
  function useCompositeRootContext(optional = false) {
    const context = React8.useContext(CompositeRootContext);
    if (context === void 0 && !optional) {
      throw new Error(true ? "Base UI: CompositeRootContext is missing. Composite parts must be placed within <Composite.Root>." : formatErrorMessage_default(16));
    }
    return context;
  }

  // node_modules/@base-ui/react/esm/utils/useFocusableWhenDisabled.js
  init_define_import_meta_env();
  var React9 = __toESM(require_react_shim(), 1);
  function useFocusableWhenDisabled(parameters) {
    const {
      focusableWhenDisabled,
      disabled: disabled2,
      composite = false,
      tabIndex: tabIndexProp = 0,
      isNativeButton
    } = parameters;
    const isFocusableComposite = composite && focusableWhenDisabled !== false;
    const isNonFocusableComposite = composite && focusableWhenDisabled === false;
    const props = React9.useMemo(() => {
      const additionalProps = {
        // allow Tabbing away from focusableWhenDisabled elements
        onKeyDown(event) {
          if (disabled2 && focusableWhenDisabled && event.key !== "Tab") {
            event.preventDefault();
          }
        }
      };
      if (!composite) {
        additionalProps.tabIndex = tabIndexProp;
        if (!isNativeButton && disabled2) {
          additionalProps.tabIndex = focusableWhenDisabled ? tabIndexProp : -1;
        }
      }
      if (isNativeButton && (focusableWhenDisabled || isFocusableComposite) || !isNativeButton && disabled2) {
        additionalProps["aria-disabled"] = disabled2;
      }
      if (isNativeButton && (!focusableWhenDisabled || isNonFocusableComposite)) {
        additionalProps.disabled = disabled2;
      }
      return additionalProps;
    }, [composite, disabled2, focusableWhenDisabled, isFocusableComposite, isNonFocusableComposite, isNativeButton, tabIndexProp]);
    return {
      props
    };
  }

  // node_modules/@base-ui/react/esm/internals/use-button/useButton.js
  function useButton(parameters = {}) {
    const {
      disabled: disabled2 = false,
      focusableWhenDisabled,
      tabIndex = 0,
      native: isNativeButton = true,
      composite: compositeProp
    } = parameters;
    const elementRef = React10.useRef(null);
    const compositeRootContext = useCompositeRootContext(true);
    const isCompositeItem = compositeProp ?? compositeRootContext !== void 0;
    const {
      props: focusableWhenDisabledProps
    } = useFocusableWhenDisabled({
      focusableWhenDisabled,
      disabled: disabled2,
      composite: isCompositeItem,
      tabIndex,
      isNativeButton
    });
    if (true) {
      React10.useEffect(() => {
        if (!elementRef.current) {
          return;
        }
        const isButtonTag = isButtonElement(elementRef.current);
        if (isNativeButton) {
          if (!isButtonTag) {
            const ownerStackMessage = SafeReact.captureOwnerStack?.() || "";
            const message = "A component that acts as a button expected a native <button> because the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, which can impact forms and accessibility. Use a real <button> in the `render` prop, or set `nativeButton` to `false`.";
            error(`${message}${ownerStackMessage}`);
          }
        } else if (isButtonTag) {
          const ownerStackMessage = SafeReact.captureOwnerStack?.() || "";
          const message = "A component that acts as a button expected a non-<button> because the `nativeButton` prop is false. Rendering a <button> keeps native behavior while Base UI applies non-native attributes and handlers, which can add unintended extra attributes (such as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set `nativeButton` to `true`.";
          error(`${message}${ownerStackMessage}`);
        }
      }, [isNativeButton]);
    }
    const updateDisabled = React10.useCallback(() => {
      const element = elementRef.current;
      if (!isButtonElement(element)) {
        return;
      }
      if (isCompositeItem && disabled2 && focusableWhenDisabledProps.disabled === void 0 && element.disabled) {
        element.disabled = false;
      }
    }, [disabled2, focusableWhenDisabledProps.disabled, isCompositeItem]);
    useIsoLayoutEffect(updateDisabled, [updateDisabled]);
    const getButtonProps = React10.useCallback((externalProps = {}) => {
      const {
        onClick: externalOnClick,
        onMouseDown: externalOnMouseDown,
        onKeyUp: externalOnKeyUp,
        onKeyDown: externalOnKeyDown,
        onPointerDown: externalOnPointerDown,
        ...otherExternalProps
      } = externalProps;
      const type = isNativeButton ? "button" : void 0;
      return mergeProps({
        type,
        onClick(event) {
          if (disabled2) {
            event.preventDefault();
            return;
          }
          externalOnClick?.(event);
        },
        onMouseDown(event) {
          if (!disabled2) {
            externalOnMouseDown?.(event);
          }
        },
        onKeyDown(event) {
          if (disabled2) {
            return;
          }
          makeEventPreventable(event);
          externalOnKeyDown?.(event);
          if (event.baseUIHandlerPrevented) {
            return;
          }
          const isCurrentTarget = event.target === event.currentTarget;
          const currentTarget = event.currentTarget;
          const isButton = isButtonElement(currentTarget);
          const isLink = !isNativeButton && isValidLinkElement(currentTarget);
          const shouldClick = isCurrentTarget && (isNativeButton ? isButton : !isLink);
          const isEnterKey = event.key === "Enter";
          const isSpaceKey = event.key === " ";
          const role = currentTarget.getAttribute("role");
          const isTextNavigationRole = role?.startsWith("menuitem") || role === "option" || role === "gridcell";
          if (isCurrentTarget && isCompositeItem && isSpaceKey) {
            if (event.defaultPrevented && isTextNavigationRole) {
              return;
            }
            event.preventDefault();
            if (isLink || isNativeButton && isButton) {
              currentTarget.click();
              event.preventBaseUIHandler();
            } else if (shouldClick) {
              externalOnClick?.(event);
              event.preventBaseUIHandler();
            }
            return;
          }
          if (shouldClick) {
            if (!isNativeButton && (isSpaceKey || isEnterKey)) {
              event.preventDefault();
            }
            if (!isNativeButton && isEnterKey) {
              externalOnClick?.(event);
            }
          }
        },
        onKeyUp(event) {
          if (disabled2) {
            return;
          }
          makeEventPreventable(event);
          externalOnKeyUp?.(event);
          if (event.target === event.currentTarget && isNativeButton && isCompositeItem && isButtonElement(event.currentTarget) && event.key === " ") {
            event.preventDefault();
            return;
          }
          if (event.baseUIHandlerPrevented) {
            return;
          }
          if (event.target === event.currentTarget && !isNativeButton && !isCompositeItem && event.key === " ") {
            externalOnClick?.(event);
          }
        },
        onPointerDown(event) {
          if (disabled2) {
            event.preventDefault();
            return;
          }
          externalOnPointerDown?.(event);
        }
      }, !isNativeButton ? {
        role: "button"
      } : void 0, focusableWhenDisabledProps, otherExternalProps);
    }, [disabled2, focusableWhenDisabledProps, isCompositeItem, isNativeButton]);
    const buttonRef = useStableCallback((element) => {
      elementRef.current = element;
      updateDisabled();
    });
    return {
      getButtonProps,
      buttonRef
    };
  }
  function isButtonElement(elem) {
    return isHTMLElement(elem) && elem.tagName === "BUTTON";
  }
  function isValidLinkElement(elem) {
    return Boolean(elem?.tagName === "A" && elem?.href);
  }

  // node_modules/@base-ui/react/esm/button/Button.js
  var Button = /* @__PURE__ */ React11.forwardRef(function Button2(componentProps, forwardedRef) {
    const {
      render,
      className,
      disabled: disabled2 = false,
      focusableWhenDisabled = false,
      nativeButton = true,
      style,
      ...elementProps
    } = componentProps;
    const {
      getButtonProps,
      buttonRef
    } = useButton({
      disabled: disabled2,
      focusableWhenDisabled,
      native: nativeButton
    });
    const state = {
      disabled: disabled2
    };
    return useRenderElement("button", componentProps, {
      state,
      ref: [forwardedRef, buttonRef],
      props: [elementProps, getButtonProps]
    });
  });
  if (true) Button.displayName = "Button";

  // src/components/ui/button.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
          outline: "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
          secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
          ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
          destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
          link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
          default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
          xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
          sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
          lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
          icon: "size-8",
          "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
          "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
          "icon-lg": "size-9"
        }
      },
      defaultVariants: {
        variant: "default",
        size: "default"
      }
    }
  );
  function Button3({
    className,
    variant = "default",
    size = "default",
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button,
      {
        "data-slot": "button",
        className: cn(buttonVariants({ variant, size, className })),
        ...props
      }
    );
  }

  // src/components/ui/card.tsx
  init_define_import_meta_env();
  var import_jsx_runtime2 = __toESM(require_react_shim());
  function Card({
    className,
    size = "default",
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card",
        "data-size": size,
        className: cn(
          "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
          className
        ),
        ...props
      }
    );
  }
  function CardHeader({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-header",
        className: cn(
          "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
          className
        ),
        ...props
      }
    );
  }
  function CardTitle({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-title",
        className: cn(
          "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
          className
        ),
        ...props
      }
    );
  }
  function CardDescription({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-description",
        className: cn("text-sm text-muted-foreground", className),
        ...props
      }
    );
  }
  function CardAction({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-action",
        className: cn(
          "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
          className
        ),
        ...props
      }
    );
  }
  function CardContent({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-content",
        className: cn("px-4 group-data-[size=sm]/card:px-3", className),
        ...props
      }
    );
  }
  function CardFooter({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        "data-slot": "card-footer",
        className: cn(
          "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
          className
        ),
        ...props
      }
    );
  }

  // src/components/ui/date-input.tsx
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/lucide-react.mjs
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/createLucideIcon.mjs
  init_define_import_meta_env();
  var import_react4 = __toESM(require_react_shim(), 1);

  // node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
  init_define_import_meta_env();
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();

  // node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
  init_define_import_meta_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  // node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
  init_define_import_meta_env();
  var toCamelCase = (string) => string.replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
  );

  // node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
  var toPascalCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };

  // node_modules/lucide-react/dist/esm/Icon.mjs
  init_define_import_meta_env();
  var import_react3 = __toESM(require_react_shim(), 1);

  // node_modules/lucide-react/dist/esm/defaultAttributes.mjs
  init_define_import_meta_env();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
  init_define_import_meta_env();
  var hasA11yProp = (props) => {
    for (const prop in props) {
      if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
        return true;
      }
    }
    return false;
  };

  // node_modules/lucide-react/dist/esm/context.mjs
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim(), 1);
  var LucideContext = (0, import_react2.createContext)({});
  var useLucideContext = () => (0, import_react2.useContext)(LucideContext);

  // node_modules/lucide-react/dist/esm/Icon.mjs
  var Icon = (0, import_react3.forwardRef)(
    ({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
      const {
        size: contextSize = 24,
        strokeWidth: contextStrokeWidth = 2,
        absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
        color: contextColor = "currentColor",
        className: contextClass = ""
      } = useLucideContext() ?? {};
      const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
      return (0, import_react3.createElement)(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size ?? contextSize ?? defaultAttributes.width,
          height: size ?? contextSize ?? defaultAttributes.height,
          stroke: color ?? contextColor,
          strokeWidth: calculatedStrokeWidth,
          className: mergeClasses("lucide", contextClass, className),
          ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => (0, import_react3.createElement)(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.mjs
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react4.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react4.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(
          `lucide-${toKebabCase(toPascalCase(iconName))}`,
          `lucide-${iconName}`,
          className
        ),
        ...props
      })
    );
    Component.displayName = toPascalCase(iconName);
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/calendar-days.mjs
  init_define_import_meta_env();
  var __iconNode = [
    ["path", { d: "M8 2v4", key: "1cmpym" }],
    ["path", { d: "M16 2v4", key: "4m81vk" }],
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
    ["path", { d: "M3 10h18", key: "8toen8" }],
    ["path", { d: "M8 14h.01", key: "6423bh" }],
    ["path", { d: "M12 14h.01", key: "1etili" }],
    ["path", { d: "M16 14h.01", key: "1gbofw" }],
    ["path", { d: "M8 18h.01", key: "lrp35t" }],
    ["path", { d: "M12 18h.01", key: "mhygvu" }],
    ["path", { d: "M16 18h.01", key: "kzsmim" }]
  ];
  var CalendarDays = createLucideIcon("calendar-days", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/x.mjs
  init_define_import_meta_env();
  var __iconNode2 = [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ];
  var X = createLucideIcon("x", __iconNode2);

  // src/components/ui/date-input.tsx
  var React12 = __toESM(require_react_shim());

  // src/lib/utils/date-mask.ts
  init_define_import_meta_env();
  function maskDateValue(raw) {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  }

  // src/components/ui/input-class.ts
  init_define_import_meta_env();
  var INPUT_BASE_CLASS = "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

  // src/components/ui/date-input.tsx
  var import_jsx_runtime3 = __toESM(require_react_shim());
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  function DateInput({
    className,
    value,
    defaultValue,
    onChange,
    disabled: disabled2,
    min,
    max,
    placeholder,
    ...props
  }) {
    const pickerRef = React12.useRef(null);
    const isControlled = value !== void 0;
    const [internal, setInternal] = React12.useState(
      typeof defaultValue === "string" ? defaultValue : ""
    );
    const current = isControlled ? typeof value === "string" ? value : "" : internal;
    function emit(event, next) {
      if (!isControlled) setInternal(next);
      onChange?.(event);
    }
    function handleText(event) {
      const masked = maskDateValue(event.target.value);
      event.target.value = masked;
      emit(event, masked);
    }
    function handlePicker(event) {
      emit(event, event.target.value);
    }
    function openPicker() {
      if (disabled2) return;
      const el = pickerRef.current;
      try {
        el?.showPicker?.();
      } catch {
      }
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "relative w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          ...props,
          type: "text",
          inputMode: "numeric",
          autoComplete: "off",
          placeholder: placeholder ?? "YYYY-MM-DD",
          value: current,
          onChange: handleText,
          disabled: disabled2,
          className: cn(INPUT_BASE_CLASS, "pr-9", className)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          tabIndex: -1,
          "aria-label": "Open calendar",
          onClick: openPicker,
          disabled: disabled2,
          className: "absolute right-1 top-1/2 flex h-6 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CalendarDays, { className: "h-4 w-4" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          ref: pickerRef,
          type: "date",
          value: ISO_DATE.test(current) ? current : "",
          min: typeof min === "string" ? min : void 0,
          max: typeof max === "string" ? max : void 0,
          onChange: handlePicker,
          tabIndex: -1,
          "aria-hidden": true,
          className: "pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
        }
      )
    ] });
  }

  // src/components/ui/dialog.tsx
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/dialog/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/dialog/index.parts.js
  var index_parts_exports = {};
  __export(index_parts_exports, {
    Backdrop: () => DialogBackdrop,
    Close: () => DialogClose,
    Description: () => DialogDescription,
    Handle: () => DialogHandle,
    Popup: () => DialogPopup,
    Portal: () => DialogPortal,
    Root: () => DialogRoot,
    Title: () => DialogTitle,
    Trigger: () => DialogTrigger,
    Viewport: () => DialogViewport,
    createHandle: () => createDialogHandle
  });
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/dialog/backdrop/DialogBackdrop.js
  init_define_import_meta_env();
  var React14 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/dialog/root/DialogRootContext.js
  init_define_import_meta_env();
  var React13 = __toESM(require_react_shim(), 1);
  var DialogRootContext = /* @__PURE__ */ React13.createContext(void 0);
  if (true) DialogRootContext.displayName = "DialogRootContext";
  function useDialogRootContext(optional) {
    const dialogRootContext = React13.useContext(DialogRootContext);
    if (optional === false && dialogRootContext === void 0) {
      throw new Error(true ? "Base UI: DialogRootContext is missing. Dialog parts must be placed within <Dialog.Root>." : formatErrorMessage_default(27));
    }
    return dialogRootContext;
  }

  // node_modules/@base-ui/react/esm/utils/popupStateMapping.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/stateAttributesMapping.js
  init_define_import_meta_env();
  var TransitionStatusDataAttributes = /* @__PURE__ */ (function(TransitionStatusDataAttributes2) {
    TransitionStatusDataAttributes2["startingStyle"] = "data-starting-style";
    TransitionStatusDataAttributes2["endingStyle"] = "data-ending-style";
    return TransitionStatusDataAttributes2;
  })({});
  var STARTING_HOOK = {
    [TransitionStatusDataAttributes.startingStyle]: ""
  };
  var ENDING_HOOK = {
    [TransitionStatusDataAttributes.endingStyle]: ""
  };
  var transitionStatusMapping = {
    transitionStatus(value) {
      if (value === "starting") {
        return STARTING_HOOK;
      }
      if (value === "ending") {
        return ENDING_HOOK;
      }
      return null;
    }
  };

  // node_modules/@base-ui/react/esm/utils/popupStateMapping.js
  var CommonPopupDataAttributes = (function(CommonPopupDataAttributes2) {
    CommonPopupDataAttributes2["open"] = "data-open";
    CommonPopupDataAttributes2["closed"] = "data-closed";
    CommonPopupDataAttributes2[CommonPopupDataAttributes2["startingStyle"] = TransitionStatusDataAttributes.startingStyle] = "startingStyle";
    CommonPopupDataAttributes2[CommonPopupDataAttributes2["endingStyle"] = TransitionStatusDataAttributes.endingStyle] = "endingStyle";
    CommonPopupDataAttributes2["anchorHidden"] = "data-anchor-hidden";
    CommonPopupDataAttributes2["side"] = "data-side";
    CommonPopupDataAttributes2["align"] = "data-align";
    return CommonPopupDataAttributes2;
  })({});
  var CommonTriggerDataAttributes = /* @__PURE__ */ (function(CommonTriggerDataAttributes2) {
    CommonTriggerDataAttributes2["popupOpen"] = "data-popup-open";
    CommonTriggerDataAttributes2["pressed"] = "data-pressed";
    return CommonTriggerDataAttributes2;
  })({});
  var TRIGGER_HOOK = {
    [CommonTriggerDataAttributes.popupOpen]: ""
  };
  var PRESSABLE_TRIGGER_HOOK = {
    [CommonTriggerDataAttributes.popupOpen]: "",
    [CommonTriggerDataAttributes.pressed]: ""
  };
  var POPUP_OPEN_HOOK = {
    [CommonPopupDataAttributes.open]: ""
  };
  var POPUP_CLOSED_HOOK = {
    [CommonPopupDataAttributes.closed]: ""
  };
  var ANCHOR_HIDDEN_HOOK = {
    [CommonPopupDataAttributes.anchorHidden]: ""
  };
  var triggerOpenStateMapping = {
    open(value) {
      if (value) {
        return TRIGGER_HOOK;
      }
      return null;
    }
  };
  var popupStateMapping = {
    open(value) {
      if (value) {
        return POPUP_OPEN_HOOK;
      }
      return POPUP_CLOSED_HOOK;
    },
    anchorHidden(value) {
      if (value) {
        return ANCHOR_HIDDEN_HOOK;
      }
      return null;
    }
  };

  // node_modules/@base-ui/react/esm/dialog/backdrop/DialogBackdrop.js
  var stateAttributesMapping = {
    ...popupStateMapping,
    ...transitionStatusMapping
  };
  var DialogBackdrop = /* @__PURE__ */ React14.forwardRef(function DialogBackdrop2(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      forceRender = false,
      ...elementProps
    } = componentProps;
    const {
      store
    } = useDialogRootContext();
    const open = store.useState("open");
    const nested = store.useState("nested");
    const mounted = store.useState("mounted");
    const transitionStatus = store.useState("transitionStatus");
    const state = {
      open,
      transitionStatus
    };
    return useRenderElement("div", componentProps, {
      state,
      ref: [store.context.backdropRef, forwardedRef],
      stateAttributesMapping,
      props: [{
        role: "presentation",
        hidden: !mounted,
        style: {
          userSelect: "none",
          WebkitUserSelect: "none"
        }
      }, elementProps],
      enabled: forceRender || !nested
    });
  });
  if (true) DialogBackdrop.displayName = "DialogBackdrop";

  // node_modules/@base-ui/react/esm/dialog/close/DialogClose.js
  init_define_import_meta_env();
  var React15 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/use-button/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/createBaseUIEventDetails.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/reasons.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/reason-parts.js
  var reason_parts_exports = {};
  __export(reason_parts_exports, {
    cancelOpen: () => cancelOpen,
    chipRemovePress: () => chipRemovePress,
    clearPress: () => clearPress,
    closePress: () => closePress,
    closeWatcher: () => closeWatcher,
    decrementPress: () => decrementPress,
    disabled: () => disabled,
    drag: () => drag,
    escapeKey: () => escapeKey,
    focusOut: () => focusOut,
    imperativeAction: () => imperativeAction,
    incrementPress: () => incrementPress,
    inputBlur: () => inputBlur,
    inputChange: () => inputChange,
    inputClear: () => inputClear,
    inputPaste: () => inputPaste,
    inputPress: () => inputPress,
    itemPress: () => itemPress,
    keyboard: () => keyboard,
    linkPress: () => linkPress,
    listNavigation: () => listNavigation,
    none: () => none,
    outsidePress: () => outsidePress,
    pointer: () => pointer,
    scrub: () => scrub,
    siblingOpen: () => siblingOpen,
    swipe: () => swipe,
    trackPress: () => trackPress,
    triggerFocus: () => triggerFocus,
    triggerHover: () => triggerHover,
    triggerPress: () => triggerPress,
    wheel: () => wheel,
    windowResize: () => windowResize
  });
  init_define_import_meta_env();
  var none = "none";
  var triggerPress = "trigger-press";
  var triggerHover = "trigger-hover";
  var triggerFocus = "trigger-focus";
  var outsidePress = "outside-press";
  var itemPress = "item-press";
  var closePress = "close-press";
  var linkPress = "link-press";
  var clearPress = "clear-press";
  var chipRemovePress = "chip-remove-press";
  var trackPress = "track-press";
  var incrementPress = "increment-press";
  var decrementPress = "decrement-press";
  var inputChange = "input-change";
  var inputClear = "input-clear";
  var inputBlur = "input-blur";
  var inputPaste = "input-paste";
  var inputPress = "input-press";
  var focusOut = "focus-out";
  var escapeKey = "escape-key";
  var closeWatcher = "close-watcher";
  var listNavigation = "list-navigation";
  var keyboard = "keyboard";
  var pointer = "pointer";
  var drag = "drag";
  var wheel = "wheel";
  var scrub = "scrub";
  var cancelOpen = "cancel-open";
  var siblingOpen = "sibling-open";
  var disabled = "disabled";
  var imperativeAction = "imperative-action";
  var swipe = "swipe";
  var windowResize = "window-resize";

  // node_modules/@base-ui/react/esm/internals/createBaseUIEventDetails.js
  function createChangeEventDetails(reason, event, trigger, customProperties) {
    let canceled = false;
    let allowPropagation = false;
    const custom = customProperties ?? EMPTY_OBJECT;
    const details = {
      reason,
      event: event ?? new Event("base-ui"),
      cancel() {
        canceled = true;
      },
      allowPropagation() {
        allowPropagation = true;
      },
      get isCanceled() {
        return canceled;
      },
      get isPropagationAllowed() {
        return allowPropagation;
      },
      trigger,
      ...custom
    };
    return details;
  }

  // node_modules/@base-ui/react/esm/dialog/close/DialogClose.js
  var DialogClose = /* @__PURE__ */ React15.forwardRef(function DialogClose2(componentProps, forwardedRef) {
    const {
      render,
      className,
      disabled: disabled2 = false,
      nativeButton = true,
      style,
      ...elementProps
    } = componentProps;
    const {
      store
    } = useDialogRootContext();
    const open = store.useState("open");
    function handleClick(event) {
      if (open) {
        store.setOpen(false, createChangeEventDetails(reason_parts_exports.closePress, event.nativeEvent));
      }
    }
    const {
      getButtonProps,
      buttonRef
    } = useButton({
      disabled: disabled2,
      native: nativeButton
    });
    const state = {
      disabled: disabled2
    };
    return useRenderElement("button", componentProps, {
      state,
      ref: [forwardedRef, buttonRef],
      props: [{
        onClick: handleClick
      }, elementProps, getButtonProps]
    });
  });
  if (true) DialogClose.displayName = "DialogClose";

  // node_modules/@base-ui/react/esm/dialog/description/DialogDescription.js
  init_define_import_meta_env();
  var React17 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/useBaseUiId.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/useId.js
  init_define_import_meta_env();
  var React16 = __toESM(require_react_shim(), 1);
  var globalId = 0;
  function useGlobalId(idOverride, prefix = "mui") {
    const [defaultId, setDefaultId] = React16.useState(idOverride);
    const id = idOverride || defaultId;
    React16.useEffect(() => {
      if (defaultId == null) {
        globalId += 1;
        setDefaultId(`${prefix}-${globalId}`);
      }
    }, [defaultId, prefix]);
    return id;
  }
  var maybeReactUseId = SafeReact.useId;
  function useId(idOverride, prefix) {
    if (maybeReactUseId !== void 0) {
      const reactId = maybeReactUseId();
      return idOverride ?? (prefix ? `${prefix}-${reactId}` : reactId);
    }
    return useGlobalId(idOverride, prefix);
  }

  // node_modules/@base-ui/react/esm/internals/useBaseUiId.js
  function useBaseUiId(idOverride) {
    return useId(idOverride, "base-ui");
  }

  // node_modules/@base-ui/react/esm/dialog/description/DialogDescription.js
  var DialogDescription = /* @__PURE__ */ React17.forwardRef(function DialogDescription2(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      id: idProp,
      ...elementProps
    } = componentProps;
    const {
      store
    } = useDialogRootContext();
    const id = useBaseUiId(idProp);
    store.useSyncedValueWithCleanup("descriptionElementId", id);
    return useRenderElement("p", componentProps, {
      ref: forwardedRef,
      props: [{
        id
      }, elementProps]
    });
  });
  if (true) DialogDescription.displayName = "DialogDescription";

  // node_modules/@base-ui/react/esm/dialog/popup/DialogPopup.js
  init_define_import_meta_env();
  var React34 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/floating-ui-react/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/useTimeout.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/useOnMount.js
  init_define_import_meta_env();
  var React18 = __toESM(require_react_shim(), 1);
  var EMPTY = [];
  function useOnMount(fn) {
    React18.useEffect(fn, EMPTY);
  }

  // node_modules/@base-ui/utils/esm/useTimeout.js
  var EMPTY2 = 0;
  var Timeout = class _Timeout {
    constructor() {
      __publicField(this, "currentId", EMPTY2);
      __publicField(this, "clear", () => {
        if (this.currentId !== EMPTY2) {
          clearTimeout(this.currentId);
          this.currentId = EMPTY2;
        }
      });
      __publicField(this, "disposeEffect", () => {
        return this.clear;
      });
    }
    static create() {
      return new _Timeout();
    }
    /**
     * Executes `fn` after `delay`, clearing any previously scheduled call.
     */
    start(delay, fn) {
      this.clear();
      this.currentId = setTimeout(() => {
        this.currentId = EMPTY2;
        fn();
      }, delay);
    }
    isStarted() {
      return this.currentId !== EMPTY2;
    }
  };
  function useTimeout() {
    const timeout = useRefWithInit(Timeout.create).current;
    useOnMount(timeout.disposeEffect);
    return timeout;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/event.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/detectBrowser.js
  init_define_import_meta_env();
  var hasNavigator = typeof navigator !== "undefined";
  var nav = getNavigatorData();
  var platform = getPlatform();
  var userAgent = getUserAgent();
  var isWebKit2 = typeof CSS === "undefined" || !CSS.supports ? false : CSS.supports("-webkit-backdrop-filter:none");
  var isIOS = (
    // iPads can claim to be MacIntel
    nav.platform === "MacIntel" && nav.maxTouchPoints > 1 ? true : /iP(hone|ad|od)|iOS/.test(nav.platform)
  );
  var isFirefox = hasNavigator && /firefox/i.test(userAgent);
  var isSafari = hasNavigator && /apple/i.test(navigator.vendor);
  var isEdge = hasNavigator && /Edg/i.test(userAgent);
  var isAndroid = hasNavigator && /android/i.test(platform) || /android/i.test(userAgent);
  var isMac = hasNavigator && platform.toLowerCase().startsWith("mac") && !navigator.maxTouchPoints;
  var isJSDOM = userAgent.includes("jsdom/");
  function getNavigatorData() {
    if (!hasNavigator) {
      return {
        platform: "",
        maxTouchPoints: -1
      };
    }
    const uaData = navigator.userAgentData;
    if (uaData?.platform) {
      return {
        platform: uaData.platform,
        maxTouchPoints: navigator.maxTouchPoints
      };
    }
    return {
      platform: navigator.platform ?? "",
      maxTouchPoints: navigator.maxTouchPoints ?? -1
    };
  }
  function getUserAgent() {
    if (!hasNavigator) {
      return "";
    }
    const uaData = navigator.userAgentData;
    if (uaData && Array.isArray(uaData.brands)) {
      return uaData.brands.map(({
        brand,
        version: version2
      }) => `${brand}/${version2}`).join(" ");
    }
    return navigator.userAgent;
  }
  function getPlatform() {
    if (!hasNavigator) {
      return "";
    }
    const uaData = navigator.userAgentData;
    if (uaData?.platform) {
      return uaData.platform;
    }
    return navigator.platform ?? "";
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/event.js
  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  function isReactEvent(event) {
    return "nativeEvent" in event;
  }
  function isVirtualClick(event) {
    if (event.pointerType === "" && event.isTrusted) {
      return true;
    }
    if (isAndroid && event.pointerType) {
      return event.type === "click" && event.buttons === 1;
    }
    return event.detail === 0 && !event.pointerType;
  }
  function isVirtualPointerEvent(event) {
    if (isJSDOM) {
      return false;
    }
    return !isAndroid && event.width === 0 && event.height === 0 || isAndroid && event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "mouse" || // iOS VoiceOver returns 0.333• for width/height.
    event.width < 1 && event.height < 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "touch";
  }
  function isMouseLikePointerType(pointerType, strict) {
    const values = ["mouse", "pen"];
    if (!strict) {
      values.push("", void 0);
    }
    return values.includes(pointerType);
  }
  function isClickLikeEvent(event) {
    const type = event.type;
    return type === "click" || type === "mousedown" || type === "keydown" || type === "keyup";
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingFocusManager.js
  init_define_import_meta_env();
  var React22 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/addEventListener.js
  init_define_import_meta_env();
  function addEventListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    return () => {
      target.removeEventListener(type, listener, options);
    };
  }

  // node_modules/@base-ui/utils/esm/mergeCleanups.js
  init_define_import_meta_env();
  function mergeCleanups(...cleanups) {
    return () => {
      for (let i = 0; i < cleanups.length; i += 1) {
        const cleanup = cleanups[i];
        if (cleanup) {
          cleanup();
        }
      }
    };
  }

  // node_modules/@base-ui/utils/esm/useValueAsRef.js
  init_define_import_meta_env();
  function useValueAsRef(value) {
    const latest = useRefWithInit(createLatestRef, value).current;
    latest.next = value;
    useIsoLayoutEffect(latest.effect);
    return latest;
  }
  function createLatestRef(value) {
    const latest = {
      current: value,
      next: value,
      effect: () => {
        latest.current = latest.next;
      }
    };
    return latest;
  }

  // node_modules/@base-ui/utils/esm/useAnimationFrame.js
  init_define_import_meta_env();
  var EMPTY3 = null;
  var LAST_RAF = globalThis.requestAnimationFrame;
  var Scheduler = class {
    constructor() {
      /* This implementation uses an array as a backing data-structure for frame callbacks.
       * It allows `O(1)` callback cancelling by inserting a `null` in the array, though it
       * never calls the native `cancelAnimationFrame` if there are no frames left. This can
       * be much more efficient if there is a call pattern that alterns as
       * "request-cancel-request-cancel-…".
       * But in the case of "request-request-…-cancel-cancel-…", it leaves the final animation
       * frame to run anyway. We turn that frame into a `O(1)` no-op via `callbacksCount`. */
      __publicField(this, "callbacks", []);
      __publicField(this, "callbacksCount", 0);
      __publicField(this, "nextId", 1);
      __publicField(this, "startId", 1);
      __publicField(this, "isScheduled", false);
      __publicField(this, "tick", (timestamp) => {
        this.isScheduled = false;
        const currentCallbacks = this.callbacks;
        const currentCallbacksCount = this.callbacksCount;
        this.callbacks = [];
        this.callbacksCount = 0;
        this.startId = this.nextId;
        if (currentCallbacksCount > 0) {
          for (let i = 0; i < currentCallbacks.length; i += 1) {
            currentCallbacks[i]?.(timestamp);
          }
        }
      });
    }
    request(fn) {
      const id = this.nextId;
      this.nextId += 1;
      this.callbacks.push(fn);
      this.callbacksCount += 1;
      const didRAFChange = LAST_RAF !== requestAnimationFrame && (LAST_RAF = requestAnimationFrame, true);
      if (!this.isScheduled || didRAFChange) {
        requestAnimationFrame(this.tick);
        this.isScheduled = true;
      }
      return id;
    }
    cancel(id) {
      const index = id - this.startId;
      if (index < 0 || index >= this.callbacks.length) {
        return;
      }
      this.callbacks[index] = null;
      this.callbacksCount -= 1;
    }
  };
  var scheduler = new Scheduler();
  var AnimationFrame = class _AnimationFrame {
    constructor() {
      __publicField(this, "currentId", EMPTY3);
      __publicField(this, "cancel", () => {
        if (this.currentId !== EMPTY3) {
          scheduler.cancel(this.currentId);
          this.currentId = EMPTY3;
        }
      });
      __publicField(this, "disposeEffect", () => {
        return this.cancel;
      });
    }
    static create() {
      return new _AnimationFrame();
    }
    static request(fn) {
      return scheduler.request(fn);
    }
    static cancel(id) {
      return scheduler.cancel(id);
    }
    /**
     * Executes `fn` after `delay`, clearing any previously scheduled call.
     */
    request(fn) {
      this.cancel();
      this.currentId = scheduler.request(() => {
        this.currentId = EMPTY3;
        fn();
      });
    }
  };
  function useAnimationFrame() {
    const timeout = useRefWithInit(AnimationFrame.create).current;
    useOnMount(timeout.disposeEffect);
    return timeout;
  }

  // node_modules/@base-ui/utils/esm/owner.js
  init_define_import_meta_env();
  function ownerDocument(node) {
    return node?.ownerDocument || document;
  }

  // node_modules/@base-ui/react/esm/utils/FocusGuard.js
  init_define_import_meta_env();
  var React19 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/visuallyHidden.js
  init_define_import_meta_env();
  var visuallyHiddenBase = {
    clipPath: "inset(50%)",
    overflow: "hidden",
    whiteSpace: "nowrap",
    border: 0,
    padding: 0,
    width: 1,
    height: 1,
    margin: -1
  };
  var visuallyHidden = {
    ...visuallyHiddenBase,
    position: "fixed",
    top: 0,
    left: 0
  };
  var visuallyHiddenInput = {
    ...visuallyHiddenBase,
    position: "absolute"
  };

  // node_modules/@base-ui/react/esm/utils/FocusGuard.js
  var import_jsx_runtime4 = __toESM(require_react_shim(), 1);
  var FocusGuard = /* @__PURE__ */ React19.forwardRef(function FocusGuard2(props, ref) {
    const [role, setRole] = React19.useState();
    useIsoLayoutEffect(() => {
      if (isSafari) {
        setRole("button");
      }
    }, []);
    const restProps = {
      tabIndex: 0,
      // Role is only for VoiceOver
      role
    };
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", {
      ...props,
      ref,
      style: visuallyHidden,
      "aria-hidden": role ? void 0 : true,
      ...restProps,
      "data-base-ui-focus-guard": ""
    });
  });
  if (true) FocusGuard.displayName = "FocusGuard";

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/element.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/constants.js
  init_define_import_meta_env();
  var FOCUSABLE_ATTRIBUTE = "data-base-ui-focusable";
  var ACTIVE_KEY = "active";
  var SELECTED_KEY = "selected";
  var TYPEABLE_SELECTOR = "input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])";

  // node_modules/@base-ui/react/esm/internals/shadowDom.js
  init_define_import_meta_env();
  function activeElement(doc) {
    let element = doc.activeElement;
    while (element?.shadowRoot?.activeElement != null) {
      element = element.shadowRoot.activeElement;
    }
    return element;
  }
  function contains(parent, child) {
    if (!parent || !child) {
      return false;
    }
    const rootNode = child.getRootNode?.();
    if (parent.contains(child)) {
      return true;
    }
    if (rootNode && isShadowRoot(rootNode)) {
      let next = child;
      while (next) {
        if (parent === next) {
          return true;
        }
        next = next.parentNode || next.host;
      }
    }
    return false;
  }
  function getTarget(event) {
    if ("composedPath" in event) {
      return event.composedPath()[0];
    }
    return event.target;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/element.js
  function isEventTargetWithin(event, node) {
    if (node == null) {
      return false;
    }
    if ("composedPath" in event) {
      return event.composedPath().includes(node);
    }
    const eventAgain = event;
    return eventAgain.target != null && node.contains(eventAgain.target);
  }
  function isRootElement(element) {
    return element.matches("html,body");
  }
  function isTypeableElement(element) {
    return isHTMLElement(element) && element.matches(TYPEABLE_SELECTOR);
  }
  function isTypeableCombobox(element) {
    if (!element) {
      return false;
    }
    return element.getAttribute("role") === "combobox" && isTypeableElement(element);
  }
  function getFloatingFocusElement(floatingElement) {
    if (!floatingElement) {
      return null;
    }
    return floatingElement.hasAttribute(FOCUSABLE_ATTRIBUTE) ? floatingElement : floatingElement.querySelector(`[${FOCUSABLE_ATTRIBUTE}]`) || floatingElement;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/tabbable.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/composite.js
  init_define_import_meta_env();
  function isHiddenByStyles(styles) {
    return styles.visibility === "hidden" || styles.visibility === "collapse";
  }
  function isElementVisible(element, styles = element ? getComputedStyle2(element) : null) {
    if (!element || !element.isConnected || !styles || isHiddenByStyles(styles)) {
      return false;
    }
    if (typeof element.checkVisibility === "function") {
      return element.checkVisibility();
    }
    return styles.display !== "none" && styles.display !== "contents";
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/tabbable.js
  var CANDIDATE_SELECTOR = 'a[href],button,input,select,textarea,summary,details,iframe,object,embed,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]';
  function getParentElement(element) {
    const assignedSlot = element.assignedSlot;
    if (assignedSlot) {
      return assignedSlot;
    }
    if (element.parentElement) {
      return element.parentElement;
    }
    const rootNode = element.getRootNode();
    return isShadowRoot(rootNode) ? rootNode.host : null;
  }
  function getDetailsSummary(details) {
    for (const child of Array.from(details.children)) {
      if (getNodeName(child) === "summary") {
        return child;
      }
    }
    return null;
  }
  function isWithinOpenDetailsSummary(element, details) {
    const summary = getDetailsSummary(details);
    return !!summary && (element === summary || contains(summary, element));
  }
  function isFocusableCandidate(element) {
    const nodeName = element ? getNodeName(element) : "";
    return element != null && element.matches(CANDIDATE_SELECTOR) && (nodeName !== "summary" || element.parentElement != null && getNodeName(element.parentElement) === "details" && getDetailsSummary(element.parentElement) === element) && (nodeName !== "details" || getDetailsSummary(element) == null) && (nodeName !== "input" || element.type !== "hidden");
  }
  function isFocusableElement(element) {
    if (!isFocusableCandidate(element) || !element.isConnected || element.matches(":disabled")) {
      return false;
    }
    for (let current = element; current; current = getParentElement(current)) {
      const isAncestor = current !== element;
      const isSlot = getNodeName(current) === "slot";
      if (current.hasAttribute("inert")) {
        return false;
      }
      if (isAncestor && getNodeName(current) === "details" && !current.open && !isWithinOpenDetailsSummary(element, current) || current.hasAttribute("hidden") || !isSlot && !isVisibleInTabbableTree(current, isAncestor)) {
        return false;
      }
    }
    return true;
  }
  function isVisibleInTabbableTree(element, isAncestor) {
    const styles = getComputedStyle2(element);
    if (!isAncestor) {
      return isElementVisible(element, styles);
    }
    return styles.display !== "none";
  }
  function getTabIndex(element) {
    const tabIndex = element.tabIndex;
    if (tabIndex < 0) {
      const nodeName = getNodeName(element);
      if (nodeName === "details" || nodeName === "audio" || nodeName === "video" || isHTMLElement(element) && element.isContentEditable) {
        return 0;
      }
    }
    return tabIndex;
  }
  function getNamedRadioInput(element) {
    if (getNodeName(element) !== "input") {
      return null;
    }
    const input = element;
    return input.type === "radio" && input.name !== "" ? input : null;
  }
  function isTabbableRadio(element, candidates) {
    const input = getNamedRadioInput(element);
    if (!input) {
      return true;
    }
    const checkedRadio = candidates.find((candidate) => {
      const radio = getNamedRadioInput(candidate);
      return radio?.name === input.name && radio.form === input.form && radio.checked;
    });
    if (checkedRadio) {
      return checkedRadio === input;
    }
    return candidates.find((candidate) => {
      const radio = getNamedRadioInput(candidate);
      return radio?.name === input.name && radio.form === input.form;
    }) === input;
  }
  function getComposedChildren(container) {
    if (isHTMLElement(container) && getNodeName(container) === "slot") {
      const assignedElements = container.assignedElements({
        flatten: true
      });
      if (assignedElements.length > 0) {
        return assignedElements;
      }
    }
    if (isHTMLElement(container) && container.shadowRoot) {
      return Array.from(container.shadowRoot.children);
    }
    return Array.from(container.children);
  }
  function appendCandidates(container, list) {
    getComposedChildren(container).forEach((child) => {
      if (isFocusableCandidate(child)) {
        list.push(child);
      }
      appendCandidates(child, list);
    });
  }
  function appendMatchingElements(container, selector, list) {
    getComposedChildren(container).forEach((child) => {
      if (isHTMLElement(child) && child.matches(selector)) {
        list.push(child);
      }
      appendMatchingElements(child, selector, list);
    });
  }
  function isTabbable(element) {
    return isFocusableElement(element) && getTabIndex(element) >= 0;
  }
  function focusable(container) {
    const candidates = [];
    appendCandidates(container, candidates);
    return candidates.filter(isFocusableElement);
  }
  function tabbable(container) {
    const candidates = focusable(container);
    return candidates.filter((element) => getTabIndex(element) >= 0 && isTabbableRadio(element, candidates));
  }
  function getTabbableIn(container, dir) {
    const list = tabbable(container);
    const len = list.length;
    if (len === 0) {
      return void 0;
    }
    const active = activeElement(ownerDocument(container));
    const index = list.indexOf(active);
    const nextIndex = index === -1 ? dir === 1 ? 0 : len - 1 : index + dir;
    return list[nextIndex];
  }
  function getNextTabbable(referenceElement) {
    return getTabbableIn(ownerDocument(referenceElement).body, 1) || referenceElement;
  }
  function getPreviousTabbable(referenceElement) {
    return getTabbableIn(ownerDocument(referenceElement).body, -1) || referenceElement;
  }
  function isOutsideEvent(event, container) {
    const containerElement = container || event.currentTarget;
    const relatedTarget = event.relatedTarget;
    return !relatedTarget || !contains(containerElement, relatedTarget);
  }
  function disableFocusInside(container) {
    const tabbableElements = tabbable(container);
    tabbableElements.forEach((element) => {
      element.dataset.tabindex = element.getAttribute("tabindex") || "";
      element.setAttribute("tabindex", "-1");
    });
  }
  function enableFocusInside(container) {
    const elements = [];
    appendMatchingElements(container, "[data-tabindex]", elements);
    elements.forEach((element) => {
      const tabindex = element.dataset.tabindex;
      delete element.dataset.tabindex;
      if (tabindex) {
        element.setAttribute("tabindex", tabindex);
      } else {
        element.removeAttribute("tabindex");
      }
    });
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/nodes.js
  init_define_import_meta_env();
  function getNodeChildren(nodes, id, onlyOpenChildren = true) {
    const directChildren = nodes.filter((node) => node.parentId === id);
    return directChildren.flatMap((child) => [...!onlyOpenChildren || child.context?.open ? [child] : [], ...getNodeChildren(nodes, child.id, onlyOpenChildren)]);
  }
  function getNodeAncestors(nodes, id) {
    let allAncestors = [];
    let currentParentId = nodes.find((node) => node.id === id)?.parentId;
    while (currentParentId) {
      const currentNode = nodes.find((node) => node.id === currentParentId);
      currentParentId = currentNode?.parentId;
      if (currentNode) {
        allAncestors = allAncestors.concat(currentNode);
      }
    }
    return allAncestors;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/createAttribute.js
  init_define_import_meta_env();
  function createAttribute(name) {
    return `data-base-ui-${name}`;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/enqueueFocus.js
  init_define_import_meta_env();
  var rafId = 0;
  function enqueueFocus(el, options = {}) {
    const {
      preventScroll = false,
      cancelPrevious = true,
      sync = false
    } = options;
    if (cancelPrevious) {
      cancelAnimationFrame(rafId);
    }
    const exec = () => el?.focus({
      preventScroll
    });
    if (sync) {
      exec();
      return NOOP;
    }
    const currentRafId = requestAnimationFrame(exec);
    rafId = currentRafId;
    return () => {
      if (rafId === currentRafId) {
        cancelAnimationFrame(currentRafId);
        rafId = 0;
      }
    };
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/markOthers.js
  init_define_import_meta_env();
  var counters = {
    inert: /* @__PURE__ */ new WeakMap(),
    "aria-hidden": /* @__PURE__ */ new WeakMap()
  };
  var markerName = "data-base-ui-inert";
  var uncontrolledElementsSets = {
    inert: /* @__PURE__ */ new WeakSet(),
    "aria-hidden": /* @__PURE__ */ new WeakSet()
  };
  var markerCounterMap = /* @__PURE__ */ new WeakMap();
  var lockCount = 0;
  function getUncontrolledElementsSet(controlAttribute) {
    return uncontrolledElementsSets[controlAttribute];
  }
  function unwrapHost(node) {
    if (!node) {
      return null;
    }
    return isShadowRoot(node) ? node.host : unwrapHost(node.parentNode);
  }
  var correctElements = (parent, targets) => targets.map((target) => {
    if (parent.contains(target)) {
      return target;
    }
    const correctedTarget = unwrapHost(target);
    if (parent.contains(correctedTarget)) {
      return correctedTarget;
    }
    return null;
  }).filter((x) => x != null);
  var buildKeepSet = (targets) => {
    const keep = /* @__PURE__ */ new Set();
    targets.forEach((target) => {
      let node = target;
      while (node && !keep.has(node)) {
        keep.add(node);
        node = node.parentNode;
      }
    });
    return keep;
  };
  var collectOutsideElements = (root, keepElements, stopElements) => {
    const outside = [];
    const walk = (parent) => {
      if (!parent || stopElements.has(parent)) {
        return;
      }
      Array.from(parent.children).forEach((node) => {
        if (getNodeName(node) === "script") {
          return;
        }
        if (keepElements.has(node)) {
          walk(node);
        } else {
          outside.push(node);
        }
      });
    };
    walk(root);
    return outside;
  };
  function applyAttributeToOthers(uncorrectedAvoidElements, body, ariaHidden, inert, {
    mark = true,
    markerIgnoreElements = []
  }) {
    const controlAttribute = inert ? "inert" : ariaHidden ? "aria-hidden" : null;
    let counterMap = null;
    let uncontrolledElementsSet = null;
    const avoidElements = correctElements(body, uncorrectedAvoidElements);
    const markerIgnoreTargets = mark ? correctElements(body, markerIgnoreElements) : [];
    const markerIgnoreSet = new Set(markerIgnoreTargets);
    const markerTargets = mark ? collectOutsideElements(body, buildKeepSet(avoidElements), new Set(avoidElements)).filter((target) => !markerIgnoreSet.has(target)) : [];
    const hiddenElements = [];
    const markedElements = [];
    if (controlAttribute) {
      const map = counters[controlAttribute];
      const currentUncontrolledElementsSet = getUncontrolledElementsSet(controlAttribute);
      uncontrolledElementsSet = currentUncontrolledElementsSet;
      counterMap = map;
      const ariaLiveElements = correctElements(body, Array.from(body.querySelectorAll("[aria-live]")));
      const controlElements = avoidElements.concat(ariaLiveElements);
      const controlTargets = collectOutsideElements(body, buildKeepSet(controlElements), new Set(controlElements));
      controlTargets.forEach((node) => {
        const attr2 = node.getAttribute(controlAttribute);
        const alreadyHidden = attr2 !== null && attr2 !== "false";
        const counterValue = (map.get(node) || 0) + 1;
        map.set(node, counterValue);
        hiddenElements.push(node);
        if (counterValue === 1 && alreadyHidden) {
          currentUncontrolledElementsSet.add(node);
        }
        if (!alreadyHidden) {
          node.setAttribute(controlAttribute, controlAttribute === "inert" ? "" : "true");
        }
      });
    }
    if (mark) {
      markerTargets.forEach((node) => {
        const markerValue = (markerCounterMap.get(node) || 0) + 1;
        markerCounterMap.set(node, markerValue);
        markedElements.push(node);
        if (markerValue === 1) {
          node.setAttribute(markerName, "");
        }
      });
    }
    lockCount += 1;
    return () => {
      if (counterMap) {
        hiddenElements.forEach((element) => {
          const currentCounterValue = counterMap.get(element) || 0;
          const counterValue = currentCounterValue - 1;
          counterMap.set(element, counterValue);
          if (!counterValue) {
            if (!uncontrolledElementsSet?.has(element) && controlAttribute) {
              element.removeAttribute(controlAttribute);
            }
            uncontrolledElementsSet?.delete(element);
          }
        });
      }
      if (mark) {
        markedElements.forEach((element) => {
          const markerValue = (markerCounterMap.get(element) || 0) - 1;
          markerCounterMap.set(element, markerValue);
          if (!markerValue) {
            element.removeAttribute(markerName);
          }
        });
      }
      lockCount -= 1;
      if (!lockCount) {
        counters.inert = /* @__PURE__ */ new WeakMap();
        counters["aria-hidden"] = /* @__PURE__ */ new WeakMap();
        uncontrolledElementsSets.inert = /* @__PURE__ */ new WeakSet();
        uncontrolledElementsSets["aria-hidden"] = /* @__PURE__ */ new WeakSet();
        markerCounterMap = /* @__PURE__ */ new WeakMap();
      }
    };
  }
  function markOthers(avoidElements, options = {}) {
    const {
      ariaHidden = false,
      inert = false,
      mark = true,
      markerIgnoreElements = []
    } = options;
    const body = ownerDocument(avoidElements[0]).body;
    return applyAttributeToOthers(avoidElements, body, ariaHidden, inert, {
      mark,
      markerIgnoreElements
    });
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingPortal.js
  init_define_import_meta_env();
  var React20 = __toESM(require_react_shim(), 1);
  var ReactDOM = __toESM(require_react_dom_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/constants.js
  init_define_import_meta_env();
  var CLICK_TRIGGER_IDENTIFIER = "data-base-ui-click-trigger";
  var BASE_UI_SWIPE_IGNORE_ATTRIBUTE = "data-base-ui-swipe-ignore";
  var LEGACY_SWIPE_IGNORE_ATTRIBUTE = "data-swipe-ignore";
  var BASE_UI_SWIPE_IGNORE_SELECTOR = `[${BASE_UI_SWIPE_IGNORE_ATTRIBUTE}]`;
  var LEGACY_SWIPE_IGNORE_SELECTOR = `[${LEGACY_SWIPE_IGNORE_ATTRIBUTE}]`;
  var ownerVisuallyHidden = {
    clipPath: "inset(50%)",
    position: "fixed",
    top: 0,
    left: 0
  };

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingPortal.js
  var import_jsx_runtime5 = __toESM(require_react_shim(), 1);
  var PortalContext = /* @__PURE__ */ React20.createContext(null);
  if (true) PortalContext.displayName = "PortalContext";
  var usePortalContext = () => React20.useContext(PortalContext);
  var attr = createAttribute("portal");
  function useFloatingPortalNode(props = {}) {
    const {
      ref,
      container: containerProp,
      componentProps = EMPTY_OBJECT,
      elementProps
    } = props;
    const uniqueId = useId();
    const portalContext = usePortalContext();
    const parentPortalNode = portalContext?.portalNode;
    const [containerElement, setContainerElement] = React20.useState(null);
    const [portalNode, setPortalNode] = React20.useState(null);
    const setPortalNodeRef = useStableCallback((node) => {
      if (node !== null) {
        setPortalNode(node);
      }
    });
    const containerRef = React20.useRef(null);
    useIsoLayoutEffect(() => {
      if (containerProp === null) {
        if (containerRef.current) {
          containerRef.current = null;
          setPortalNode(null);
          setContainerElement(null);
        }
        return;
      }
      if (uniqueId == null) {
        return;
      }
      const resolvedContainer = (containerProp && (isNode(containerProp) ? containerProp : containerProp.current)) ?? parentPortalNode ?? document.body;
      if (resolvedContainer == null) {
        if (containerRef.current) {
          containerRef.current = null;
          setPortalNode(null);
          setContainerElement(null);
        }
        return;
      }
      if (containerRef.current !== resolvedContainer) {
        containerRef.current = resolvedContainer;
        setPortalNode(null);
        setContainerElement(resolvedContainer);
      }
    }, [containerProp, parentPortalNode, uniqueId]);
    const portalElement = useRenderElement("div", componentProps, {
      ref: [ref, setPortalNodeRef],
      props: [{
        id: uniqueId,
        [attr]: ""
      }, elementProps]
    });
    const portalSubtree = containerElement && portalElement ? /* @__PURE__ */ ReactDOM.createPortal(portalElement, containerElement) : null;
    return {
      portalNode,
      portalSubtree
    };
  }
  var FloatingPortal = /* @__PURE__ */ React20.forwardRef(function FloatingPortal2(componentProps, forwardedRef) {
    const {
      children,
      container,
      className,
      render,
      renderGuards,
      style,
      ...elementProps
    } = componentProps;
    const {
      portalNode,
      portalSubtree
    } = useFloatingPortalNode({
      container,
      ref: forwardedRef,
      componentProps,
      elementProps
    });
    const beforeOutsideRef = React20.useRef(null);
    const afterOutsideRef = React20.useRef(null);
    const beforeInsideRef = React20.useRef(null);
    const afterInsideRef = React20.useRef(null);
    const [focusManagerState, setFocusManagerState] = React20.useState(null);
    const focusInsideDisabledRef = React20.useRef(false);
    const modal = focusManagerState?.modal;
    const open = focusManagerState?.open;
    const shouldRenderGuards = typeof renderGuards === "boolean" ? renderGuards : !!focusManagerState && !focusManagerState.modal && focusManagerState.open && !!portalNode;
    React20.useEffect(() => {
      if (!portalNode || modal) {
        return void 0;
      }
      function onFocus(event) {
        if (portalNode && event.relatedTarget && isOutsideEvent(event)) {
          if (event.type === "focusin") {
            if (focusInsideDisabledRef.current) {
              enableFocusInside(portalNode);
              focusInsideDisabledRef.current = false;
            }
          } else {
            disableFocusInside(portalNode);
            focusInsideDisabledRef.current = true;
          }
        }
      }
      return mergeCleanups(addEventListener(portalNode, "focusin", onFocus, true), addEventListener(portalNode, "focusout", onFocus, true));
    }, [portalNode, modal]);
    React20.useEffect(() => {
      if (!portalNode || open !== false) {
        return;
      }
      enableFocusInside(portalNode);
      focusInsideDisabledRef.current = false;
    }, [open, portalNode]);
    const portalContextValue = React20.useMemo(() => ({
      beforeOutsideRef,
      afterOutsideRef,
      beforeInsideRef,
      afterInsideRef,
      portalNode,
      setFocusManagerState
    }), [portalNode]);
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(React20.Fragment, {
      children: [portalSubtree, /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(PortalContext.Provider, {
        value: portalContextValue,
        children: [shouldRenderGuards && portalNode && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FocusGuard, {
          "data-type": "outside",
          ref: beforeOutsideRef,
          onFocus: (event) => {
            if (isOutsideEvent(event, portalNode)) {
              beforeInsideRef.current?.focus();
            } else {
              const domReference = focusManagerState ? focusManagerState.domReference : null;
              const prevTabbable = getPreviousTabbable(domReference);
              prevTabbable?.focus();
            }
          }
        }), shouldRenderGuards && portalNode && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", {
          "aria-owns": portalNode.id,
          style: ownerVisuallyHidden
        }), portalNode && /* @__PURE__ */ ReactDOM.createPortal(children, portalNode), shouldRenderGuards && portalNode && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FocusGuard, {
          "data-type": "outside",
          ref: afterOutsideRef,
          onFocus: (event) => {
            if (isOutsideEvent(event, portalNode)) {
              afterInsideRef.current?.focus();
            } else {
              const domReference = focusManagerState ? focusManagerState.domReference : null;
              const nextTabbable = getNextTabbable(domReference);
              nextTabbable?.focus();
              if (focusManagerState?.closeOnFocusOut) {
                focusManagerState?.onOpenChange(false, createChangeEventDetails(reason_parts_exports.focusOut, event.nativeEvent));
              }
            }
          }
        })]
      })]
    });
  });
  if (true) FloatingPortal.displayName = "FloatingPortal";

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingTree.js
  init_define_import_meta_env();
  var React21 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/createEventEmitter.js
  init_define_import_meta_env();
  function createEventEmitter() {
    const map = /* @__PURE__ */ new Map();
    return {
      emit(event, data) {
        map.get(event)?.forEach((listener) => listener(data));
      },
      on(event, listener) {
        if (!map.has(event)) {
          map.set(event, /* @__PURE__ */ new Set());
        }
        map.get(event).add(listener);
      },
      off(event, listener) {
        map.get(event)?.delete(listener);
      }
    };
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingTree.js
  var import_jsx_runtime6 = __toESM(require_react_shim(), 1);
  var FloatingNodeContext = /* @__PURE__ */ React21.createContext(null);
  if (true) FloatingNodeContext.displayName = "FloatingNodeContext";
  var FloatingTreeContext = /* @__PURE__ */ React21.createContext(null);
  if (true) FloatingTreeContext.displayName = "FloatingTreeContext";
  var useFloatingParentNodeId = () => React21.useContext(FloatingNodeContext)?.id || null;
  var useFloatingTree = (externalTree) => {
    const contextTree = React21.useContext(FloatingTreeContext);
    return externalTree ?? contextTree;
  };

  // node_modules/@base-ui/react/esm/utils/resolveRef.js
  init_define_import_meta_env();
  function resolveRef(maybeRef) {
    if (maybeRef == null) {
      return maybeRef;
    }
    return "current" in maybeRef ? maybeRef.current : maybeRef;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingFocusManager.js
  var import_jsx_runtime7 = __toESM(require_react_shim(), 1);
  function getEventType(event, lastInteractionType) {
    const win = getWindow(getTarget(event));
    if (event instanceof win.KeyboardEvent) {
      return "keyboard";
    }
    if (event instanceof win.FocusEvent) {
      return lastInteractionType || "keyboard";
    }
    if ("pointerType" in event) {
      return event.pointerType || "keyboard";
    }
    if ("touches" in event) {
      return "touch";
    }
    if (event instanceof win.MouseEvent) {
      return lastInteractionType || (event.detail === 0 ? "keyboard" : "mouse");
    }
    return "";
  }
  var LIST_LIMIT = 20;
  var previouslyFocusedElements = [];
  function clearDisconnectedPreviouslyFocusedElements() {
    previouslyFocusedElements = previouslyFocusedElements.filter((entry) => {
      return entry.deref()?.isConnected;
    });
  }
  function addPreviouslyFocusedElement(element) {
    clearDisconnectedPreviouslyFocusedElements();
    if (element && getNodeName(element) !== "body") {
      previouslyFocusedElements.push(new WeakRef(element));
      if (previouslyFocusedElements.length > LIST_LIMIT) {
        previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT);
      }
    }
  }
  function getPreviouslyFocusedElement() {
    clearDisconnectedPreviouslyFocusedElements();
    return previouslyFocusedElements[previouslyFocusedElements.length - 1]?.deref();
  }
  function getFirstTabbableElement(container) {
    if (!container) {
      return null;
    }
    if (isTabbable(container)) {
      return container;
    }
    return tabbable(container)[0] || container;
  }
  function handleTabIndex(floatingFocusElement, orderRef) {
    if (floatingFocusElement.hasAttribute("tabindex") && !floatingFocusElement.hasAttribute("data-tabindex")) {
      return;
    }
    if (!orderRef.current.includes("floating") && !floatingFocusElement.getAttribute("role")?.includes("dialog")) {
      return;
    }
    const focusableElements = focusable(floatingFocusElement);
    const tabbableContent = focusableElements.filter((element) => {
      const dataTabIndex = element.getAttribute("data-tabindex") || "";
      return isTabbable(element) || element.hasAttribute("data-tabindex") && !dataTabIndex.startsWith("-");
    });
    const tabIndex = floatingFocusElement.getAttribute("tabindex");
    if (orderRef.current.includes("floating") || tabbableContent.length === 0) {
      if (tabIndex !== "0") {
        floatingFocusElement.setAttribute("tabindex", "0");
      }
    } else if (tabIndex !== "-1" || floatingFocusElement.hasAttribute("data-tabindex") && floatingFocusElement.getAttribute("data-tabindex") !== "-1") {
      floatingFocusElement.setAttribute("tabindex", "-1");
      floatingFocusElement.setAttribute("data-tabindex", "-1");
    }
  }
  function FloatingFocusManager(props) {
    const {
      context,
      children,
      disabled: disabled2 = false,
      initialFocus = true,
      returnFocus = true,
      restoreFocus = false,
      modal = true,
      closeOnFocusOut = true,
      openInteractionType = "",
      nextFocusableElement,
      previousFocusableElement,
      beforeContentFocusGuardRef,
      externalTree,
      getInsideElements
    } = props;
    const store = "rootStore" in context ? context.rootStore : context;
    const open = store.useState("open");
    const domReference = store.useState("domReferenceElement");
    const floating = store.useState("floatingElement");
    const {
      events,
      dataRef
    } = store.context;
    const getNodeId = useStableCallback(() => dataRef.current.floatingContext?.nodeId);
    const ignoreInitialFocus = initialFocus === false;
    const isUntrappedTypeableCombobox = isTypeableCombobox(domReference) && ignoreInitialFocus;
    const orderRef = React22.useRef(["content"]);
    const initialFocusRef = useValueAsRef(initialFocus);
    const returnFocusRef = useValueAsRef(returnFocus);
    const openInteractionTypeRef = useValueAsRef(openInteractionType);
    const tree = useFloatingTree(externalTree);
    const portalContext = usePortalContext();
    const preventReturnFocusRef = React22.useRef(false);
    const isPointerDownRef = React22.useRef(false);
    const pointerDownOutsideRef = React22.useRef(false);
    const lastFocusedTabbableRef = React22.useRef(null);
    const closeTypeRef = React22.useRef("");
    const lastInteractionTypeRef = React22.useRef("");
    const beforeGuardRef = React22.useRef(null);
    const afterGuardRef = React22.useRef(null);
    const mergedBeforeGuardRef = useMergedRefs(beforeGuardRef, beforeContentFocusGuardRef, portalContext?.beforeInsideRef);
    const mergedAfterGuardRef = useMergedRefs(afterGuardRef, portalContext?.afterInsideRef);
    const blurTimeout = useTimeout();
    const pointerDownTimeout = useTimeout();
    const restoreFocusFrame = useAnimationFrame();
    const isInsidePortal = portalContext != null;
    const floatingFocusElement = getFloatingFocusElement(floating);
    const getTabbableContent = useStableCallback((container = floatingFocusElement) => {
      return container ? tabbable(container) : [];
    });
    const getResolvedInsideElements = useStableCallback(() => getInsideElements?.().filter((element) => element != null) ?? []);
    React22.useEffect(() => {
      if (disabled2 || !modal) {
        return void 0;
      }
      function onKeyDown(event) {
        if (event.key === "Tab") {
          if (contains(floatingFocusElement, activeElement(ownerDocument(floatingFocusElement))) && getTabbableContent().length === 0 && !isUntrappedTypeableCombobox) {
            stopEvent(event);
          }
        }
      }
      const doc = ownerDocument(floatingFocusElement);
      return addEventListener(doc, "keydown", onKeyDown);
    }, [disabled2, domReference, floatingFocusElement, modal, orderRef, isUntrappedTypeableCombobox, getTabbableContent]);
    React22.useEffect(() => {
      if (disabled2 || !open) {
        return void 0;
      }
      const doc = ownerDocument(floatingFocusElement);
      function clearPointerDownOutside() {
        pointerDownOutsideRef.current = false;
      }
      function onPointerDown(event) {
        const target = getTarget(event);
        const insideElements = getResolvedInsideElements();
        const pointerTargetInside = contains(floating, target) || contains(domReference, target) || contains(portalContext?.portalNode, target) || insideElements.some((element) => element === target || contains(element, target));
        pointerDownOutsideRef.current = !pointerTargetInside;
        lastInteractionTypeRef.current = event.pointerType || "keyboard";
        if (target?.closest(`[${CLICK_TRIGGER_IDENTIFIER}]`)) {
          isPointerDownRef.current = true;
        }
      }
      function onKeyDown() {
        lastInteractionTypeRef.current = "keyboard";
      }
      return mergeCleanups(addEventListener(doc, "pointerdown", onPointerDown, true), addEventListener(doc, "pointerup", clearPointerDownOutside, true), addEventListener(doc, "pointercancel", clearPointerDownOutside, true), addEventListener(doc, "keydown", onKeyDown, true));
    }, [disabled2, floating, domReference, floatingFocusElement, open, portalContext, getResolvedInsideElements]);
    React22.useEffect(() => {
      if (disabled2 || !closeOnFocusOut) {
        return void 0;
      }
      const doc = ownerDocument(floatingFocusElement);
      function handlePointerDown() {
        isPointerDownRef.current = true;
        pointerDownTimeout.start(0, () => {
          isPointerDownRef.current = false;
        });
      }
      function handleFocusIn(event) {
        const target = getTarget(event);
        if (isTabbable(target)) {
          lastFocusedTabbableRef.current = target;
        }
      }
      function handleFocusOutside(event) {
        const relatedTarget = event.relatedTarget;
        const currentTarget = event.currentTarget;
        const target = getTarget(event);
        queueMicrotask(() => {
          const nodeId = getNodeId();
          const triggers = store.context.triggerElements;
          const insideElements = getResolvedInsideElements();
          const isRelatedFocusGuard = relatedTarget?.hasAttribute(createAttribute("focus-guard")) && [beforeGuardRef.current, afterGuardRef.current, portalContext?.beforeInsideRef.current, portalContext?.afterInsideRef.current, portalContext?.beforeOutsideRef.current, portalContext?.afterOutsideRef.current, resolveRef(previousFocusableElement), resolveRef(nextFocusableElement)].includes(relatedTarget);
          const movedToUnrelatedNode = !(contains(domReference, relatedTarget) || contains(floating, relatedTarget) || contains(relatedTarget, floating) || contains(portalContext?.portalNode, relatedTarget) || insideElements.some((element) => element === relatedTarget || contains(element, relatedTarget)) || relatedTarget != null && triggers.hasElement(relatedTarget) || triggers.hasMatchingElement((trigger) => contains(trigger, relatedTarget)) || isRelatedFocusGuard || tree && (getNodeChildren(tree.nodesRef.current, nodeId).find((node) => contains(node.context?.elements.floating, relatedTarget) || contains(node.context?.elements.domReference, relatedTarget)) || getNodeAncestors(tree.nodesRef.current, nodeId).find((node) => [node.context?.elements.floating, getFloatingFocusElement(node.context?.elements.floating)].includes(relatedTarget) || node.context?.elements.domReference === relatedTarget)));
          if (currentTarget === domReference && floatingFocusElement) {
            handleTabIndex(floatingFocusElement, orderRef);
          }
          if (restoreFocus && currentTarget !== domReference && !isElementVisible(target) && activeElement(doc) === doc.body) {
            if (isHTMLElement(floatingFocusElement)) {
              floatingFocusElement.focus();
              if (restoreFocus === "popup") {
                restoreFocusFrame.request(() => {
                  floatingFocusElement.focus();
                });
                return;
              }
            }
            const tabbableContent = getTabbableContent();
            const prevTabbable = lastFocusedTabbableRef.current;
            const nodeToFocus = (prevTabbable && tabbableContent.includes(prevTabbable) ? prevTabbable : null) || tabbableContent[tabbableContent.length - 1] || floatingFocusElement;
            if (isHTMLElement(nodeToFocus)) {
              nodeToFocus.focus();
            }
          }
          if (dataRef.current.insideReactTree) {
            dataRef.current.insideReactTree = false;
            return;
          }
          if ((isUntrappedTypeableCombobox ? true : !modal) && relatedTarget && movedToUnrelatedNode && !isPointerDownRef.current && // Fix React 18 Strict Mode returnFocus due to double rendering.
          // For an "untrapped" typeable combobox (input role=combobox with
          // initialFocus=false), re-opening the popup and tabbing out should still close it even
          // when the previously focused element (e.g. the next tabbable outside the popup) is
          // focused again. Otherwise, the popup remains open on the second Tab sequence:
          // click input -> Tab (closes) -> click input -> Tab.
          // Allow closing when `isUntrappedTypeableCombobox` regardless of the previously focused element.
          (isUntrappedTypeableCombobox || relatedTarget !== getPreviouslyFocusedElement())) {
            preventReturnFocusRef.current = true;
            store.setOpen(false, createChangeEventDetails(reason_parts_exports.focusOut, event));
          }
        });
      }
      function markInsideReactTree() {
        if (pointerDownOutsideRef.current) {
          return;
        }
        dataRef.current.insideReactTree = true;
        blurTimeout.start(0, () => {
          dataRef.current.insideReactTree = false;
        });
      }
      const domReferenceElement = isHTMLElement(domReference) ? domReference : null;
      if (!floating && !domReferenceElement) {
        return void 0;
      }
      return mergeCleanups(domReferenceElement && addEventListener(domReferenceElement, "focusout", handleFocusOutside), domReferenceElement && addEventListener(domReferenceElement, "pointerdown", handlePointerDown), floating && addEventListener(floating, "focusin", handleFocusIn), floating && addEventListener(floating, "focusout", handleFocusOutside), floating && portalContext && addEventListener(floating, "focusout", markInsideReactTree, true));
    }, [disabled2, domReference, floating, floatingFocusElement, modal, tree, portalContext, store, closeOnFocusOut, restoreFocus, getTabbableContent, isUntrappedTypeableCombobox, getNodeId, orderRef, dataRef, blurTimeout, pointerDownTimeout, restoreFocusFrame, nextFocusableElement, previousFocusableElement, getResolvedInsideElements]);
    React22.useEffect(() => {
      if (disabled2 || !floating || !open) {
        return void 0;
      }
      const portalNodes = Array.from(portalContext?.portalNode?.querySelectorAll(`[${createAttribute("portal")}]`) || []);
      const ancestors = tree ? getNodeAncestors(tree.nodesRef.current, getNodeId()) : [];
      const rootAncestorComboboxDomReference = ancestors.find((node) => isTypeableCombobox(node.context?.elements.domReference || null))?.context?.elements.domReference;
      const controlInsideElements = [floating, ...portalNodes, beforeGuardRef.current, afterGuardRef.current, portalContext?.beforeOutsideRef.current, portalContext?.afterOutsideRef.current, ...getResolvedInsideElements()];
      const insideElements = [...controlInsideElements, rootAncestorComboboxDomReference, resolveRef(previousFocusableElement), resolveRef(nextFocusableElement), isUntrappedTypeableCombobox ? domReference : null].filter((x) => x != null);
      const ariaHiddenCleanup = markOthers(insideElements, {
        ariaHidden: modal || isUntrappedTypeableCombobox,
        mark: false
      });
      const markerInsideElements = [floating, ...portalNodes].filter((x) => x != null);
      const markerCleanup = markOthers(markerInsideElements);
      return () => {
        markerCleanup();
        ariaHiddenCleanup();
      };
    }, [open, disabled2, domReference, floating, modal, orderRef, portalContext, isUntrappedTypeableCombobox, tree, getNodeId, nextFocusableElement, previousFocusableElement, getResolvedInsideElements]);
    useIsoLayoutEffect(() => {
      if (!open || disabled2 || !isHTMLElement(floatingFocusElement)) {
        return;
      }
      const doc = ownerDocument(floatingFocusElement);
      const previouslyFocusedElement = activeElement(doc);
      queueMicrotask(() => {
        const initialFocusValueOrFn = initialFocusRef.current;
        const resolvedInitialFocus = typeof initialFocusValueOrFn === "function" ? initialFocusValueOrFn(openInteractionTypeRef.current || "") : initialFocusValueOrFn;
        if (resolvedInitialFocus === void 0 || resolvedInitialFocus === false) {
          return;
        }
        const focusAlreadyInsideFloatingEl = contains(floatingFocusElement, previouslyFocusedElement);
        if (focusAlreadyInsideFloatingEl) {
          return;
        }
        let focusableElements = null;
        const getDefaultFocusElement = () => {
          if (focusableElements == null) {
            focusableElements = getTabbableContent(floatingFocusElement);
          }
          return focusableElements[0] || floatingFocusElement;
        };
        let elToFocus;
        if (resolvedInitialFocus === true || resolvedInitialFocus === null) {
          elToFocus = getDefaultFocusElement();
        } else {
          elToFocus = resolveRef(resolvedInitialFocus);
        }
        elToFocus = elToFocus || getDefaultFocusElement();
        enqueueFocus(elToFocus, {
          preventScroll: elToFocus === floatingFocusElement
        });
      });
    }, [disabled2, open, floatingFocusElement, ignoreInitialFocus, getTabbableContent, initialFocusRef, openInteractionTypeRef]);
    useIsoLayoutEffect(() => {
      if (disabled2 || !floatingFocusElement) {
        return void 0;
      }
      const doc = ownerDocument(floatingFocusElement);
      const previouslyFocusedElement = activeElement(doc);
      addPreviouslyFocusedElement(previouslyFocusedElement);
      function onOpenChangeLocal(details) {
        if (!details.open) {
          closeTypeRef.current = getEventType(details.nativeEvent, lastInteractionTypeRef.current);
        }
        if (details.reason === reason_parts_exports.triggerHover && details.nativeEvent.type === "mouseleave") {
          preventReturnFocusRef.current = true;
        }
        if (details.reason !== reason_parts_exports.outsidePress) {
          return;
        }
        if (details.nested) {
          preventReturnFocusRef.current = false;
        } else if (isVirtualClick(details.nativeEvent) || isVirtualPointerEvent(details.nativeEvent)) {
          preventReturnFocusRef.current = false;
        } else {
          let isPreventScrollSupported = false;
          ownerDocument(floatingFocusElement).createElement("div").focus({
            get preventScroll() {
              isPreventScrollSupported = true;
              return false;
            }
          });
          if (isPreventScrollSupported) {
            preventReturnFocusRef.current = false;
          } else {
            preventReturnFocusRef.current = true;
          }
        }
      }
      events.on("openchange", onOpenChangeLocal);
      function getReturnElement() {
        const returnFocusValueOrFn = returnFocusRef.current;
        let resolvedReturnFocusValue = typeof returnFocusValueOrFn === "function" ? returnFocusValueOrFn(closeTypeRef.current) : returnFocusValueOrFn;
        if (resolvedReturnFocusValue === void 0 || resolvedReturnFocusValue === false) {
          return null;
        }
        if (resolvedReturnFocusValue === null) {
          resolvedReturnFocusValue = true;
        }
        if (typeof resolvedReturnFocusValue === "boolean") {
          const el = domReference || getPreviouslyFocusedElement();
          return el && el.isConnected ? el : null;
        }
        const fallback = domReference || getPreviouslyFocusedElement();
        return resolveRef(resolvedReturnFocusValue) || fallback || null;
      }
      return () => {
        events.off("openchange", onOpenChangeLocal);
        const activeEl = activeElement(doc);
        const insideElements = getResolvedInsideElements();
        const isFocusInsideFloatingTree = contains(floating, activeEl) || insideElements.some((element) => element === activeEl || contains(element, activeEl)) || tree && getNodeChildren(tree.nodesRef.current, getNodeId(), false).some((node) => contains(node.context?.elements.floating, activeEl));
        const returnFocusValueOrFn = returnFocusRef.current;
        const returnElement = getReturnElement();
        queueMicrotask(() => {
          const tabbableReturnElement = getFirstTabbableElement(returnElement);
          const hasExplicitReturnFocus = typeof returnFocusValueOrFn !== "boolean";
          if (returnFocusValueOrFn && !preventReturnFocusRef.current && isHTMLElement(tabbableReturnElement) && // If the focus moved somewhere else after mount, avoid returning focus
          // since it likely entered a different element which should be
          // respected: https://github.com/floating-ui/floating-ui/issues/2607
          (!hasExplicitReturnFocus && tabbableReturnElement !== activeEl && activeEl !== doc.body ? isFocusInsideFloatingTree : true)) {
            tabbableReturnElement.focus({
              preventScroll: true
            });
          }
          preventReturnFocusRef.current = false;
        });
      };
    }, [disabled2, floating, floatingFocusElement, returnFocusRef, dataRef, events, tree, domReference, getNodeId, getResolvedInsideElements]);
    useIsoLayoutEffect(() => {
      if (!isWebKit2 || open || !floating) {
        return;
      }
      const activeEl = activeElement(ownerDocument(floating));
      if (!isHTMLElement(activeEl) || !isTypeableElement(activeEl)) {
        return;
      }
      if (contains(floating, activeEl)) {
        activeEl.blur();
      }
    }, [open, floating]);
    useIsoLayoutEffect(() => {
      if (disabled2 || !portalContext) {
        return void 0;
      }
      portalContext.setFocusManagerState({
        modal,
        closeOnFocusOut,
        open,
        onOpenChange: store.setOpen,
        domReference
      });
      return () => {
        portalContext.setFocusManagerState(null);
      };
    }, [disabled2, portalContext, modal, open, store, closeOnFocusOut, domReference]);
    useIsoLayoutEffect(() => {
      if (disabled2 || !floatingFocusElement) {
        return void 0;
      }
      handleTabIndex(floatingFocusElement, orderRef);
      return () => {
        queueMicrotask(clearDisconnectedPreviouslyFocusedElements);
      };
    }, [disabled2, floatingFocusElement, orderRef]);
    const shouldRenderGuards = !disabled2 && (modal ? !isUntrappedTypeableCombobox : true) && (isInsidePortal || modal);
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(React22.Fragment, {
      children: [shouldRenderGuards && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FocusGuard, {
        "data-type": "inside",
        ref: mergedBeforeGuardRef,
        onFocus: (event) => {
          if (modal) {
            const els = getTabbableContent();
            enqueueFocus(els[els.length - 1]);
          } else if (portalContext?.portalNode) {
            preventReturnFocusRef.current = false;
            if (isOutsideEvent(event, portalContext.portalNode)) {
              const nextTabbable = getNextTabbable(domReference);
              nextTabbable?.focus();
            } else {
              resolveRef(previousFocusableElement ?? portalContext.beforeOutsideRef)?.focus();
            }
          }
        }
      }), children, shouldRenderGuards && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FocusGuard, {
        "data-type": "inside",
        ref: mergedAfterGuardRef,
        onFocus: (event) => {
          if (modal) {
            enqueueFocus(getTabbableContent()[0]);
          } else if (portalContext?.portalNode) {
            if (closeOnFocusOut) {
              preventReturnFocusRef.current = true;
            }
            if (isOutsideEvent(event, portalContext.portalNode)) {
              const prevTabbable = getPreviousTabbable(domReference);
              prevTabbable?.focus();
            } else {
              resolveRef(nextFocusableElement ?? portalContext.afterOutsideRef)?.focus();
            }
          }
        }
      })]
    });
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/hooks/useClick.js
  init_define_import_meta_env();
  var React23 = __toESM(require_react_shim(), 1);
  function useClick(context, props = {}) {
    const store = "rootStore" in context ? context.rootStore : context;
    const dataRef = store.context.dataRef;
    const {
      enabled = true,
      event: eventOption = "click",
      toggle = true,
      ignoreMouse = false,
      stickIfOpen = true,
      touchOpenDelay = 0,
      reason = reason_parts_exports.triggerPress
    } = props;
    const pointerTypeRef = React23.useRef(void 0);
    const frame = useAnimationFrame();
    const touchOpenTimeout = useTimeout();
    const reference = React23.useMemo(() => ({
      onPointerDown(event) {
        pointerTypeRef.current = event.pointerType;
      },
      onMouseDown(event) {
        const pointerType = pointerTypeRef.current;
        const nativeEvent = event.nativeEvent;
        const open = store.select("open");
        if (event.button !== 0 || eventOption === "click" || isMouseLikePointerType(pointerType, true) && ignoreMouse) {
          return;
        }
        const openEvent = dataRef.current.openEvent;
        const openEventType = openEvent?.type;
        const hasClickedOnInactiveTrigger = store.select("domReferenceElement") !== event.currentTarget;
        const nextOpen = open && hasClickedOnInactiveTrigger || !(open && toggle && (openEvent && stickIfOpen ? openEventType === "click" || openEventType === "mousedown" : true));
        const target = getTarget(nativeEvent);
        if (isTypeableElement(target)) {
          const details = createChangeEventDetails(reason, nativeEvent, target);
          if (nextOpen && pointerType === "touch" && touchOpenDelay > 0) {
            touchOpenTimeout.start(touchOpenDelay, () => {
              store.setOpen(true, details);
            });
          } else {
            store.setOpen(nextOpen, details);
          }
          return;
        }
        const eventCurrentTarget = event.currentTarget;
        frame.request(() => {
          const details = createChangeEventDetails(reason, nativeEvent, eventCurrentTarget);
          if (nextOpen && pointerType === "touch" && touchOpenDelay > 0) {
            touchOpenTimeout.start(touchOpenDelay, () => {
              store.setOpen(true, details);
            });
          } else {
            store.setOpen(nextOpen, details);
          }
        });
      },
      onClick(event) {
        if (eventOption === "mousedown-only") {
          return;
        }
        const pointerType = pointerTypeRef.current;
        if (eventOption === "mousedown" && pointerType) {
          pointerTypeRef.current = void 0;
          return;
        }
        if (isMouseLikePointerType(pointerType, true) && ignoreMouse) {
          return;
        }
        const open = store.select("open");
        const openEvent = dataRef.current.openEvent;
        const hasClickedOnInactiveTrigger = store.select("domReferenceElement") !== event.currentTarget;
        const nextOpen = open && hasClickedOnInactiveTrigger || !(open && toggle && (openEvent && stickIfOpen ? isClickLikeEvent(openEvent) : true));
        const details = createChangeEventDetails(reason, event.nativeEvent, event.currentTarget);
        if (nextOpen && pointerType === "touch" && touchOpenDelay > 0) {
          touchOpenTimeout.start(touchOpenDelay, () => {
            store.setOpen(true, details);
          });
        } else {
          store.setOpen(nextOpen, details);
        }
      },
      onKeyDown() {
        pointerTypeRef.current = void 0;
      }
    }), [dataRef, eventOption, ignoreMouse, store, stickIfOpen, toggle, frame, touchOpenTimeout, touchOpenDelay, reason]);
    return React23.useMemo(() => enabled ? {
      reference
    } : EMPTY_OBJECT, [enabled, reference]);
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/hooks/useDismiss.js
  init_define_import_meta_env();
  var React24 = __toESM(require_react_shim(), 1);
  var bubbleHandlerKeys = {
    intentional: "onClick",
    sloppy: "onPointerDown"
  };
  function alwaysFalse() {
    return false;
  }
  function normalizeProp(normalizable) {
    return {
      escapeKey: typeof normalizable === "boolean" ? normalizable : normalizable?.escapeKey ?? false,
      outsidePress: typeof normalizable === "boolean" ? normalizable : normalizable?.outsidePress ?? true
    };
  }
  function useDismiss(context, props = {}) {
    const store = "rootStore" in context ? context.rootStore : context;
    const open = store.useState("open");
    const floatingElement = store.useState("floatingElement");
    const {
      dataRef
    } = store.context;
    const {
      enabled = true,
      escapeKey: escapeKey2 = true,
      outsidePress: outsidePressProp = true,
      outsidePressEvent = "sloppy",
      referencePress = alwaysFalse,
      referencePressEvent = "sloppy",
      bubbles,
      externalTree
    } = props;
    const tree = useFloatingTree(externalTree);
    const outsidePressFn = useStableCallback(typeof outsidePressProp === "function" ? outsidePressProp : () => false);
    const outsidePress2 = typeof outsidePressProp === "function" ? outsidePressFn : outsidePressProp;
    const outsidePressEnabled = outsidePress2 !== false;
    const getOutsidePressEventProp = useStableCallback(() => outsidePressEvent);
    const pressStartedInsideRef = React24.useRef(false);
    const pressStartPreventedRef = React24.useRef(false);
    const suppressNextOutsideClickRef = React24.useRef(false);
    const {
      escapeKey: escapeKeyBubbles,
      outsidePress: outsidePressBubbles
    } = normalizeProp(bubbles);
    const touchStateRef = React24.useRef(null);
    const cancelDismissOnEndTimeout = useTimeout();
    const clearInsideReactTreeTimeout = useTimeout();
    const clearInsideReactTree = useStableCallback(() => {
      clearInsideReactTreeTimeout.clear();
      dataRef.current.insideReactTree = false;
    });
    const isComposingRef = React24.useRef(false);
    const currentPointerTypeRef = React24.useRef("");
    const isReferencePressEnabled = useStableCallback(referencePress);
    const closeOnEscapeKeyDown = useStableCallback((event) => {
      if (!open || !enabled || !escapeKey2 || event.key !== "Escape") {
        return;
      }
      if (isComposingRef.current) {
        return;
      }
      const nodeId = dataRef.current.floatingContext?.nodeId;
      const children = tree ? getNodeChildren(tree.nodesRef.current, nodeId) : [];
      if (!escapeKeyBubbles) {
        if (children.length > 0) {
          let shouldDismiss = true;
          children.forEach((child) => {
            if (child.context?.open && !child.context.dataRef.current.__escapeKeyBubbles) {
              shouldDismiss = false;
            }
          });
          if (!shouldDismiss) {
            return;
          }
        }
      }
      const native = isReactEvent(event) ? event.nativeEvent : event;
      const eventDetails = createChangeEventDetails(reason_parts_exports.escapeKey, native);
      store.setOpen(false, eventDetails);
      if (!escapeKeyBubbles && !eventDetails.isPropagationAllowed) {
        event.stopPropagation();
      }
    });
    const markInsideReactTree = useStableCallback(() => {
      dataRef.current.insideReactTree = true;
      clearInsideReactTreeTimeout.start(0, clearInsideReactTree);
    });
    React24.useEffect(() => {
      if (!open || !enabled) {
        return void 0;
      }
      dataRef.current.__escapeKeyBubbles = escapeKeyBubbles;
      dataRef.current.__outsidePressBubbles = outsidePressBubbles;
      const compositionTimeout = new Timeout();
      const preventedPressSuppressionTimeout = new Timeout();
      function handleCompositionStart() {
        compositionTimeout.clear();
        isComposingRef.current = true;
      }
      function handleCompositionEnd() {
        compositionTimeout.start(
          // 0ms or 1ms don't work in Safari. 5ms appears to consistently work.
          // Only apply to WebKit for the test to remain 0ms.
          isWebKit() ? 5 : 0,
          () => {
            isComposingRef.current = false;
          }
        );
      }
      function suppressImmediateOutsideClickAfterPreventedStart() {
        suppressNextOutsideClickRef.current = true;
        preventedPressSuppressionTimeout.start(0, () => {
          suppressNextOutsideClickRef.current = false;
        });
      }
      function resetPressStartState() {
        pressStartedInsideRef.current = false;
        pressStartPreventedRef.current = false;
      }
      function getOutsidePressEvent() {
        const type = currentPointerTypeRef.current;
        const computedType = type === "pen" || !type ? "mouse" : type;
        const outsidePressEventValue = getOutsidePressEventProp();
        const resolved = typeof outsidePressEventValue === "function" ? outsidePressEventValue() : outsidePressEventValue;
        if (typeof resolved === "string") {
          return resolved;
        }
        return resolved[computedType];
      }
      function shouldIgnoreEvent(event) {
        const computedOutsidePressEvent = getOutsidePressEvent();
        return computedOutsidePressEvent === "intentional" && event.type !== "click" || computedOutsidePressEvent === "sloppy" && event.type === "click";
      }
      function isEventWithinFloatingTree(event) {
        const nodeId = dataRef.current.floatingContext?.nodeId;
        const targetIsInsideChildren = tree && getNodeChildren(tree.nodesRef.current, nodeId).some((node) => isEventTargetWithin(event, node.context?.elements.floating));
        return isEventTargetWithin(event, store.select("floatingElement")) || isEventTargetWithin(event, store.select("domReferenceElement")) || targetIsInsideChildren;
      }
      function closeOnPressOutside(event) {
        if (shouldIgnoreEvent(event)) {
          clearInsideReactTree();
          return;
        }
        if (dataRef.current.insideReactTree) {
          clearInsideReactTree();
          return;
        }
        const target = getTarget(event);
        const inertSelector = `[${createAttribute("inert")}]`;
        const targetRoot = isElement(target) ? target.getRootNode() : null;
        const markers = Array.from((isShadowRoot(targetRoot) ? targetRoot : ownerDocument(store.select("floatingElement"))).querySelectorAll(inertSelector));
        const triggers = store.context.triggerElements;
        if (target && (triggers.hasElement(target) || triggers.hasMatchingElement((trigger) => contains(trigger, target)))) {
          return;
        }
        let targetRootAncestor = isElement(target) ? target : null;
        while (targetRootAncestor && !isLastTraversableNode(targetRootAncestor)) {
          const nextParent = getParentNode(targetRootAncestor);
          if (isLastTraversableNode(nextParent) || !isElement(nextParent)) {
            break;
          }
          targetRootAncestor = nextParent;
        }
        if (markers.length && isElement(target) && !isRootElement(target) && // Clicked on a direct ancestor (e.g. FloatingOverlay).
        !contains(target, store.select("floatingElement")) && // If the target root element contains none of the markers, then the
        // element was injected after the floating element rendered.
        markers.every((marker) => !contains(targetRootAncestor, marker))) {
          return;
        }
        if (isHTMLElement(target) && !("touches" in event)) {
          const lastTraversableNode = isLastTraversableNode(target);
          const style = getComputedStyle2(target);
          const scrollRe = /auto|scroll/;
          const isScrollableX = lastTraversableNode || scrollRe.test(style.overflowX);
          const isScrollableY = lastTraversableNode || scrollRe.test(style.overflowY);
          const canScrollX = isScrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth;
          const canScrollY = isScrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight;
          const isRTL = style.direction === "rtl";
          const pressedVerticalScrollbar = canScrollY && (isRTL ? event.offsetX <= target.offsetWidth - target.clientWidth : event.offsetX > target.clientWidth);
          const pressedHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight;
          if (pressedVerticalScrollbar || pressedHorizontalScrollbar) {
            return;
          }
        }
        if (isEventWithinFloatingTree(event)) {
          return;
        }
        if (getOutsidePressEvent() === "intentional" && suppressNextOutsideClickRef.current) {
          preventedPressSuppressionTimeout.clear();
          suppressNextOutsideClickRef.current = false;
          return;
        }
        if (typeof outsidePress2 === "function" && !outsidePress2(event)) {
          return;
        }
        const nodeId = dataRef.current.floatingContext?.nodeId;
        const children = tree ? getNodeChildren(tree.nodesRef.current, nodeId) : [];
        if (children.length > 0) {
          let shouldDismiss = true;
          children.forEach((child) => {
            if (child.context?.open && !child.context.dataRef.current.__outsidePressBubbles) {
              shouldDismiss = false;
            }
          });
          if (!shouldDismiss) {
            return;
          }
        }
        store.setOpen(false, createChangeEventDetails(reason_parts_exports.outsidePress, event));
        clearInsideReactTree();
      }
      function handlePointerDown(event) {
        if (getOutsidePressEvent() !== "sloppy" || event.pointerType === "touch" || !store.select("open") || !enabled || isEventTargetWithin(event, store.select("floatingElement")) || isEventTargetWithin(event, store.select("domReferenceElement"))) {
          return;
        }
        closeOnPressOutside(event);
      }
      function handleTouchStart(event) {
        if (getOutsidePressEvent() !== "sloppy" || !store.select("open") || !enabled || isEventTargetWithin(event, store.select("floatingElement")) || isEventTargetWithin(event, store.select("domReferenceElement"))) {
          return;
        }
        const touch = event.touches[0];
        if (touch) {
          touchStateRef.current = {
            startTime: Date.now(),
            startX: touch.clientX,
            startY: touch.clientY,
            dismissOnTouchEnd: false,
            dismissOnMouseDown: true
          };
          cancelDismissOnEndTimeout.start(1e3, () => {
            if (touchStateRef.current) {
              touchStateRef.current.dismissOnTouchEnd = false;
              touchStateRef.current.dismissOnMouseDown = false;
            }
          });
        }
      }
      function addTargetEventListenerOnce(event, listener) {
        const target = getTarget(event);
        if (!target) {
          return;
        }
        const unsubscribe2 = addEventListener(target, event.type, () => {
          listener(event);
          unsubscribe2();
        });
      }
      function handleTouchStartCapture(event) {
        currentPointerTypeRef.current = "touch";
        addTargetEventListenerOnce(event, handleTouchStart);
      }
      function closeOnPressOutsideCapture(event) {
        cancelDismissOnEndTimeout.clear();
        if (event.type === "pointerdown") {
          currentPointerTypeRef.current = event.pointerType;
        }
        if (event.type === "mousedown" && touchStateRef.current && !touchStateRef.current.dismissOnMouseDown) {
          return;
        }
        addTargetEventListenerOnce(event, (targetEvent) => {
          if (targetEvent.type === "pointerdown") {
            handlePointerDown(targetEvent);
          } else {
            closeOnPressOutside(targetEvent);
          }
        });
      }
      function handlePressEndCapture(event) {
        if (!pressStartedInsideRef.current) {
          return;
        }
        const pressStartedInsideDefaultPrevented = pressStartPreventedRef.current;
        resetPressStartState();
        if (getOutsidePressEvent() !== "intentional") {
          return;
        }
        if (event.type === "pointercancel") {
          if (pressStartedInsideDefaultPrevented) {
            suppressImmediateOutsideClickAfterPreventedStart();
          }
          return;
        }
        if (isEventWithinFloatingTree(event)) {
          return;
        }
        if (pressStartedInsideDefaultPrevented) {
          suppressImmediateOutsideClickAfterPreventedStart();
          return;
        }
        if (typeof outsidePress2 === "function" && !outsidePress2(event)) {
          return;
        }
        preventedPressSuppressionTimeout.clear();
        suppressNextOutsideClickRef.current = true;
        clearInsideReactTree();
      }
      function handleTouchMove(event) {
        if (getOutsidePressEvent() !== "sloppy" || !touchStateRef.current || isEventTargetWithin(event, store.select("floatingElement")) || isEventTargetWithin(event, store.select("domReferenceElement"))) {
          return;
        }
        const touch = event.touches[0];
        if (!touch) {
          return;
        }
        const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
        const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > 5) {
          touchStateRef.current.dismissOnTouchEnd = true;
        }
        if (distance > 10) {
          closeOnPressOutside(event);
          cancelDismissOnEndTimeout.clear();
          touchStateRef.current = null;
        }
      }
      function handleTouchMoveCapture(event) {
        addTargetEventListenerOnce(event, handleTouchMove);
      }
      function handleTouchEnd(event) {
        if (getOutsidePressEvent() !== "sloppy" || !touchStateRef.current || isEventTargetWithin(event, store.select("floatingElement")) || isEventTargetWithin(event, store.select("domReferenceElement"))) {
          return;
        }
        if (touchStateRef.current.dismissOnTouchEnd) {
          closeOnPressOutside(event);
        }
        cancelDismissOnEndTimeout.clear();
        touchStateRef.current = null;
      }
      function handleTouchEndCapture(event) {
        addTargetEventListenerOnce(event, handleTouchEnd);
      }
      const doc = ownerDocument(floatingElement);
      const unsubscribe = mergeCleanups(escapeKey2 && mergeCleanups(addEventListener(doc, "keydown", closeOnEscapeKeyDown), addEventListener(doc, "compositionstart", handleCompositionStart), addEventListener(doc, "compositionend", handleCompositionEnd)), outsidePressEnabled && mergeCleanups(addEventListener(doc, "click", closeOnPressOutsideCapture, true), addEventListener(doc, "pointerdown", closeOnPressOutsideCapture, true), addEventListener(doc, "pointerup", handlePressEndCapture, true), addEventListener(doc, "pointercancel", handlePressEndCapture, true), addEventListener(doc, "mousedown", closeOnPressOutsideCapture, true), addEventListener(doc, "mouseup", handlePressEndCapture, true), addEventListener(doc, "touchstart", handleTouchStartCapture, true), addEventListener(doc, "touchmove", handleTouchMoveCapture, true), addEventListener(doc, "touchend", handleTouchEndCapture, true)));
      return () => {
        unsubscribe();
        compositionTimeout.clear();
        preventedPressSuppressionTimeout.clear();
        resetPressStartState();
        suppressNextOutsideClickRef.current = false;
      };
    }, [dataRef, floatingElement, escapeKey2, outsidePressEnabled, outsidePress2, open, enabled, escapeKeyBubbles, outsidePressBubbles, closeOnEscapeKeyDown, clearInsideReactTree, getOutsidePressEventProp, tree, store, cancelDismissOnEndTimeout]);
    React24.useEffect(clearInsideReactTree, [outsidePress2, clearInsideReactTree]);
    const reference = React24.useMemo(() => ({
      onKeyDown: closeOnEscapeKeyDown,
      [bubbleHandlerKeys[referencePressEvent]]: (event) => {
        if (!isReferencePressEnabled()) {
          return;
        }
        store.setOpen(false, createChangeEventDetails(reason_parts_exports.triggerPress, event.nativeEvent));
      },
      ...referencePressEvent !== "intentional" && {
        onClick(event) {
          if (!isReferencePressEnabled()) {
            return;
          }
          store.setOpen(false, createChangeEventDetails(reason_parts_exports.triggerPress, event.nativeEvent));
        }
      }
    }), [closeOnEscapeKeyDown, store, referencePressEvent, isReferencePressEnabled]);
    const markPressStartedInsideReactTree = useStableCallback((event) => {
      if (!open || !enabled || event.button !== 0) {
        return;
      }
      const target = getTarget(event.nativeEvent);
      if (!contains(store.select("floatingElement"), target)) {
        return;
      }
      if (!pressStartedInsideRef.current) {
        pressStartedInsideRef.current = true;
        pressStartPreventedRef.current = false;
      }
    });
    const markInsidePressStartPrevented = useStableCallback((event) => {
      if (!open || !enabled) {
        return;
      }
      if (!(event.defaultPrevented || event.nativeEvent.defaultPrevented)) {
        return;
      }
      if (pressStartedInsideRef.current) {
        pressStartPreventedRef.current = true;
      }
    });
    const floating = React24.useMemo(() => ({
      onKeyDown: closeOnEscapeKeyDown,
      // `onMouseDown` may be blocked if `event.preventDefault()` is called in
      // `onPointerDown`, such as with <NumberField.ScrubArea>.
      // See https://github.com/mui/base-ui/pull/3379
      onPointerDown: markInsidePressStartPrevented,
      onMouseDown: markInsidePressStartPrevented,
      onClickCapture: markInsideReactTree,
      onMouseDownCapture(event) {
        markInsideReactTree();
        markPressStartedInsideReactTree(event);
      },
      onPointerDownCapture(event) {
        markInsideReactTree();
        markPressStartedInsideReactTree(event);
      },
      onMouseUpCapture: markInsideReactTree,
      onTouchEndCapture: markInsideReactTree,
      onTouchMoveCapture: markInsideReactTree
    }), [closeOnEscapeKeyDown, markInsideReactTree, markPressStartedInsideReactTree, markInsidePressStartPrevented]);
    return React24.useMemo(() => enabled ? {
      reference,
      floating,
      trigger: reference
    } : {}, [enabled, reference, floating]);
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingRootStore.js
  init_define_import_meta_env();

  // node_modules/@base-ui/utils/esm/store/createSelector.js
  init_define_import_meta_env();
  var createSelector = (a, b, c, d, e, f, ...other) => {
    if (other.length > 0) {
      throw new Error(true ? "Unsupported number of selectors" : formatErrorMessage_default(1));
    }
    let selector;
    if (a && b && c && d && e && f) {
      selector = (state, a1, a2, a3) => {
        const va = a(state, a1, a2, a3);
        const vb = b(state, a1, a2, a3);
        const vc = c(state, a1, a2, a3);
        const vd = d(state, a1, a2, a3);
        const ve = e(state, a1, a2, a3);
        return f(va, vb, vc, vd, ve, a1, a2, a3);
      };
    } else if (a && b && c && d && e) {
      selector = (state, a1, a2, a3) => {
        const va = a(state, a1, a2, a3);
        const vb = b(state, a1, a2, a3);
        const vc = c(state, a1, a2, a3);
        const vd = d(state, a1, a2, a3);
        return e(va, vb, vc, vd, a1, a2, a3);
      };
    } else if (a && b && c && d) {
      selector = (state, a1, a2, a3) => {
        const va = a(state, a1, a2, a3);
        const vb = b(state, a1, a2, a3);
        const vc = c(state, a1, a2, a3);
        return d(va, vb, vc, a1, a2, a3);
      };
    } else if (a && b && c) {
      selector = (state, a1, a2, a3) => {
        const va = a(state, a1, a2, a3);
        const vb = b(state, a1, a2, a3);
        return c(va, vb, a1, a2, a3);
      };
    } else if (a && b) {
      selector = (state, a1, a2, a3) => {
        const va = a(state, a1, a2, a3);
        return b(va, a1, a2, a3);
      };
    } else if (a) {
      selector = a;
    } else {
      throw (
        /* minify-error-disabled */
        new Error("Missing arguments")
      );
    }
    return selector;
  };

  // node_modules/@base-ui/utils/esm/store/useStore.js
  init_define_import_meta_env();
  var React26 = __toESM(require_react_shim(), 1);
  var import_shim = __toESM(require_shim(), 1);
  var import_with_selector = __toESM(require_with_selector(), 1);

  // node_modules/@base-ui/utils/esm/fastHooks.js
  init_define_import_meta_env();
  var React25 = __toESM(require_react_shim(), 1);
  var hooks = [];
  var currentInstance = void 0;
  function getInstance() {
    return currentInstance;
  }
  function register(hook) {
    hooks.push(hook);
  }

  // node_modules/@base-ui/utils/esm/store/useStore.js
  var canUseRawUseSyncExternalStore = isReactVersionAtLeast(19);
  var useStoreImplementation = canUseRawUseSyncExternalStore ? useStoreFast : useStoreLegacy;
  function useStore(store, selector, a1, a2, a3) {
    return useStoreImplementation(store, selector, a1, a2, a3);
  }
  function useStoreR19(store, selector, a1, a2, a3) {
    const getSelection = React26.useCallback(() => selector(store.getSnapshot(), a1, a2, a3), [store, selector, a1, a2, a3]);
    return (0, import_shim.useSyncExternalStore)(store.subscribe, getSelection, getSelection);
  }
  register({
    before(instance) {
      instance.syncIndex = 0;
      if (!instance.didInitialize) {
        instance.syncTick = 1;
        instance.syncHooks = [];
        instance.didChangeStore = true;
        instance.getSnapshot = () => {
          let didChange2 = false;
          for (let i = 0; i < instance.syncHooks.length; i += 1) {
            const hook = instance.syncHooks[i];
            const value = hook.selector(hook.store.state, hook.a1, hook.a2, hook.a3);
            if (hook.didChange || !Object.is(hook.value, value)) {
              didChange2 = true;
              hook.value = value;
              hook.didChange = false;
            }
          }
          if (didChange2) {
            instance.syncTick += 1;
          }
          return instance.syncTick;
        };
      }
    },
    after(instance) {
      if (instance.syncHooks.length > 0) {
        if (instance.didChangeStore) {
          instance.didChangeStore = false;
          instance.subscribe = (onStoreChange) => {
            const stores = /* @__PURE__ */ new Set();
            for (const hook of instance.syncHooks) {
              stores.add(hook.store);
            }
            const unsubscribes = [];
            for (const store of stores) {
              unsubscribes.push(store.subscribe(onStoreChange));
            }
            return () => {
              for (const unsubscribe of unsubscribes) {
                unsubscribe();
              }
            };
          };
        }
        (0, import_shim.useSyncExternalStore)(instance.subscribe, instance.getSnapshot, instance.getSnapshot);
      }
    }
  });
  function useStoreFast(store, selector, a1, a2, a3) {
    const instance = getInstance();
    if (!instance) {
      return useStoreR19(store, selector, a1, a2, a3);
    }
    const index = instance.syncIndex;
    instance.syncIndex += 1;
    let hook;
    if (!instance.didInitialize) {
      hook = {
        store,
        selector,
        a1,
        a2,
        a3,
        value: selector(store.getSnapshot(), a1, a2, a3),
        didChange: false
      };
      instance.syncHooks.push(hook);
    } else {
      hook = instance.syncHooks[index];
      if (hook.store !== store || hook.selector !== selector || !Object.is(hook.a1, a1) || !Object.is(hook.a2, a2) || !Object.is(hook.a3, a3)) {
        if (hook.store !== store) {
          instance.didChangeStore = true;
        }
        hook.store = store;
        hook.selector = selector;
        hook.a1 = a1;
        hook.a2 = a2;
        hook.a3 = a3;
        hook.didChange = true;
      }
    }
    return hook.value;
  }
  function useStoreLegacy(store, selector, a1, a2, a3) {
    return (0, import_with_selector.useSyncExternalStoreWithSelector)(store.subscribe, store.getSnapshot, store.getSnapshot, (state) => selector(state, a1, a2, a3));
  }

  // node_modules/@base-ui/utils/esm/store/Store.js
  init_define_import_meta_env();
  var Store = class {
    /**
     * The current state of the store.
     * This property is updated immediately when the state changes as a result of calling {@link setState}, {@link update}, or {@link set}.
     * To subscribe to state changes, use the {@link useState} method. The value returned by {@link useState} is updated after the component renders (similarly to React's useState).
     * The values can be used directly (to avoid subscribing to the store) in effects or event handlers.
     *
     * Do not modify properties in state directly. Instead, use the provided methods to ensure proper state management and listener notification.
     */
    // Internal state to handle recursive `setState()` calls
    constructor(state) {
      /**
       * Registers a listener that will be called whenever the store's state changes.
       *
       * @param fn The listener function to be called on state changes.
       * @returns A function to unsubscribe the listener.
       */
      __publicField(this, "subscribe", (fn) => {
        this.listeners.add(fn);
        return () => {
          this.listeners.delete(fn);
        };
      });
      /**
       * Returns the current state of the store.
       */
      __publicField(this, "getSnapshot", () => {
        return this.state;
      });
      this.state = state;
      this.listeners = /* @__PURE__ */ new Set();
      this.updateTick = 0;
    }
    /**
     * Updates the entire store's state and notifies all registered listeners.
     *
     * @param newState The new state to set for the store.
     */
    setState(newState) {
      if (this.state === newState) {
        return;
      }
      this.state = newState;
      this.updateTick += 1;
      const currentTick = this.updateTick;
      for (const listener of this.listeners) {
        if (currentTick !== this.updateTick) {
          return;
        }
        listener(newState);
      }
    }
    /**
     * Merges the provided changes into the current state and notifies listeners if there are changes.
     *
     * @param changes An object containing the changes to apply to the current state.
     */
    update(changes) {
      for (const key in changes) {
        if (!Object.is(this.state[key], changes[key])) {
          this.setState({
            ...this.state,
            ...changes
          });
          return;
        }
      }
    }
    /**
     * Sets a specific key in the store's state to a new value and notifies listeners if the value has changed.
     *
     * @param key The key in the store's state to update.
     * @param value The new value to set for the specified key.
     */
    set(key, value) {
      if (!Object.is(this.state[key], value)) {
        this.setState({
          ...this.state,
          [key]: value
        });
      }
    }
    /**
     * Gives the state a new reference and updates all registered listeners.
     */
    notifyAll() {
      const newState = {
        ...this.state
      };
      this.setState(newState);
    }
    use(selector, a1, a2, a3) {
      return useStore(this, selector, a1, a2, a3);
    }
  };

  // node_modules/@base-ui/utils/esm/store/ReactStore.js
  init_define_import_meta_env();
  var React27 = __toESM(require_react_shim(), 1);
  var ReactStore = class extends Store {
    /**
     * Creates a new ReactStore instance.
     *
     * @param state Initial state of the store.
     * @param context Non-reactive context values.
     * @param selectors Optional selectors for use with `useState`.
     */
    constructor(state, context = {}, selectors3) {
      super(state);
      this.context = context;
      this.selectors = selectors3;
    }
    /**
     * Non-reactive values such as refs, callbacks, etc.
     */
    /**
     * Synchronizes a single external value into the store.
     *
     * Note that the while the value in `state` is updated immediately, the value returned
     * by `useState` is updated before the next render (similarly to React's `useState`).
     */
    useSyncedValue(key, value) {
      React27.useDebugValue(key);
      useIsoLayoutEffect(() => {
        if (this.state[key] !== value) {
          this.set(key, value);
        }
      }, [key, value]);
    }
    /**
     * Synchronizes a single external value into the store and
     * cleans it up (sets to `undefined`) on unmount.
     *
     * Note that the while the value in `state` is updated immediately, the value returned
     * by `useState` is updated before the next render (similarly to React's `useState`).
     */
    useSyncedValueWithCleanup(key, value) {
      const store = this;
      useIsoLayoutEffect(() => {
        if (store.state[key] !== value) {
          store.set(key, value);
        }
        return () => {
          store.set(key, void 0);
        };
      }, [store, key, value]);
    }
    /**
     * Synchronizes multiple external values into the store.
     *
     * Note that the while the values in `state` are updated immediately, the values returned
     * by `useState` are updated before the next render (similarly to React's `useState`).
     */
    useSyncedValues(statePart) {
      const store = this;
      if (true) {
        React27.useDebugValue(statePart, (p) => Object.keys(p));
        const keys = React27.useRef(Object.keys(statePart)).current;
        const nextKeys = Object.keys(statePart);
        if (keys.length !== nextKeys.length || keys.some((key, index) => key !== nextKeys[index])) {
          console.error("ReactStore.useSyncedValues expects the same prop keys on every render. Keys should be stable.");
        }
      }
      const dependencies = Object.values(statePart);
      useIsoLayoutEffect(() => {
        store.update(statePart);
      }, [store, ...dependencies]);
    }
    /**
     * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key. If `controlled`
     * is non-undefined, the store's state at `key` is updated to match `controlled`.
     */
    useControlledProp(key, controlled) {
      React27.useDebugValue(key);
      const isControlled = controlled !== void 0;
      useIsoLayoutEffect(() => {
        if (isControlled && !Object.is(this.state[key], controlled)) {
          super.setState({
            ...this.state,
            [key]: controlled
          });
        }
      }, [key, controlled, isControlled]);
      if (true) {
        const cache = this.controlledValues ?? (this.controlledValues = /* @__PURE__ */ new Map());
        if (!cache.has(key)) {
          cache.set(key, isControlled);
        }
        const previouslyControlled = cache.get(key);
        if (previouslyControlled !== void 0 && previouslyControlled !== isControlled) {
          console.error(`A component is changing the ${isControlled ? "" : "un"}controlled state of ${key.toString()} to be ${isControlled ? "un" : ""}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`);
        }
      }
    }
    /** Gets the current value from the store using a selector with the provided key.
     *
     * @param key Key of the selector to use.
     */
    select(key, a1, a2, a3) {
      const selector = this.selectors[key];
      return selector(this.state, a1, a2, a3);
    }
    /**
     * Returns a value from the store's state using a selector function.
     * Used to subscribe to specific parts of the state.
     * This methods causes a rerender whenever the selected state changes.
     *
     * @param key Key of the selector to use.
     */
    useState(key, a1, a2, a3) {
      React27.useDebugValue(key);
      return useStore(this, this.selectors[key], a1, a2, a3);
    }
    /**
     * Wraps a function with `useStableCallback` to ensure it has a stable reference
     * and assigns it to the context.
     *
     * @param key Key of the event callback. Must be a function in the context.
     * @param fn Function to assign.
     */
    useContextCallback(key, fn) {
      React27.useDebugValue(key);
      const stableFunction = useStableCallback(fn ?? NOOP);
      this.context[key] = stableFunction;
    }
    /**
     * Returns a stable setter function for a specific key in the store's state.
     * It's commonly used to pass as a ref callback to React elements.
     *
     * @param key Key of the state to set.
     */
    useStateSetter(key) {
      const ref = React27.useRef(void 0);
      if (ref.current === void 0) {
        ref.current = (value) => {
          this.set(key, value);
        };
      }
      return ref.current;
    }
    /**
     * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
     *
     * @param key Key of the selector to observe.
     * @param listener Listener function called when the selector result changes.
     */
    observe(selector, listener) {
      let selectFn;
      if (typeof selector === "function") {
        selectFn = selector;
      } else {
        selectFn = this.selectors[selector];
      }
      let prevValue = selectFn(this.state);
      listener(prevValue, prevValue, this);
      return this.subscribe((nextState) => {
        const nextValue = selectFn(nextState);
        if (!Object.is(prevValue, nextValue)) {
          const oldValue = prevValue;
          prevValue = nextValue;
          listener(nextValue, oldValue, this);
        }
      });
    }
  };

  // node_modules/@base-ui/react/esm/floating-ui-react/components/FloatingRootStore.js
  var selectors = {
    open: createSelector((state) => state.open),
    transitionStatus: createSelector((state) => state.transitionStatus),
    domReferenceElement: createSelector((state) => state.domReferenceElement),
    referenceElement: createSelector((state) => state.positionReference ?? state.referenceElement),
    floatingElement: createSelector((state) => state.floatingElement),
    floatingId: createSelector((state) => state.floatingId)
  };
  var FloatingRootStore = class extends ReactStore {
    constructor(options) {
      const {
        syncOnly,
        nested,
        onOpenChange,
        triggerElements,
        ...initialState
      } = options;
      super({
        ...initialState,
        positionReference: initialState.referenceElement,
        domReferenceElement: initialState.referenceElement
      }, {
        onOpenChange,
        dataRef: {
          current: {}
        },
        events: createEventEmitter(),
        nested,
        triggerElements
      }, selectors);
      /**
       * Syncs the event used by hover logic to distinguish hover-open from click-like interaction.
       */
      __publicField(this, "syncOpenEvent", (newOpen, event) => {
        if (!newOpen || !this.state.open || // Prevent a pending hover-open from overwriting a click-open event, while allowing
        // click events to upgrade a hover-open.
        event != null && isClickLikeEvent(event)) {
          this.context.dataRef.current.openEvent = newOpen ? event : void 0;
        }
      });
      /**
       * Runs the root-owned side effects for an open state change.
       */
      __publicField(this, "dispatchOpenChange", (newOpen, eventDetails) => {
        this.syncOpenEvent(newOpen, eventDetails.event);
        const details = {
          open: newOpen,
          reason: eventDetails.reason,
          nativeEvent: eventDetails.event,
          nested: this.context.nested,
          triggerElement: eventDetails.trigger
        };
        this.context.events.emit("openchange", details);
      });
      /**
       * Emits the `openchange` event through the internal event emitter and calls the `onOpenChange` handler with the provided arguments.
       *
       * @param newOpen The new open state.
       * @param eventDetails Details about the event that triggered the open state change.
       */
      __publicField(this, "setOpen", (newOpen, eventDetails) => {
        if (this.syncOnly) {
          this.context.onOpenChange?.(newOpen, eventDetails);
          return;
        }
        this.dispatchOpenChange(newOpen, eventDetails);
        this.context.onOpenChange?.(newOpen, eventDetails);
      });
      this.syncOnly = syncOnly;
    }
  };

  // node_modules/@base-ui/react/esm/utils/popups/popupStoreUtils.js
  init_define_import_meta_env();
  var React30 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/useTransitionStatus.js
  init_define_import_meta_env();
  var React28 = __toESM(require_react_shim(), 1);
  function useTransitionStatus(open, enableIdleState = false, deferEndingState = false) {
    const [transitionStatus, setTransitionStatus] = React28.useState(open && enableIdleState ? "idle" : void 0);
    const [mounted, setMounted] = React28.useState(open);
    if (open && !mounted) {
      setMounted(true);
      setTransitionStatus("starting");
    }
    if (!open && mounted && transitionStatus !== "ending" && !deferEndingState) {
      setTransitionStatus("ending");
    }
    if (!open && !mounted && transitionStatus === "ending") {
      setTransitionStatus(void 0);
    }
    useIsoLayoutEffect(() => {
      if (!open && mounted && transitionStatus !== "ending" && deferEndingState) {
        const frame = AnimationFrame.request(() => {
          setTransitionStatus("ending");
        });
        return () => {
          AnimationFrame.cancel(frame);
        };
      }
      return void 0;
    }, [open, mounted, transitionStatus, deferEndingState]);
    useIsoLayoutEffect(() => {
      if (!open || enableIdleState) {
        return void 0;
      }
      const frame = AnimationFrame.request(() => {
        setTransitionStatus(void 0);
      });
      return () => {
        AnimationFrame.cancel(frame);
      };
    }, [enableIdleState, open]);
    useIsoLayoutEffect(() => {
      if (!open || !enableIdleState) {
        return void 0;
      }
      if (open && mounted && transitionStatus !== "idle") {
        setTransitionStatus("starting");
      }
      const frame = AnimationFrame.request(() => {
        setTransitionStatus("idle");
      });
      return () => {
        AnimationFrame.cancel(frame);
      };
    }, [enableIdleState, open, mounted, transitionStatus]);
    return {
      mounted,
      setMounted,
      transitionStatus
    };
  }

  // node_modules/@base-ui/react/esm/internals/useOpenChangeComplete.js
  init_define_import_meta_env();
  var React29 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/useAnimationsFinished.js
  init_define_import_meta_env();
  var ReactDOM2 = __toESM(require_react_dom_shim(), 1);
  function useAnimationsFinished(elementOrRef, waitForStartingStyleRemoved = false, treatAbortedAsFinished = true) {
    const frame = useAnimationFrame();
    return useStableCallback((fnToExecute, signal = null) => {
      frame.cancel();
      const element = resolveRef(elementOrRef);
      if (element == null) {
        return;
      }
      const resolvedElement = element;
      const done = () => {
        ReactDOM2.flushSync(fnToExecute);
      };
      if (typeof resolvedElement.getAnimations !== "function" || globalThis.BASE_UI_ANIMATIONS_DISABLED) {
        fnToExecute();
        return;
      }
      function exec() {
        Promise.all(resolvedElement.getAnimations().map((animation) => animation.finished)).then(() => {
          if (!signal?.aborted) {
            done();
          }
        }).catch(() => {
          if (treatAbortedAsFinished) {
            if (!signal?.aborted) {
              done();
            }
            return;
          }
          const currentAnimations = resolvedElement.getAnimations();
          if (!signal?.aborted && currentAnimations.length > 0 && currentAnimations.some((animation) => animation.pending || animation.playState !== "finished")) {
            exec();
          }
        });
      }
      if (waitForStartingStyleRemoved) {
        const startingStyleAttribute = TransitionStatusDataAttributes.startingStyle;
        if (!resolvedElement.hasAttribute(startingStyleAttribute)) {
          frame.request(exec);
          return;
        }
        const attributeObserver = new MutationObserver(() => {
          if (!resolvedElement.hasAttribute(startingStyleAttribute)) {
            attributeObserver.disconnect();
            exec();
          }
        });
        attributeObserver.observe(resolvedElement, {
          attributes: true,
          attributeFilter: [startingStyleAttribute]
        });
        signal?.addEventListener("abort", () => attributeObserver.disconnect(), {
          once: true
        });
        return;
      }
      frame.request(exec);
    });
  }

  // node_modules/@base-ui/react/esm/internals/useOpenChangeComplete.js
  function useOpenChangeComplete(parameters) {
    const {
      enabled = true,
      open,
      ref,
      onComplete: onCompleteParam
    } = parameters;
    const onComplete = useStableCallback(onCompleteParam);
    const runOnceAnimationsFinish = useAnimationsFinished(ref, open, false);
    React29.useEffect(() => {
      if (!enabled) {
        return void 0;
      }
      const abortController = new AbortController();
      runOnceAnimationsFinish(onComplete, abortController.signal);
      return () => {
        abortController.abort();
      };
    }, [enabled, open, onComplete, runOnceAnimationsFinish]);
  }

  // node_modules/@base-ui/react/esm/utils/popups/popupStoreUtils.js
  function useTriggerRegistration(id, store) {
    const registeredElementIdRef = React30.useRef(null);
    const registeredElementRef = React30.useRef(null);
    return React30.useCallback((element) => {
      if (id === void 0) {
        return;
      }
      if (registeredElementIdRef.current !== null) {
        const registeredId = registeredElementIdRef.current;
        const registeredElement = registeredElementRef.current;
        const currentElement = store.context.triggerElements.getById(registeredId);
        if (registeredElement && currentElement === registeredElement) {
          store.context.triggerElements.delete(registeredId);
        }
        registeredElementIdRef.current = null;
        registeredElementRef.current = null;
      }
      if (element !== null) {
        registeredElementIdRef.current = id;
        registeredElementRef.current = element;
        store.context.triggerElements.add(id, element);
      }
    }, [store, id]);
  }
  function useTriggerDataForwarding(triggerId, triggerElementRef, store, stateUpdates) {
    const isMountedByThisTrigger = store.useState("isMountedByTrigger", triggerId);
    const baseRegisterTrigger = useTriggerRegistration(triggerId, store);
    const registerTrigger = useStableCallback((element) => {
      baseRegisterTrigger(element);
      if (!element || !store.select("open")) {
        return;
      }
      const activeTriggerId = store.select("activeTriggerId");
      if (activeTriggerId === triggerId) {
        store.update({
          activeTriggerElement: element,
          ...stateUpdates
        });
        return;
      }
      if (activeTriggerId == null) {
        store.update({
          activeTriggerId: triggerId,
          activeTriggerElement: element,
          ...stateUpdates
        });
      }
    });
    useIsoLayoutEffect(() => {
      if (isMountedByThisTrigger) {
        store.update({
          activeTriggerElement: triggerElementRef.current,
          ...stateUpdates
        });
      }
    }, [isMountedByThisTrigger, store, triggerElementRef, ...Object.values(stateUpdates)]);
    return {
      registerTrigger,
      isMountedByThisTrigger
    };
  }
  function useImplicitActiveTrigger(store) {
    const open = store.useState("open");
    useIsoLayoutEffect(() => {
      if (open && !store.select("activeTriggerId") && store.context.triggerElements.size === 1) {
        const iteratorResult = store.context.triggerElements.entries().next();
        if (!iteratorResult.done) {
          const [implicitTriggerId, implicitTriggerElement] = iteratorResult.value;
          store.update({
            activeTriggerId: implicitTriggerId,
            activeTriggerElement: implicitTriggerElement
          });
        }
      }
    }, [open, store]);
  }
  function useOpenStateTransitions(open, store, onUnmount) {
    const {
      mounted,
      setMounted,
      transitionStatus
    } = useTransitionStatus(open);
    store.useSyncedValues({
      mounted,
      transitionStatus
    });
    const forceUnmount = useStableCallback(() => {
      setMounted(false);
      store.update({
        activeTriggerId: null,
        activeTriggerElement: null,
        mounted: false
      });
      onUnmount?.();
      store.context.onOpenChangeComplete?.(false);
    });
    const preventUnmountingOnClose = store.useState("preventUnmountingOnClose");
    useOpenChangeComplete({
      enabled: !preventUnmountingOnClose,
      open,
      ref: store.context.popupRef,
      onComplete() {
        if (!open) {
          forceUnmount();
        }
      }
    });
    return {
      forceUnmount,
      transitionStatus
    };
  }

  // node_modules/@base-ui/react/esm/utils/popups/popupTriggerMap.js
  init_define_import_meta_env();
  var PopupTriggerMap = class {
    constructor() {
      this.elementsSet = /* @__PURE__ */ new Set();
      this.idMap = /* @__PURE__ */ new Map();
    }
    /**
     * Adds a trigger element with the given ID.
     *
     * Note: The provided element is assumed to not be registered under multiple IDs.
     */
    add(id, element) {
      const existingElement = this.idMap.get(id);
      if (existingElement === element) {
        return;
      }
      if (existingElement !== void 0) {
        this.elementsSet.delete(existingElement);
      }
      this.elementsSet.add(element);
      this.idMap.set(id, element);
      if (true) {
        if (this.elementsSet.size !== this.idMap.size) {
          throw new Error("Base UI: A trigger element cannot be registered under multiple IDs in PopupTriggerMap.");
        }
      }
    }
    /**
     * Removes the trigger element with the given ID.
     */
    delete(id) {
      const element = this.idMap.get(id);
      if (element) {
        this.elementsSet.delete(element);
        this.idMap.delete(id);
      }
    }
    /**
     * Whether the given element is registered as a trigger.
     */
    hasElement(element) {
      return this.elementsSet.has(element);
    }
    /**
     * Whether there is a registered trigger element matching the given predicate.
     */
    hasMatchingElement(predicate) {
      for (const element of this.elementsSet) {
        if (predicate(element)) {
          return true;
        }
      }
      return false;
    }
    /**
     * Returns the trigger element associated with the given ID, or undefined if no such element exists.
     */
    getById(id) {
      return this.idMap.get(id);
    }
    /**
     * Returns an iterable of all registered trigger entries, where each entry is a tuple of [id, element].
     */
    entries() {
      return this.idMap.entries();
    }
    /**
     * Returns an iterable of all registered trigger elements.
     */
    elements() {
      return this.elementsSet.values();
    }
    /**
     * Returns the number of registered trigger elements.
     */
    get size() {
      return this.idMap.size;
    }
  };

  // node_modules/@base-ui/react/esm/utils/popups/store.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/floating-ui-react/utils/getEmptyRootContext.js
  init_define_import_meta_env();
  function getEmptyRootContext() {
    return new FloatingRootStore({
      open: false,
      transitionStatus: void 0,
      floatingElement: null,
      referenceElement: null,
      triggerElements: new PopupTriggerMap(),
      floatingId: "",
      syncOnly: false,
      nested: false,
      onOpenChange: void 0
    });
  }

  // node_modules/@base-ui/react/esm/utils/popups/store.js
  function createInitialPopupStoreState() {
    return {
      open: false,
      openProp: void 0,
      mounted: false,
      transitionStatus: void 0,
      floatingRootContext: getEmptyRootContext(),
      preventUnmountingOnClose: false,
      payload: void 0,
      activeTriggerId: null,
      activeTriggerElement: null,
      triggerIdProp: void 0,
      popupElement: null,
      positionerElement: null,
      activeTriggerProps: EMPTY_OBJECT,
      inactiveTriggerProps: EMPTY_OBJECT,
      popupProps: EMPTY_OBJECT
    };
  }
  var activeTriggerIdSelector = createSelector((state) => state.triggerIdProp ?? state.activeTriggerId);
  var popupStoreSelectors = {
    open: createSelector((state) => state.openProp ?? state.open),
    mounted: createSelector((state) => state.mounted),
    transitionStatus: createSelector((state) => state.transitionStatus),
    floatingRootContext: createSelector((state) => state.floatingRootContext),
    preventUnmountingOnClose: createSelector((state) => state.preventUnmountingOnClose),
    payload: createSelector((state) => state.payload),
    activeTriggerId: activeTriggerIdSelector,
    activeTriggerElement: createSelector((state) => state.mounted ? state.activeTriggerElement : null),
    /**
     * Whether the trigger with the given ID was used to open the popup.
     */
    isTriggerActive: createSelector((state, triggerId) => triggerId !== void 0 && activeTriggerIdSelector(state) === triggerId),
    /**
     * Whether the popup is open and was activated by a trigger with the given ID.
     */
    isOpenedByTrigger: createSelector((state, triggerId) => triggerId !== void 0 && activeTriggerIdSelector(state) === triggerId && state.open),
    /**
     * Whether the popup is mounted and was activated by a trigger with the given ID.
     */
    isMountedByTrigger: createSelector((state, triggerId) => triggerId !== void 0 && activeTriggerIdSelector(state) === triggerId && state.mounted),
    triggerProps: createSelector((state, isActive) => isActive ? state.activeTriggerProps : state.inactiveTriggerProps),
    popupProps: createSelector((state) => state.popupProps),
    popupElement: createSelector((state) => state.popupElement),
    positionerElement: createSelector((state) => state.positionerElement)
  };

  // node_modules/@base-ui/react/esm/floating-ui-react/hooks/useSyncedFloatingRootContext.js
  init_define_import_meta_env();
  function useSyncedFloatingRootContext(options) {
    const {
      popupStore,
      treatPopupAsFloatingElement = false,
      onOpenChange
    } = options;
    const floatingId = useId();
    const nested = useFloatingParentNodeId() != null;
    const open = popupStore.useState("open");
    const referenceElement = popupStore.useState("activeTriggerElement");
    const floatingElement = popupStore.useState(treatPopupAsFloatingElement ? "popupElement" : "positionerElement");
    const triggerElements = popupStore.context.triggerElements;
    const store = useRefWithInit(() => new FloatingRootStore({
      open,
      transitionStatus: void 0,
      referenceElement,
      floatingElement,
      triggerElements,
      onOpenChange,
      floatingId,
      syncOnly: true,
      nested
    })).current;
    useIsoLayoutEffect(() => {
      const valuesToSync = {
        open,
        floatingId,
        referenceElement,
        floatingElement
      };
      if (isElement(referenceElement)) {
        valuesToSync.domReferenceElement = referenceElement;
      }
      if (store.state.positionReference === store.state.referenceElement) {
        valuesToSync.positionReference = referenceElement;
      }
      store.update(valuesToSync);
    }, [open, floatingId, referenceElement, floatingElement, store]);
    store.context.onOpenChange = onOpenChange;
    store.context.nested = nested;
    return store;
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/hooks/useInteractions.js
  init_define_import_meta_env();
  var React31 = __toESM(require_react_shim(), 1);
  function useInteractions(propsList = []) {
    const referenceDeps = propsList.map((key) => key?.reference);
    const floatingDeps = propsList.map((key) => key?.floating);
    const itemDeps = propsList.map((key) => key?.item);
    const triggerDeps = propsList.map((key) => key?.trigger);
    const getReferenceProps = React31.useCallback(
      (userProps) => mergeProps2(userProps, propsList, "reference"),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      referenceDeps
    );
    const getFloatingProps = React31.useCallback(
      (userProps) => mergeProps2(userProps, propsList, "floating"),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      floatingDeps
    );
    const getItemProps = React31.useCallback(
      (userProps) => mergeProps2(userProps, propsList, "item"),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      itemDeps
    );
    const getTriggerProps = React31.useCallback(
      (userProps) => mergeProps2(userProps, propsList, "trigger"),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      triggerDeps
    );
    return React31.useMemo(() => ({
      getReferenceProps,
      getFloatingProps,
      getItemProps,
      getTriggerProps
    }), [getReferenceProps, getFloatingProps, getItemProps, getTriggerProps]);
  }
  function mergeProps2(userProps, propsList, elementKey) {
    const eventHandlers = /* @__PURE__ */ new Map();
    const isItem = elementKey === "item";
    const outputProps = {};
    if (elementKey === "floating") {
      outputProps.tabIndex = -1;
      outputProps[FOCUSABLE_ATTRIBUTE] = "";
    }
    for (const key in userProps) {
      if (isItem && userProps) {
        if (key === ACTIVE_KEY || key === SELECTED_KEY) {
          continue;
        }
      }
      outputProps[key] = userProps[key];
    }
    for (let i = 0; i < propsList.length; i += 1) {
      let props;
      const propsOrGetProps = propsList[i]?.[elementKey];
      if (typeof propsOrGetProps === "function") {
        props = userProps ? propsOrGetProps(userProps) : null;
      } else {
        props = propsOrGetProps;
      }
      if (!props) {
        continue;
      }
      mutablyMergeProps(outputProps, props, isItem, eventHandlers);
    }
    mutablyMergeProps(outputProps, userProps, isItem, eventHandlers);
    return outputProps;
  }
  function mutablyMergeProps(outputProps, props, isItem, eventHandlers) {
    for (const key in props) {
      const value = props[key];
      if (isItem && (key === ACTIVE_KEY || key === SELECTED_KEY)) {
        continue;
      }
      if (!key.startsWith("on")) {
        outputProps[key] = value;
      } else {
        if (!eventHandlers.has(key)) {
          eventHandlers.set(key, []);
        }
        if (typeof value === "function") {
          eventHandlers.get(key)?.push(value);
          outputProps[key] = (...args) => {
            return eventHandlers.get(key)?.map((fn) => fn(...args)).find((val) => val !== void 0);
          };
        }
      }
    }
  }

  // node_modules/@base-ui/react/esm/floating-ui-react/hooks/useRole.js
  init_define_import_meta_env();
  var React32 = __toESM(require_react_shim(), 1);
  var componentRoleToAriaRoleMap = /* @__PURE__ */ new Map([["select", "listbox"], ["combobox", "listbox"], ["label", false]]);
  function useRole(context, props = {}) {
    const store = "rootStore" in context ? context.rootStore : context;
    const open = store.useState("open");
    const defaultFloatingId = store.useState("floatingId");
    const domReference = store.useState("domReferenceElement");
    const floatingElement = store.useState("floatingElement");
    const {
      role = "dialog"
    } = props;
    const defaultReferenceId = useId();
    const referenceId = domReference?.id || defaultReferenceId;
    const floatingId = React32.useMemo(() => getFloatingFocusElement(floatingElement)?.id || defaultFloatingId, [floatingElement, defaultFloatingId]);
    const ariaRole = componentRoleToAriaRoleMap.get(role) ?? role;
    const parentId = useFloatingParentNodeId();
    const isNested = parentId != null;
    const trigger = React32.useMemo(() => {
      if (ariaRole === "tooltip" || role === "label") {
        return EMPTY_OBJECT;
      }
      return {
        "aria-haspopup": ariaRole === "alertdialog" ? "dialog" : ariaRole,
        "aria-expanded": "false",
        ...ariaRole === "listbox" && {
          role: "combobox"
        },
        ...ariaRole === "menu" && isNested && {
          role: "menuitem"
        },
        ...role === "select" && {
          "aria-autocomplete": "none"
        },
        ...role === "combobox" && {
          "aria-autocomplete": "list"
        }
      };
    }, [ariaRole, isNested, role]);
    const reference = React32.useMemo(() => {
      if (ariaRole === "tooltip" || role === "label") {
        return {
          [`aria-${role === "label" ? "labelledby" : "describedby"}`]: open ? floatingId : void 0
        };
      }
      const triggerProps = trigger;
      return {
        ...triggerProps,
        "aria-expanded": open ? "true" : "false",
        "aria-controls": open ? floatingId : void 0,
        ...ariaRole === "menu" && {
          id: referenceId
        }
      };
    }, [ariaRole, floatingId, open, referenceId, role, trigger]);
    const floating = React32.useMemo(() => {
      const floatingProps = {
        id: floatingId,
        ...ariaRole && {
          role: ariaRole
        }
      };
      if (ariaRole === "tooltip" || role === "label") {
        return floatingProps;
      }
      return {
        ...floatingProps,
        ...ariaRole === "menu" && {
          "aria-labelledby": referenceId
        }
      };
    }, [ariaRole, floatingId, referenceId, role]);
    const item = React32.useCallback(({
      active,
      selected
    }) => {
      const commonProps = {
        role: "option",
        ...active && {
          id: `${floatingId}-fui-option`
        }
      };
      switch (role) {
        case "select":
        case "combobox":
          return {
            ...commonProps,
            "aria-selected": selected
          };
        default:
      }
      return {};
    }, [floatingId, role]);
    return React32.useMemo(() => ({
      reference,
      floating,
      item,
      trigger
    }), [reference, floating, trigger, item]);
  }

  // node_modules/@base-ui/react/esm/dialog/popup/DialogPopupCssVars.js
  init_define_import_meta_env();
  var DialogPopupCssVars = /* @__PURE__ */ (function(DialogPopupCssVars2) {
    DialogPopupCssVars2["nestedDialogs"] = "--nested-dialogs";
    return DialogPopupCssVars2;
  })({});

  // node_modules/@base-ui/react/esm/dialog/popup/DialogPopupDataAttributes.js
  init_define_import_meta_env();
  var DialogPopupDataAttributes = (function(DialogPopupDataAttributes2) {
    DialogPopupDataAttributes2[DialogPopupDataAttributes2["open"] = CommonPopupDataAttributes.open] = "open";
    DialogPopupDataAttributes2[DialogPopupDataAttributes2["closed"] = CommonPopupDataAttributes.closed] = "closed";
    DialogPopupDataAttributes2[DialogPopupDataAttributes2["startingStyle"] = CommonPopupDataAttributes.startingStyle] = "startingStyle";
    DialogPopupDataAttributes2[DialogPopupDataAttributes2["endingStyle"] = CommonPopupDataAttributes.endingStyle] = "endingStyle";
    DialogPopupDataAttributes2["nested"] = "data-nested";
    DialogPopupDataAttributes2["nestedDialogOpen"] = "data-nested-dialog-open";
    return DialogPopupDataAttributes2;
  })({});

  // node_modules/@base-ui/react/esm/dialog/portal/DialogPortalContext.js
  init_define_import_meta_env();
  var React33 = __toESM(require_react_shim(), 1);
  var DialogPortalContext = /* @__PURE__ */ React33.createContext(void 0);
  if (true) DialogPortalContext.displayName = "DialogPortalContext";
  function useDialogPortalContext() {
    const value = React33.useContext(DialogPortalContext);
    if (value === void 0) {
      throw new Error(true ? "Base UI: <Dialog.Portal> is missing." : formatErrorMessage_default(26));
    }
    return value;
  }

  // node_modules/@base-ui/react/esm/internals/composite/composite.js
  init_define_import_meta_env();
  var ARROW_UP = "ArrowUp";
  var ARROW_DOWN = "ArrowDown";
  var ARROW_LEFT = "ArrowLeft";
  var ARROW_RIGHT = "ArrowRight";
  var HOME = "Home";
  var END = "End";
  var HORIZONTAL_KEYS = /* @__PURE__ */ new Set([ARROW_LEFT, ARROW_RIGHT]);
  var VERTICAL_KEYS = /* @__PURE__ */ new Set([ARROW_UP, ARROW_DOWN]);
  var ARROW_KEYS = /* @__PURE__ */ new Set([...HORIZONTAL_KEYS, ...VERTICAL_KEYS]);
  var ALL_KEYS = /* @__PURE__ */ new Set([...ARROW_KEYS, HOME, END]);
  var COMPOSITE_KEYS = /* @__PURE__ */ new Set([ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, HOME, END]);

  // node_modules/@base-ui/react/esm/dialog/popup/DialogPopup.js
  var import_jsx_runtime8 = __toESM(require_react_shim(), 1);
  var stateAttributesMapping2 = {
    ...popupStateMapping,
    ...transitionStatusMapping,
    nestedDialogOpen(value) {
      return value ? {
        [DialogPopupDataAttributes.nestedDialogOpen]: ""
      } : null;
    }
  };
  var DialogPopup = /* @__PURE__ */ React34.forwardRef(function DialogPopup2(componentProps, forwardedRef) {
    const {
      className,
      finalFocus,
      initialFocus,
      render,
      style,
      ...elementProps
    } = componentProps;
    const {
      store
    } = useDialogRootContext();
    const descriptionElementId = store.useState("descriptionElementId");
    const disablePointerDismissal = store.useState("disablePointerDismissal");
    const floatingRootContext = store.useState("floatingRootContext");
    const rootPopupProps = store.useState("popupProps");
    const modal = store.useState("modal");
    const mounted = store.useState("mounted");
    const nested = store.useState("nested");
    const nestedOpenDialogCount = store.useState("nestedOpenDialogCount");
    const open = store.useState("open");
    const openMethod = store.useState("openMethod");
    const titleElementId = store.useState("titleElementId");
    const transitionStatus = store.useState("transitionStatus");
    const role = store.useState("role");
    useDialogPortalContext();
    useOpenChangeComplete({
      open,
      ref: store.context.popupRef,
      onComplete() {
        if (open) {
          store.context.onOpenChangeComplete?.(true);
        }
      }
    });
    function defaultInitialFocus(interactionType) {
      if (interactionType === "touch") {
        return store.context.popupRef.current;
      }
      return true;
    }
    const resolvedInitialFocus = initialFocus === void 0 ? defaultInitialFocus : initialFocus;
    const nestedDialogOpen = nestedOpenDialogCount > 0;
    const state = {
      open,
      nested,
      transitionStatus,
      nestedDialogOpen
    };
    const element = useRenderElement("div", componentProps, {
      state,
      props: [rootPopupProps, {
        "aria-labelledby": titleElementId ?? void 0,
        "aria-describedby": descriptionElementId ?? void 0,
        role,
        tabIndex: -1,
        hidden: !mounted,
        onKeyDown(event) {
          if (COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
        style: {
          [DialogPopupCssVars.nestedDialogs]: nestedOpenDialogCount
        }
      }, elementProps],
      ref: [forwardedRef, store.context.popupRef, store.useStateSetter("popupElement")],
      stateAttributesMapping: stateAttributesMapping2
    });
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(FloatingFocusManager, {
      context: floatingRootContext,
      openInteractionType: openMethod,
      disabled: !mounted,
      closeOnFocusOut: !disablePointerDismissal,
      initialFocus: resolvedInitialFocus,
      returnFocus: finalFocus,
      modal: modal !== false,
      restoreFocus: "popup",
      children: element
    });
  });
  if (true) DialogPopup.displayName = "DialogPopup";

  // node_modules/@base-ui/react/esm/dialog/portal/DialogPortal.js
  init_define_import_meta_env();
  var React36 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/inertValue.js
  init_define_import_meta_env();
  function inertValue(value) {
    if (isReactVersionAtLeast(19)) {
      return value;
    }
    return value ? "true" : void 0;
  }

  // node_modules/@base-ui/react/esm/utils/InternalBackdrop.js
  init_define_import_meta_env();
  var React35 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime9 = __toESM(require_react_shim(), 1);
  var InternalBackdrop = /* @__PURE__ */ React35.forwardRef(function InternalBackdrop2(props, ref) {
    const {
      cutout,
      ...otherProps
    } = props;
    let clipPath;
    if (cutout) {
      const rect = cutout.getBoundingClientRect();
      clipPath = `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", {
      ref,
      role: "presentation",
      "data-base-ui-inert": "",
      ...otherProps,
      style: {
        position: "fixed",
        inset: 0,
        userSelect: "none",
        WebkitUserSelect: "none",
        clipPath
      }
    });
  });
  if (true) InternalBackdrop.displayName = "InternalBackdrop";

  // node_modules/@base-ui/react/esm/dialog/portal/DialogPortal.js
  var import_jsx_runtime10 = __toESM(require_react_shim(), 1);
  var DialogPortal = /* @__PURE__ */ React36.forwardRef(function DialogPortal2(props, forwardedRef) {
    const {
      keepMounted = false,
      ...portalProps
    } = props;
    const {
      store
    } = useDialogRootContext();
    const mounted = store.useState("mounted");
    const modal = store.useState("modal");
    const open = store.useState("open");
    const shouldRender = mounted || keepMounted;
    if (!shouldRender) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DialogPortalContext.Provider, {
      value: keepMounted,
      children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(FloatingPortal, {
        ref: forwardedRef,
        ...portalProps,
        children: [mounted && modal === true && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(InternalBackdrop, {
          ref: store.context.internalBackdropRef,
          inert: inertValue(!open)
        }), props.children]
      })
    });
  });
  if (true) DialogPortal.displayName = "DialogPortal";

  // node_modules/@base-ui/react/esm/dialog/root/DialogRoot.js
  init_define_import_meta_env();
  var React43 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/useOnFirstRender.js
  init_define_import_meta_env();
  var React37 = __toESM(require_react_shim(), 1);
  function useOnFirstRender(fn) {
    const ref = React37.useRef(true);
    if (ref.current) {
      ref.current = false;
      fn();
    }
  }

  // node_modules/@base-ui/react/esm/dialog/root/useDialogRoot.js
  init_define_import_meta_env();
  var React41 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/useScrollLock.js
  init_define_import_meta_env();
  var originalHtmlStyles = {};
  var originalBodyStyles = {};
  var originalHtmlScrollBehavior = "";
  function hasInsetScrollbars(referenceElement) {
    if (typeof document === "undefined") {
      return false;
    }
    const doc = ownerDocument(referenceElement);
    const win = getWindow(doc);
    return win.innerWidth - doc.documentElement.clientWidth > 0;
  }
  function supportsStableScrollbarGutter(referenceElement) {
    const supported = typeof CSS !== "undefined" && CSS.supports && CSS.supports("scrollbar-gutter", "stable");
    if (!supported || typeof document === "undefined") {
      return false;
    }
    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;
    const scrollContainer = isOverflowElement(html) ? html : body;
    const originalScrollContainerOverflowY = scrollContainer.style.overflowY;
    const originalHtmlStyleGutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = "stable";
    scrollContainer.style.overflowY = "scroll";
    const before = scrollContainer.offsetWidth;
    scrollContainer.style.overflowY = "hidden";
    const after = scrollContainer.offsetWidth;
    scrollContainer.style.overflowY = originalScrollContainerOverflowY;
    html.style.scrollbarGutter = originalHtmlStyleGutter;
    return before === after;
  }
  function preventScrollOverlayScrollbars(referenceElement) {
    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;
    const elementToLock = isOverflowElement(html) ? html : body;
    const originalElementToLockStyles = {
      overflowY: elementToLock.style.overflowY,
      overflowX: elementToLock.style.overflowX
    };
    Object.assign(elementToLock.style, {
      overflowY: "hidden",
      overflowX: "hidden"
    });
    return () => {
      Object.assign(elementToLock.style, originalElementToLockStyles);
    };
  }
  function preventScrollInsetScrollbars(referenceElement) {
    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;
    const win = getWindow(html);
    let scrollTop = 0;
    let scrollLeft = 0;
    let updateGutterOnly = false;
    const resizeFrame = AnimationFrame.create();
    if (isWebKit2 && (win.visualViewport?.scale ?? 1) !== 1) {
      return () => {
      };
    }
    function lockScroll() {
      const htmlStyles = win.getComputedStyle(html);
      const bodyStyles = win.getComputedStyle(body);
      const htmlScrollbarGutterValue = htmlStyles.scrollbarGutter || "";
      const hasBothEdges = htmlScrollbarGutterValue.includes("both-edges");
      const scrollbarGutterValue = hasBothEdges ? "stable both-edges" : "stable";
      scrollTop = html.scrollTop;
      scrollLeft = html.scrollLeft;
      originalHtmlStyles = {
        scrollbarGutter: html.style.scrollbarGutter,
        overflowY: html.style.overflowY,
        overflowX: html.style.overflowX
      };
      originalHtmlScrollBehavior = html.style.scrollBehavior;
      originalBodyStyles = {
        position: body.style.position,
        height: body.style.height,
        width: body.style.width,
        boxSizing: body.style.boxSizing,
        overflowY: body.style.overflowY,
        overflowX: body.style.overflowX,
        scrollBehavior: body.style.scrollBehavior
      };
      const isScrollableY = html.scrollHeight > html.clientHeight;
      const isScrollableX = html.scrollWidth > html.clientWidth;
      const hasConstantOverflowY = htmlStyles.overflowY === "scroll" || bodyStyles.overflowY === "scroll";
      const hasConstantOverflowX = htmlStyles.overflowX === "scroll" || bodyStyles.overflowX === "scroll";
      const scrollbarWidth = Math.max(0, win.innerWidth - body.clientWidth);
      const scrollbarHeight = Math.max(0, win.innerHeight - body.clientHeight);
      const marginY = parseFloat(bodyStyles.marginTop) + parseFloat(bodyStyles.marginBottom);
      const marginX = parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight);
      const elementToLock = isOverflowElement(html) ? html : body;
      updateGutterOnly = supportsStableScrollbarGutter(referenceElement);
      if (updateGutterOnly) {
        html.style.scrollbarGutter = scrollbarGutterValue;
        elementToLock.style.overflowY = "hidden";
        elementToLock.style.overflowX = "hidden";
        return;
      }
      Object.assign(html.style, {
        scrollbarGutter: scrollbarGutterValue,
        overflowY: "hidden",
        overflowX: "hidden"
      });
      if (isScrollableY || hasConstantOverflowY) {
        html.style.overflowY = "scroll";
      }
      if (isScrollableX || hasConstantOverflowX) {
        html.style.overflowX = "scroll";
      }
      Object.assign(body.style, {
        position: "relative",
        height: marginY || scrollbarHeight ? `calc(100dvh - ${marginY + scrollbarHeight}px)` : "100dvh",
        width: marginX || scrollbarWidth ? `calc(100vw - ${marginX + scrollbarWidth}px)` : "100vw",
        boxSizing: "border-box",
        overflow: "hidden",
        scrollBehavior: "unset"
      });
      body.scrollTop = scrollTop;
      body.scrollLeft = scrollLeft;
      html.setAttribute("data-base-ui-scroll-locked", "");
      html.style.scrollBehavior = "unset";
    }
    function cleanup() {
      Object.assign(html.style, originalHtmlStyles);
      Object.assign(body.style, originalBodyStyles);
      if (!updateGutterOnly) {
        html.scrollTop = scrollTop;
        html.scrollLeft = scrollLeft;
        html.removeAttribute("data-base-ui-scroll-locked");
        html.style.scrollBehavior = originalHtmlScrollBehavior;
      }
    }
    function handleResize() {
      cleanup();
      resizeFrame.request(lockScroll);
    }
    lockScroll();
    const unsubscribeResize = addEventListener(win, "resize", handleResize);
    return () => {
      resizeFrame.cancel();
      cleanup();
      if (typeof win.removeEventListener === "function") {
        unsubscribeResize();
      }
    };
  }
  var ScrollLocker = class {
    constructor() {
      __publicField(this, "lockCount", 0);
      __publicField(this, "restore", null);
      __publicField(this, "timeoutLock", Timeout.create());
      __publicField(this, "timeoutUnlock", Timeout.create());
      __publicField(this, "release", () => {
        this.lockCount -= 1;
        if (this.lockCount === 0 && this.restore) {
          this.timeoutUnlock.start(0, this.unlock);
        }
      });
      __publicField(this, "unlock", () => {
        if (this.lockCount === 0 && this.restore) {
          this.restore?.();
          this.restore = null;
        }
      });
    }
    acquire(referenceElement) {
      this.lockCount += 1;
      if (this.lockCount === 1 && this.restore === null) {
        this.timeoutLock.start(0, () => this.lock(referenceElement));
      }
      return this.release;
    }
    lock(referenceElement) {
      if (this.lockCount === 0 || this.restore !== null) {
        return;
      }
      const doc = ownerDocument(referenceElement);
      const html = doc.documentElement;
      const htmlOverflowY = getWindow(html).getComputedStyle(html).overflowY;
      if (htmlOverflowY === "hidden" || htmlOverflowY === "clip") {
        this.restore = NOOP;
        return;
      }
      const hasOverlayScrollbars = isIOS || !hasInsetScrollbars(referenceElement);
      this.restore = hasOverlayScrollbars ? preventScrollOverlayScrollbars(referenceElement) : preventScrollInsetScrollbars(referenceElement);
    }
  };
  var SCROLL_LOCKER = new ScrollLocker();
  function useScrollLock(enabled = true, referenceElement = null) {
    useIsoLayoutEffect(() => {
      if (!enabled) {
        return void 0;
      }
      return SCROLL_LOCKER.acquire(referenceElement);
    }, [enabled, referenceElement]);
  }

  // node_modules/@base-ui/react/esm/utils/useOpenInteractionType.js
  init_define_import_meta_env();
  var React40 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/useEnhancedClickHandler.js
  init_define_import_meta_env();
  var React38 = __toESM(require_react_shim(), 1);
  function useEnhancedClickHandler(handler) {
    const lastClickInteractionTypeRef = React38.useRef("");
    const handlePointerDown = React38.useCallback((event) => {
      if (event.defaultPrevented) {
        return;
      }
      lastClickInteractionTypeRef.current = event.pointerType;
      handler(event, event.pointerType);
    }, [handler]);
    const handleClick = React38.useCallback((event) => {
      if (event.detail === 0) {
        handler(event, "keyboard");
        return;
      }
      if ("pointerType" in event) {
        handler(event, event.pointerType);
      } else {
        handler(event, lastClickInteractionTypeRef.current);
      }
      lastClickInteractionTypeRef.current = "";
    }, [handler]);
    return {
      onClick: handleClick,
      onPointerDown: handlePointerDown
    };
  }

  // node_modules/@base-ui/react/esm/internals/useValueChanged.js
  init_define_import_meta_env();
  var React39 = __toESM(require_react_shim(), 1);
  function useValueChanged(value, onChange) {
    const valueRef = React39.useRef(value);
    const onChangeCallback = useStableCallback(onChange);
    useIsoLayoutEffect(() => {
      if (valueRef.current === value) {
        return;
      }
      onChangeCallback(valueRef.current);
    }, [value, onChangeCallback]);
    useIsoLayoutEffect(() => {
      valueRef.current = value;
    }, [value]);
  }

  // node_modules/@base-ui/react/esm/utils/useOpenInteractionType.js
  function useOpenInteractionType(open) {
    const [openMethod, setOpenMethod] = React40.useState(null);
    const handleTriggerClick = useStableCallback((_, interactionType) => {
      if (!open) {
        setOpenMethod(interactionType || // On iOS Safari, the hitslop around touch targets means tapping outside an element's
        // bounds does not fire `pointerdown` but does fire `mousedown`. The `interactionType`
        // will be "" in that case.
        (isIOS ? "touch" : ""));
      }
    });
    useValueChanged(open, (previousOpen) => {
      if (previousOpen && !open) {
        setOpenMethod(null);
      }
    });
    const {
      onClick,
      onPointerDown
    } = useEnhancedClickHandler(handleTriggerClick);
    return React40.useMemo(() => ({
      openMethod,
      triggerProps: {
        onClick,
        onPointerDown
      }
    }), [openMethod, onClick, onPointerDown]);
  }

  // node_modules/@base-ui/react/esm/dialog/root/useDialogRoot.js
  function useDialogRoot(params) {
    const {
      store,
      parentContext,
      actionsRef,
      isDrawer
    } = params;
    const open = store.useState("open");
    const disablePointerDismissal = store.useState("disablePointerDismissal");
    const modal = store.useState("modal");
    const popupElement = store.useState("popupElement");
    const {
      openMethod,
      triggerProps
    } = useOpenInteractionType(open);
    useImplicitActiveTrigger(store);
    const {
      forceUnmount
    } = useOpenStateTransitions(open, store);
    const handleImperativeClose = React41.useCallback(() => {
      store.setOpen(false, createChangeEventDetails(reason_parts_exports.imperativeAction));
    }, [store]);
    React41.useImperativeHandle(actionsRef, () => ({
      unmount: forceUnmount,
      close: handleImperativeClose
    }), [forceUnmount, handleImperativeClose]);
    const floatingRootContext = useSyncedFloatingRootContext({
      popupStore: store,
      onOpenChange: store.setOpen,
      treatPopupAsFloatingElement: true
    });
    const [ownNestedOpenDialogs, setOwnNestedOpenDialogs] = React41.useState(0);
    const [ownNestedOpenDrawers, setOwnNestedOpenDrawers] = React41.useState(0);
    const isTopmost = ownNestedOpenDialogs === 0;
    const role = useRole(floatingRootContext);
    const dismiss = useDismiss(floatingRootContext, {
      outsidePressEvent() {
        if (store.context.internalBackdropRef.current || store.context.backdropRef.current) {
          return "intentional";
        }
        return {
          mouse: modal === "trap-focus" ? "sloppy" : "intentional",
          touch: "sloppy"
        };
      },
      outsidePress(event) {
        if (!store.context.outsidePressEnabledRef.current) {
          return false;
        }
        if ("button" in event && event.button !== 0) {
          return false;
        }
        if ("touches" in event && event.touches.length !== 1) {
          return false;
        }
        const target = getTarget(event);
        if (isTopmost && !disablePointerDismissal) {
          const eventTarget = target;
          if (modal) {
            return store.context.internalBackdropRef.current || store.context.backdropRef.current ? store.context.internalBackdropRef.current === eventTarget || store.context.backdropRef.current === eventTarget || contains(eventTarget, popupElement) && !eventTarget?.hasAttribute("data-base-ui-portal") : true;
          }
          return true;
        }
        return false;
      },
      escapeKey: isTopmost
    });
    useScrollLock(open && modal === true, popupElement);
    const {
      getReferenceProps,
      getFloatingProps,
      getTriggerProps
    } = useInteractions([role, dismiss]);
    store.useContextCallback("onNestedDialogOpen", (dialogCount, drawerCount) => {
      setOwnNestedOpenDialogs(dialogCount);
      setOwnNestedOpenDrawers(drawerCount);
    });
    store.useContextCallback("onNestedDialogClose", () => {
      setOwnNestedOpenDialogs(0);
      setOwnNestedOpenDrawers(0);
    });
    React41.useEffect(() => {
      if (parentContext?.onNestedDialogOpen && open) {
        parentContext.onNestedDialogOpen(ownNestedOpenDialogs + 1, ownNestedOpenDrawers + (isDrawer ? 1 : 0));
      }
      if (parentContext?.onNestedDialogClose && !open) {
        parentContext.onNestedDialogClose();
      }
      return () => {
        if (parentContext?.onNestedDialogClose && open) {
          parentContext.onNestedDialogClose();
        }
      };
    }, [isDrawer, open, ownNestedOpenDialogs, ownNestedOpenDrawers, parentContext]);
    const activeTriggerProps = React41.useMemo(() => getReferenceProps(triggerProps), [getReferenceProps, triggerProps]);
    const inactiveTriggerProps = React41.useMemo(() => getTriggerProps(triggerProps), [getTriggerProps, triggerProps]);
    const popupProps = React41.useMemo(() => getFloatingProps(), [getFloatingProps]);
    store.useSyncedValues({
      openMethod,
      activeTriggerProps,
      inactiveTriggerProps,
      popupProps,
      floatingRootContext,
      nestedOpenDialogCount: ownNestedOpenDialogs,
      nestedOpenDrawerCount: ownNestedOpenDrawers
    });
  }

  // node_modules/@base-ui/react/esm/dialog/store/DialogStore.js
  init_define_import_meta_env();
  var React42 = __toESM(require_react_shim(), 1);
  var selectors2 = {
    ...popupStoreSelectors,
    modal: createSelector((state) => state.modal),
    nested: createSelector((state) => state.nested),
    nestedOpenDialogCount: createSelector((state) => state.nestedOpenDialogCount),
    nestedOpenDrawerCount: createSelector((state) => state.nestedOpenDrawerCount),
    disablePointerDismissal: createSelector((state) => state.disablePointerDismissal),
    openMethod: createSelector((state) => state.openMethod),
    descriptionElementId: createSelector((state) => state.descriptionElementId),
    titleElementId: createSelector((state) => state.titleElementId),
    viewportElement: createSelector((state) => state.viewportElement),
    role: createSelector((state) => state.role)
  };
  var DialogStore = class _DialogStore extends ReactStore {
    constructor(initialState) {
      super(createInitialState(initialState), {
        popupRef: /* @__PURE__ */ React42.createRef(),
        backdropRef: /* @__PURE__ */ React42.createRef(),
        internalBackdropRef: /* @__PURE__ */ React42.createRef(),
        outsidePressEnabledRef: {
          current: true
        },
        triggerElements: new PopupTriggerMap(),
        onOpenChange: void 0,
        onOpenChangeComplete: void 0
      }, selectors2);
      __publicField(this, "setOpen", (nextOpen, eventDetails) => {
        eventDetails.preventUnmountOnClose = () => {
          this.set("preventUnmountingOnClose", true);
        };
        if (!nextOpen && eventDetails.trigger == null && this.state.activeTriggerId != null) {
          eventDetails.trigger = this.state.activeTriggerElement ?? void 0;
        }
        this.context.onOpenChange?.(nextOpen, eventDetails);
        if (eventDetails.isCanceled) {
          return;
        }
        this.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);
        const updatedState = {
          open: nextOpen
        };
        const newTriggerId = eventDetails.trigger?.id ?? null;
        if (newTriggerId || nextOpen) {
          updatedState.activeTriggerId = newTriggerId;
          updatedState.activeTriggerElement = eventDetails.trigger ?? null;
        }
        this.update(updatedState);
      });
    }
    static useStore(externalStore, initialState) {
      const internalStore = useRefWithInit(() => {
        return new _DialogStore(initialState);
      }).current;
      return externalStore ?? internalStore;
    }
  };
  function createInitialState(initialState = {}) {
    return {
      ...createInitialPopupStoreState(),
      modal: true,
      disablePointerDismissal: false,
      popupElement: null,
      viewportElement: null,
      descriptionElementId: void 0,
      titleElementId: void 0,
      openMethod: null,
      nested: false,
      nestedOpenDialogCount: 0,
      nestedOpenDrawerCount: 0,
      role: "dialog",
      ...initialState
    };
  }

  // node_modules/@base-ui/react/esm/dialog/root/DialogRoot.js
  var import_jsx_runtime11 = __toESM(require_react_shim(), 1);
  var IsDrawerContext = /* @__PURE__ */ React43.createContext(false);
  if (true) IsDrawerContext.displayName = "IsDrawerContext";
  function DialogRoot(props) {
    const {
      children,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onOpenChangeComplete,
      disablePointerDismissal = false,
      modal = true,
      actionsRef,
      handle,
      triggerId: triggerIdProp,
      defaultTriggerId: defaultTriggerIdProp = null
    } = props;
    const parentDialogRootContext = useDialogRootContext(true);
    const isDrawer = React43.useContext(IsDrawerContext);
    const nested = Boolean(parentDialogRootContext);
    const store = DialogStore.useStore(handle?.store, {
      open: defaultOpen,
      openProp,
      activeTriggerId: defaultTriggerIdProp,
      triggerIdProp,
      modal,
      disablePointerDismissal,
      nested
    });
    useOnFirstRender(() => {
      if (openProp === void 0 && store.state.open === false && defaultOpen === true) {
        store.update({
          open: true,
          activeTriggerId: defaultTriggerIdProp
        });
      }
    });
    store.useControlledProp("openProp", openProp);
    store.useControlledProp("triggerIdProp", triggerIdProp);
    store.useSyncedValues({
      disablePointerDismissal,
      nested,
      modal
    });
    store.useContextCallback("onOpenChange", onOpenChange);
    store.useContextCallback("onOpenChangeComplete", onOpenChangeComplete);
    const payload = store.useState("payload");
    useDialogRoot({
      store,
      actionsRef,
      parentContext: parentDialogRootContext?.store.context,
      isDrawer,
      onOpenChange,
      triggerIdProp
    });
    const contextValue = React43.useMemo(() => ({
      store
    }), [store]);
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(IsDrawerContext.Provider, {
      value: false,
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DialogRootContext.Provider, {
        value: contextValue,
        children: typeof children === "function" ? children({
          payload
        }) : children
      })
    });
  }

  // node_modules/@base-ui/react/esm/dialog/viewport/DialogViewport.js
  init_define_import_meta_env();
  var React44 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/dialog/viewport/DialogViewportDataAttributes.js
  init_define_import_meta_env();
  var DialogViewportDataAttributes = (function(DialogViewportDataAttributes2) {
    DialogViewportDataAttributes2[DialogViewportDataAttributes2["open"] = CommonPopupDataAttributes.open] = "open";
    DialogViewportDataAttributes2[DialogViewportDataAttributes2["closed"] = CommonPopupDataAttributes.closed] = "closed";
    DialogViewportDataAttributes2[DialogViewportDataAttributes2["startingStyle"] = CommonPopupDataAttributes.startingStyle] = "startingStyle";
    DialogViewportDataAttributes2[DialogViewportDataAttributes2["endingStyle"] = CommonPopupDataAttributes.endingStyle] = "endingStyle";
    DialogViewportDataAttributes2["nested"] = "data-nested";
    DialogViewportDataAttributes2["nestedDialogOpen"] = "data-nested-dialog-open";
    return DialogViewportDataAttributes2;
  })({});

  // node_modules/@base-ui/react/esm/dialog/viewport/DialogViewport.js
  var stateAttributesMapping3 = {
    ...popupStateMapping,
    ...transitionStatusMapping,
    nested(value) {
      return value ? {
        [DialogViewportDataAttributes.nested]: ""
      } : null;
    },
    nestedDialogOpen(value) {
      return value ? {
        [DialogViewportDataAttributes.nestedDialogOpen]: ""
      } : null;
    }
  };
  var DialogViewport = /* @__PURE__ */ React44.forwardRef(function DialogViewport2(componentProps, forwardedRef) {
    const {
      className,
      render,
      children,
      style,
      ...elementProps
    } = componentProps;
    const keepMounted = useDialogPortalContext();
    const {
      store
    } = useDialogRootContext();
    const open = store.useState("open");
    const nested = store.useState("nested");
    const transitionStatus = store.useState("transitionStatus");
    const nestedOpenDialogCount = store.useState("nestedOpenDialogCount");
    const mounted = store.useState("mounted");
    const nestedDialogOpen = nestedOpenDialogCount > 0;
    const state = {
      open,
      nested,
      transitionStatus,
      nestedDialogOpen
    };
    const shouldRender = keepMounted || mounted;
    return useRenderElement("div", componentProps, {
      enabled: shouldRender,
      state,
      ref: [forwardedRef, store.useStateSetter("viewportElement")],
      stateAttributesMapping: stateAttributesMapping3,
      props: [{
        role: "presentation",
        hidden: !mounted,
        style: {
          pointerEvents: !open ? "none" : void 0
        },
        children
      }, elementProps]
    });
  });
  if (true) DialogViewport.displayName = "DialogViewport";

  // node_modules/@base-ui/react/esm/dialog/title/DialogTitle.js
  init_define_import_meta_env();
  var React45 = __toESM(require_react_shim(), 1);
  var DialogTitle = /* @__PURE__ */ React45.forwardRef(function DialogTitle2(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      id: idProp,
      ...elementProps
    } = componentProps;
    const {
      store
    } = useDialogRootContext();
    const id = useBaseUiId(idProp);
    store.useSyncedValueWithCleanup("titleElementId", id);
    return useRenderElement("h2", componentProps, {
      ref: forwardedRef,
      props: [{
        id
      }, elementProps]
    });
  });
  if (true) DialogTitle.displayName = "DialogTitle";

  // node_modules/@base-ui/react/esm/dialog/trigger/DialogTrigger.js
  init_define_import_meta_env();
  var React46 = __toESM(require_react_shim(), 1);
  var DialogTrigger = /* @__PURE__ */ React46.forwardRef(function DialogTrigger2(componentProps, forwardedRef) {
    const {
      render,
      className,
      disabled: disabled2 = false,
      nativeButton = true,
      id: idProp,
      payload,
      handle,
      style,
      ...elementProps
    } = componentProps;
    const dialogRootContext = useDialogRootContext(true);
    const store = handle?.store ?? dialogRootContext?.store;
    if (!store) {
      throw new Error(true ? "Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle." : formatErrorMessage_default(79));
    }
    const thisTriggerId = useBaseUiId(idProp);
    const floatingContext = store.useState("floatingRootContext");
    const isOpenedByThisTrigger = store.useState("isOpenedByTrigger", thisTriggerId);
    const triggerElementRef = React46.useRef(null);
    const {
      registerTrigger,
      isMountedByThisTrigger
    } = useTriggerDataForwarding(thisTriggerId, triggerElementRef, store, {
      payload
    });
    const {
      getButtonProps,
      buttonRef
    } = useButton({
      disabled: disabled2,
      native: nativeButton
    });
    const click = useClick(floatingContext, {
      enabled: floatingContext != null
    });
    const localInteractionProps = useInteractions([click]);
    const state = {
      disabled: disabled2,
      open: isOpenedByThisTrigger
    };
    const rootTriggerProps = store.useState("triggerProps", isMountedByThisTrigger);
    return useRenderElement("button", componentProps, {
      state,
      ref: [buttonRef, forwardedRef, registerTrigger, triggerElementRef],
      props: [localInteractionProps.getReferenceProps(), rootTriggerProps, {
        [CLICK_TRIGGER_IDENTIFIER]: "",
        id: thisTriggerId
      }, elementProps, getButtonProps],
      stateAttributesMapping: triggerOpenStateMapping
    });
  });
  if (true) DialogTrigger.displayName = "DialogTrigger";

  // node_modules/@base-ui/react/esm/dialog/store/DialogHandle.js
  init_define_import_meta_env();
  var DialogHandle = class {
    /**
     * Internal store holding the dialog state.
     * @internal
     */
    constructor(store) {
      this.store = store ?? new DialogStore();
    }
    /**
     * Opens the dialog and associates it with the trigger with the given id.
     * The trigger, if provided, must be a Dialog.Trigger component with this handle passed as a prop.
     *
     * This method should only be called in an event handler or an effect (not during rendering).
     *
     * @param triggerId ID of the trigger to associate with the dialog. If null, the dialog will open without a trigger association.
     */
    open(triggerId) {
      const triggerElement = triggerId ? this.store.context.triggerElements.getById(triggerId) : void 0;
      if (true) {
        if (triggerId && !triggerElement) {
          console.warn(`Base UI: DialogHandle.open: No trigger found with id "${triggerId}". The dialog will open, but the trigger will not be associated with the dialog.`);
        }
      }
      this.store.setOpen(true, createChangeEventDetails(reason_parts_exports.imperativeAction, void 0, triggerElement));
    }
    /**
     * Opens the dialog and sets the payload.
     * Does not associate the dialog with any trigger.
     *
     * @param payload Payload to set when opening the dialog.
     */
    openWithPayload(payload) {
      this.store.set("payload", payload);
      this.store.setOpen(true, createChangeEventDetails(reason_parts_exports.imperativeAction, void 0, void 0));
    }
    /**
     * Closes the dialog.
     */
    close() {
      this.store.setOpen(false, createChangeEventDetails(reason_parts_exports.imperativeAction, void 0, void 0));
    }
    /**
     * Indicates whether the dialog is currently open.
     */
    get isOpen() {
      return this.store.state.open;
    }
  };
  function createDialogHandle() {
    return new DialogHandle();
  }

  // src/components/ui/dialog.tsx
  var import_jsx_runtime12 = __toESM(require_react_shim());
  function Dialog({ ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(index_parts_exports.Root, { "data-slot": "dialog", ...props });
  }
  function DialogTrigger3({ ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(index_parts_exports.Trigger, { "data-slot": "dialog-trigger", ...props });
  }
  function DialogPortal3({ ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(index_parts_exports.Portal, { "data-slot": "dialog-portal", ...props });
  }
  function DialogClose3({ ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(index_parts_exports.Close, { "data-slot": "dialog-close", ...props });
  }
  function DialogOverlay({
    className,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      index_parts_exports.Backdrop,
      {
        "data-slot": "dialog-overlay",
        className: cn(
          "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        ),
        ...props
      }
    );
  }
  function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(DialogPortal3, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(DialogOverlay, {}),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        index_parts_exports.Popup,
        {
          "data-slot": "dialog-content",
          className: cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          ),
          ...props,
          children: [
            children,
            showCloseButton && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
              index_parts_exports.Close,
              {
                "data-slot": "dialog-close",
                render: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  Button3,
                  {
                    variant: "ghost",
                    className: "absolute top-2 right-2",
                    size: "icon-sm"
                  }
                ),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                    X,
                    {}
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "sr-only", children: "Close" })
                ]
              }
            )
          ]
        }
      )
    ] });
  }
  function DialogHeader({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      "div",
      {
        "data-slot": "dialog-header",
        className: cn("flex flex-col gap-2", className),
        ...props
      }
    );
  }
  function DialogFooter({
    className,
    showCloseButton = false,
    children,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
      "div",
      {
        "data-slot": "dialog-footer",
        className: cn(
          "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
          className
        ),
        ...props,
        children: [
          children,
          showCloseButton && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(index_parts_exports.Close, { render: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Button3, { variant: "outline" }), children: "Close" })
        ]
      }
    );
  }
  function DialogTitle3({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      index_parts_exports.Title,
      {
        "data-slot": "dialog-title",
        className: cn(
          "font-heading text-base leading-none font-medium",
          className
        ),
        ...props
      }
    );
  }
  function DialogDescription3({
    className,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      index_parts_exports.Description,
      {
        "data-slot": "dialog-description",
        className: cn(
          "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
          className
        ),
        ...props
      }
    );
  }

  // src/components/ui/field.tsx
  init_define_import_meta_env();
  var import_react5 = __toESM(require_react_shim());

  // src/components/ui/label.tsx
  init_define_import_meta_env();
  var import_jsx_runtime13 = __toESM(require_react_shim());
  function Label({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "label",
      {
        "data-slot": "label",
        className: cn(
          "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className
        ),
        ...props
      }
    );
  }

  // src/components/ui/separator.tsx
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/separator/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/separator/Separator.js
  init_define_import_meta_env();
  var React47 = __toESM(require_react_shim(), 1);
  var Separator = /* @__PURE__ */ React47.forwardRef(function SeparatorComponent(componentProps, forwardedRef) {
    const {
      className,
      render,
      orientation = "horizontal",
      style,
      ...elementProps
    } = componentProps;
    const state = {
      orientation
    };
    const element = useRenderElement("div", componentProps, {
      state,
      ref: forwardedRef,
      props: [{
        role: "separator",
        "aria-orientation": orientation
      }, elementProps]
    });
    return element;
  });
  if (true) Separator.displayName = "Separator";

  // src/components/ui/separator.tsx
  var import_jsx_runtime14 = __toESM(require_react_shim());
  function Separator2({
    className,
    orientation = "horizontal",
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      Separator,
      {
        "data-slot": "separator",
        orientation,
        className: cn(
          "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
          className
        ),
        ...props
      }
    );
  }

  // src/components/ui/field.tsx
  var import_jsx_runtime15 = __toESM(require_react_shim());
  function FieldSet({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "fieldset",
      {
        "data-slot": "field-set",
        className: cn(
          "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
          className
        ),
        ...props
      }
    );
  }
  function FieldLegend({
    className,
    variant = "legend",
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "legend",
      {
        "data-slot": "field-legend",
        "data-variant": variant,
        className: cn(
          "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
          className
        ),
        ...props
      }
    );
  }
  function FieldGroup({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "div",
      {
        "data-slot": "field-group",
        className: cn(
          "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
          className
        ),
        ...props
      }
    );
  }
  var fieldVariants = cva(
    "group/field flex w-full gap-2 data-[invalid=true]:text-destructive",
    {
      variants: {
        orientation: {
          vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
          horizontal: "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
          responsive: "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
        }
      },
      defaultVariants: {
        orientation: "vertical"
      }
    }
  );
  function Field({
    className,
    orientation = "vertical",
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "div",
      {
        role: "group",
        "data-slot": "field",
        "data-orientation": orientation,
        className: cn(fieldVariants({ orientation }), className),
        ...props
      }
    );
  }
  function FieldContent({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "div",
      {
        "data-slot": "field-content",
        className: cn(
          "group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
          className
        ),
        ...props
      }
    );
  }
  function FieldLabel({
    className,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      Label,
      {
        "data-slot": "field-label",
        className: cn(
          "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
          "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
          className
        ),
        ...props
      }
    );
  }
  function FieldTitle({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "div",
      {
        "data-slot": "field-label",
        className: cn(
          "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
          className
        ),
        ...props
      }
    );
  }
  function FieldDescription({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "p",
      {
        "data-slot": "field-description",
        className: cn(
          "text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
          "last:mt-0 nth-last-2:-mt-1",
          "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
          className
        ),
        ...props
      }
    );
  }
  function FieldSeparator({
    children,
    className,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
      "div",
      {
        "data-slot": "field-separator",
        "data-content": !!children,
        className: cn(
          "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
          className
        ),
        ...props,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Separator2, { className: "absolute inset-0 top-1/2" }),
          children && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            "span",
            {
              className: "relative mx-auto block w-fit bg-background px-2 text-muted-foreground",
              "data-slot": "field-separator-content",
              children
            }
          )
        ]
      }
    );
  }
  function FieldError({
    className,
    children,
    errors,
    ...props
  }) {
    const content = (0, import_react5.useMemo)(() => {
      if (children) {
        return children;
      }
      if (!errors?.length) {
        return null;
      }
      const uniqueErrors = [
        ...new Map(errors.map((error2) => [error2?.message, error2])).values()
      ];
      if (uniqueErrors?.length == 1) {
        return uniqueErrors[0]?.message;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("ul", { className: "ml-4 flex list-disc flex-col gap-1", children: uniqueErrors.map(
        (error2, index) => error2?.message && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("li", { children: error2.message }, index)
      ) });
    }, [children, errors]);
    if (!content) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      "div",
      {
        role: "alert",
        "data-slot": "field-error",
        className: cn("text-sm font-normal text-destructive", className),
        ...props,
        children: content
      }
    );
  }

  // src/components/ui/input.tsx
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/input/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/input/Input.js
  init_define_import_meta_env();
  var React67 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/field/index.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/field/index.parts.js
  var index_parts_exports2 = {};
  __export(index_parts_exports2, {
    Control: () => FieldControl,
    Description: () => FieldDescription2,
    Error: () => FieldError2,
    Item: () => FieldItem,
    Label: () => FieldLabel2,
    Root: () => FieldRoot,
    Validity: () => FieldValidity
  });
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/field/root/FieldRoot.js
  init_define_import_meta_env();
  var React56 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/field-root-context/FieldRootContext.js
  init_define_import_meta_env();
  var React48 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/noop.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/internals/field-constants/constants.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/field/control/FieldControlDataAttributes.js
  init_define_import_meta_env();
  var FieldControlDataAttributes = /* @__PURE__ */ (function(FieldControlDataAttributes2) {
    FieldControlDataAttributes2["disabled"] = "data-disabled";
    FieldControlDataAttributes2["valid"] = "data-valid";
    FieldControlDataAttributes2["invalid"] = "data-invalid";
    FieldControlDataAttributes2["touched"] = "data-touched";
    FieldControlDataAttributes2["dirty"] = "data-dirty";
    FieldControlDataAttributes2["filled"] = "data-filled";
    FieldControlDataAttributes2["focused"] = "data-focused";
    return FieldControlDataAttributes2;
  })({});

  // node_modules/@base-ui/react/esm/internals/field-constants/constants.js
  var DEFAULT_VALIDITY_STATE = {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: null,
    valueMissing: false
  };
  var DEFAULT_FIELD_STATE_ATTRIBUTES = {
    valid: null,
    touched: false,
    dirty: false,
    filled: false,
    focused: false
  };
  var DEFAULT_FIELD_ROOT_STATE = {
    disabled: false,
    ...DEFAULT_FIELD_STATE_ATTRIBUTES
  };
  var fieldValidityMapping = {
    valid(value) {
      if (value === null) {
        return null;
      }
      if (value) {
        return {
          [FieldControlDataAttributes.valid]: ""
        };
      }
      return {
        [FieldControlDataAttributes.invalid]: ""
      };
    }
  };

  // node_modules/@base-ui/react/esm/internals/field-root-context/FieldRootContext.js
  var FieldRootContext = /* @__PURE__ */ React48.createContext({
    invalid: void 0,
    name: void 0,
    validityData: {
      state: DEFAULT_VALIDITY_STATE,
      errors: [],
      error: "",
      value: "",
      initialValue: null
    },
    setValidityData: NOOP,
    disabled: void 0,
    touched: DEFAULT_FIELD_STATE_ATTRIBUTES.touched,
    setTouched: NOOP,
    dirty: DEFAULT_FIELD_STATE_ATTRIBUTES.dirty,
    setDirty: NOOP,
    filled: DEFAULT_FIELD_STATE_ATTRIBUTES.filled,
    setFilled: NOOP,
    focused: DEFAULT_FIELD_STATE_ATTRIBUTES.focused,
    setFocused: NOOP,
    validate: () => null,
    validationMode: "onSubmit",
    validationDebounceTime: 0,
    shouldValidateOnChange: () => false,
    state: DEFAULT_FIELD_ROOT_STATE,
    markedDirtyRef: {
      current: false
    },
    registerFieldControl: NOOP,
    validation: {
      getValidationProps: (props = EMPTY_OBJECT) => props,
      getInputValidationProps: (props = EMPTY_OBJECT) => props,
      inputRef: {
        current: null
      },
      commit: async () => {
      }
    }
  });
  if (true) FieldRootContext.displayName = "FieldRootContext";
  function useFieldRootContext(optional = true) {
    const context = React48.useContext(FieldRootContext);
    if (context.setValidityData === NOOP && !optional) {
      throw new Error(true ? "Base UI: FieldRootContext is missing. Field parts must be placed within <Field.Root>." : formatErrorMessage_default(28));
    }
    return context;
  }

  // node_modules/@base-ui/react/esm/fieldset/root/FieldsetRootContext.js
  init_define_import_meta_env();
  var React49 = __toESM(require_react_shim(), 1);
  var FieldsetRootContext = /* @__PURE__ */ React49.createContext({
    legendId: void 0,
    setLegendId: () => {
    },
    disabled: void 0
  });
  if (true) FieldsetRootContext.displayName = "FieldsetRootContext";
  function useFieldsetRootContext(optional = false) {
    const context = React49.useContext(FieldsetRootContext);
    if (!context && !optional) {
      throw new Error(true ? "Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>." : formatErrorMessage_default(86));
    }
    return context;
  }

  // node_modules/@base-ui/react/esm/internals/form-context/FormContext.js
  init_define_import_meta_env();
  var React50 = __toESM(require_react_shim(), 1);
  var FormContext = /* @__PURE__ */ React50.createContext({
    formRef: {
      current: {
        fields: /* @__PURE__ */ new Map()
      }
    },
    errors: {},
    clearErrors: NOOP,
    validationMode: "onSubmit",
    submitAttemptedRef: {
      current: false
    }
  });
  if (true) FormContext.displayName = "FormContext";
  function useFormContext() {
    return React50.useContext(FormContext);
  }

  // node_modules/@base-ui/react/esm/internals/labelable-provider/LabelableProvider.js
  init_define_import_meta_env();
  var React52 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/internals/labelable-provider/LabelableContext.js
  init_define_import_meta_env();
  var React51 = __toESM(require_react_shim(), 1);
  var LabelableContext = /* @__PURE__ */ React51.createContext({
    controlId: void 0,
    registerControlId: NOOP,
    labelId: void 0,
    setLabelId: NOOP,
    messageIds: [],
    setMessageIds: NOOP,
    getDescriptionProps: (externalProps) => externalProps
  });
  if (true) LabelableContext.displayName = "LabelableContext";
  function useLabelableContext() {
    return React51.useContext(LabelableContext);
  }

  // node_modules/@base-ui/react/esm/internals/labelable-provider/LabelableProvider.js
  var import_jsx_runtime16 = __toESM(require_react_shim(), 1);
  var LabelableProvider = function LabelableProvider2(props) {
    const defaultId = useBaseUiId();
    const initialControlId = props.controlId === void 0 ? defaultId : props.controlId;
    const [controlId, setControlIdState] = React52.useState(initialControlId);
    const [labelId, setLabelId] = React52.useState(props.labelId);
    const [messageIds, setMessageIds] = React52.useState([]);
    const registrationsRef = useRefWithInit(() => /* @__PURE__ */ new Map());
    const {
      messageIds: parentMessageIds
    } = useLabelableContext();
    const registerControlId = useStableCallback((source, nextId) => {
      const registrations = registrationsRef.current;
      if (nextId === void 0) {
        registrations.delete(source);
        return;
      }
      registrations.set(source, nextId);
      setControlIdState((prev) => {
        if (registrations.size === 0) {
          return void 0;
        }
        let nextControlId;
        for (const id of registrations.values()) {
          if (prev !== void 0 && id === prev) {
            return prev;
          }
          if (nextControlId === void 0) {
            nextControlId = id;
          }
        }
        return nextControlId;
      });
    });
    const getDescriptionProps = React52.useCallback((externalProps) => {
      return mergeProps({
        "aria-describedby": parentMessageIds.concat(messageIds).join(" ") || void 0
      }, externalProps);
    }, [parentMessageIds, messageIds]);
    const contextValue = React52.useMemo(() => ({
      controlId,
      registerControlId,
      labelId,
      setLabelId,
      messageIds,
      setMessageIds,
      getDescriptionProps
    }), [controlId, registerControlId, labelId, setLabelId, messageIds, setMessageIds, getDescriptionProps]);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(LabelableContext.Provider, {
      value: contextValue,
      children: props.children
    });
  };
  if (true) LabelableProvider.displayName = "LabelableProvider";

  // node_modules/@base-ui/react/esm/internals/labelable-provider/useLabelableId.js
  init_define_import_meta_env();
  var React53 = __toESM(require_react_shim(), 1);
  function useLabelableId(params = {}) {
    const {
      id,
      implicit = false,
      controlRef
    } = params;
    const {
      controlId,
      registerControlId
    } = useLabelableContext();
    const defaultId = useBaseUiId(id);
    const controlIdForEffect = implicit ? controlId : void 0;
    const controlSourceRef = useRefWithInit(() => /* @__PURE__ */ Symbol("labelable-control"));
    const hasRegisteredRef = React53.useRef(false);
    const hadExplicitIdRef = React53.useRef(id != null);
    const unregisterControlId = useStableCallback(() => {
      if (!hasRegisteredRef.current || registerControlId === NOOP) {
        return;
      }
      hasRegisteredRef.current = false;
      registerControlId(controlSourceRef.current, void 0);
    });
    useIsoLayoutEffect(() => {
      if (registerControlId === NOOP) {
        return void 0;
      }
      let nextId;
      if (implicit) {
        const elem = controlRef?.current;
        if (isElement(elem) && elem.closest("label") != null) {
          nextId = id ?? null;
        } else {
          nextId = controlIdForEffect ?? defaultId;
        }
      } else if (id != null) {
        hadExplicitIdRef.current = true;
        nextId = id;
      } else if (hadExplicitIdRef.current) {
        nextId = defaultId;
      } else {
        unregisterControlId();
        return void 0;
      }
      if (nextId === void 0) {
        unregisterControlId();
        return void 0;
      }
      hasRegisteredRef.current = true;
      registerControlId(controlSourceRef.current, nextId);
      return void 0;
    }, [id, controlRef, controlIdForEffect, registerControlId, implicit, defaultId, controlSourceRef, unregisterControlId]);
    React53.useEffect(() => {
      return unregisterControlId;
    }, [unregisterControlId]);
    return controlId ?? defaultId;
  }

  // node_modules/@base-ui/react/esm/internals/labelable-provider/useLabel.js
  init_define_import_meta_env();

  // node_modules/@base-ui/react/esm/utils/useRegisteredLabelId.js
  init_define_import_meta_env();
  function useRegisteredLabelId(idProp, setLabelId) {
    const id = useBaseUiId(idProp);
    useIsoLayoutEffect(() => {
      setLabelId(id);
      return () => {
        setLabelId(void 0);
      };
    }, [id, setLabelId]);
    return id;
  }

  // node_modules/@base-ui/react/esm/internals/labelable-provider/useLabel.js
  function useLabel(params = {}) {
    const {
      id: idProp,
      fallbackControlId,
      native = false,
      setLabelId: setLabelIdProp,
      focusControl: focusControlProp
    } = params;
    const {
      controlId: contextControlId,
      setLabelId: setContextLabelId
    } = useLabelableContext();
    const syncLabelId = useStableCallback((nextLabelId) => {
      setContextLabelId(nextLabelId);
      setLabelIdProp?.(nextLabelId);
    });
    const id = useRegisteredLabelId(idProp, syncLabelId);
    const resolvedControlId = contextControlId ?? fallbackControlId;
    function focusControl(event) {
      if (focusControlProp) {
        focusControlProp(event, resolvedControlId);
        return;
      }
      if (!resolvedControlId) {
        return;
      }
      const controlElement = ownerDocument(event.currentTarget).getElementById(resolvedControlId);
      if (isHTMLElement(controlElement)) {
        focusElementWithVisible(controlElement);
      }
    }
    function handleInteraction(event) {
      const target = getTarget(event.nativeEvent);
      if (target?.closest("button,input,select,textarea")) {
        return;
      }
      if (!event.defaultPrevented && event.detail > 1) {
        event.preventDefault();
      }
      if (native) {
        return;
      }
      focusControl(event);
    }
    return native ? {
      id,
      htmlFor: resolvedControlId ?? void 0,
      onMouseDown: handleInteraction
    } : {
      id,
      onClick: handleInteraction,
      onPointerDown(event) {
        event.preventDefault();
      }
    };
  }
  function focusElementWithVisible(element) {
    element.focus({
      // Available from Chrome 144+ (January 2026).
      // Safari and Firefox already support it.
      focusVisible: true
    });
  }

  // node_modules/@base-ui/react/esm/field/root/useFieldValidation.js
  init_define_import_meta_env();
  var React54 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/field/utils/getCombinedFieldValidityData.js
  init_define_import_meta_env();
  function getCombinedFieldValidityData(validityData, invalid) {
    return {
      ...validityData,
      state: {
        ...validityData.state,
        valid: !invalid && validityData.state.valid
      }
    };
  }

  // node_modules/@base-ui/react/esm/field/root/useFieldValidation.js
  var validityKeys = Object.keys(DEFAULT_VALIDITY_STATE);
  function isOnlyValueMissing(state) {
    if (!state || state.valid || !state.valueMissing) {
      return false;
    }
    let onlyValueMissing = false;
    for (const key of validityKeys) {
      if (key === "valid") {
        continue;
      }
      if (key === "valueMissing") {
        onlyValueMissing = state[key];
      }
      if (state[key]) {
        onlyValueMissing = false;
      }
    }
    return onlyValueMissing;
  }
  function useFieldValidation(params) {
    const {
      formRef,
      clearErrors
    } = useFormContext();
    const {
      setValidityData,
      validate,
      validityData,
      validationDebounceTime,
      invalid,
      markedDirtyRef,
      state,
      name,
      shouldValidateOnChange
    } = params;
    const {
      controlId,
      getDescriptionProps
    } = useLabelableContext();
    const timeout = useTimeout();
    const inputRef = React54.useRef(null);
    const commit = useStableCallback(async (value, revalidate = false) => {
      const element = inputRef.current;
      if (!element) {
        return;
      }
      if (revalidate) {
        if (state.valid !== false) {
          return;
        }
        const currentNativeValidity = element.validity;
        if (!currentNativeValidity.valueMissing) {
          const nextValidityData2 = {
            value,
            state: {
              ...DEFAULT_VALIDITY_STATE,
              valid: true
            },
            error: "",
            errors: [],
            initialValue: validityData.initialValue
          };
          element.setCustomValidity("");
          if (controlId) {
            const currentFieldData = formRef.current.fields.get(controlId);
            if (currentFieldData) {
              formRef.current.fields.set(controlId, {
                ...currentFieldData,
                ...getCombinedFieldValidityData(nextValidityData2, false)
                // invalid = false
              });
            }
          }
          setValidityData(nextValidityData2);
          return;
        }
        const currentNativeValidityObject = validityKeys.reduce((acc, key) => {
          acc[key] = currentNativeValidity[key];
          return acc;
        }, {});
        if (!currentNativeValidityObject.valid && !isOnlyValueMissing(currentNativeValidityObject)) {
          return;
        }
      }
      function getState(el) {
        const computedState = validityKeys.reduce((acc, key) => {
          acc[key] = el.validity[key];
          return acc;
        }, {});
        let hasOnlyValueMissingError = false;
        for (const key of validityKeys) {
          if (key === "valid") {
            continue;
          }
          if (key === "valueMissing" && computedState[key]) {
            hasOnlyValueMissingError = true;
          } else if (computedState[key]) {
            return computedState;
          }
        }
        if (hasOnlyValueMissingError && !markedDirtyRef.current) {
          computedState.valid = true;
          computedState.valueMissing = false;
        }
        return computedState;
      }
      timeout.clear();
      let result = null;
      let validationErrors = [];
      const nextState = getState(element);
      let defaultValidationMessage;
      const validateOnChange = shouldValidateOnChange();
      if (element.validationMessage && !validateOnChange) {
        defaultValidationMessage = element.validationMessage;
        validationErrors = [element.validationMessage];
      } else {
        const formValues = Array.from(formRef.current.fields.values()).reduce((acc, field) => {
          if (field.name) {
            acc[field.name] = field.getValue();
          }
          return acc;
        }, {});
        const resultOrPromise = validate(value, formValues);
        if (typeof resultOrPromise === "object" && resultOrPromise !== null && "then" in resultOrPromise) {
          result = await resultOrPromise;
        } else {
          result = resultOrPromise;
        }
        if (result !== null) {
          nextState.valid = false;
          nextState.customError = true;
          if (Array.isArray(result)) {
            validationErrors = result;
            element.setCustomValidity(result.join("\n"));
          } else if (result) {
            validationErrors = [result];
            element.setCustomValidity(result);
          }
        } else if (validateOnChange) {
          element.setCustomValidity("");
          nextState.customError = false;
          if (element.validationMessage) {
            defaultValidationMessage = element.validationMessage;
            validationErrors = [element.validationMessage];
          } else if (element.validity.valid && !nextState.valid) {
            nextState.valid = true;
          }
        }
      }
      const nextValidityData = {
        value,
        state: nextState,
        error: defaultValidationMessage ?? (Array.isArray(result) ? result[0] : result ?? ""),
        errors: validationErrors,
        initialValue: validityData.initialValue
      };
      if (controlId) {
        const currentFieldData = formRef.current.fields.get(controlId);
        if (currentFieldData) {
          formRef.current.fields.set(controlId, {
            ...currentFieldData,
            // Keep Form-level errors part of overall field validity for submit blocking/focus logic.
            ...getCombinedFieldValidityData(nextValidityData, invalid)
          });
        }
      }
      setValidityData(nextValidityData);
    });
    const getValidationProps = React54.useCallback((externalProps = {}) => mergeProps(getDescriptionProps, state.valid === false ? {
      "aria-invalid": true
    } : EMPTY_OBJECT, externalProps), [getDescriptionProps, state.valid]);
    const getInputValidationProps = React54.useCallback((externalProps = {}) => mergeProps({
      onChange(event) {
        if (event.nativeEvent.defaultPrevented) {
          return;
        }
        clearErrors(name);
        if (!shouldValidateOnChange()) {
          commit(event.currentTarget.value, true);
          return;
        }
        const element = event.currentTarget;
        if (element.value === "") {
          commit(element.value);
          return;
        }
        timeout.clear();
        if (validationDebounceTime) {
          timeout.start(validationDebounceTime, () => {
            commit(element.value);
          });
        } else {
          commit(element.value);
        }
      }
    }, getValidationProps(externalProps)), [getValidationProps, clearErrors, name, timeout, commit, validationDebounceTime, shouldValidateOnChange]);
    return React54.useMemo(() => ({
      getValidationProps,
      getInputValidationProps,
      inputRef,
      commit
    }), [getValidationProps, getInputValidationProps, commit]);
  }

  // node_modules/@base-ui/react/esm/internals/field-register-control/useFieldControlRegistration.js
  init_define_import_meta_env();
  var React55 = __toESM(require_react_shim(), 1);
  var ReactDOM3 = __toESM(require_react_dom_shim(), 1);
  function useFieldControlRegistration(params) {
    const {
      commit,
      invalid,
      markedDirtyRef,
      name,
      setValidityData,
      validityData
    } = params;
    const {
      formRef
    } = useFormContext();
    const activeFieldControlSourceRef = React55.useRef(null);
    const registrationRef = React55.useRef(null);
    const fallbackControlRef = React55.useRef(null);
    const getValue = useStableCallback(() => {
      const registration = registrationRef.current;
      if (!registration) {
        return void 0;
      }
      if (registration.getValue) {
        return registration.getValue();
      }
      return registration.value;
    });
    const validate = useStableCallback((flushSync3 = true) => {
      const registration = registrationRef.current;
      if (!registration) {
        return;
      }
      let nextValue = registration.value;
      if (nextValue === void 0) {
        nextValue = getValue();
      }
      markedDirtyRef.current = true;
      if (!flushSync3) {
        commit(nextValue);
      } else {
        ReactDOM3.flushSync(() => commit(nextValue));
      }
    });
    function refreshRegistration() {
      const registration = registrationRef.current;
      if (!registration || !registration.id) {
        return;
      }
      formRef.current.fields.set(registration.id, {
        getValue,
        name,
        controlRef: registration.controlRef ?? fallbackControlRef,
        validityData: getCombinedFieldValidityData(validityData, invalid),
        validate
      });
    }
    function deleteRegistration(id = registrationRef.current?.id) {
      if (id) {
        formRef.current.fields.delete(id);
      }
    }
    function syncInitialValue() {
      const registration = registrationRef.current;
      if (!registration) {
        return;
      }
      let initialValue = registration.value;
      if (initialValue === void 0) {
        initialValue = getValue();
      }
      if (validityData.initialValue === null && initialValue !== null) {
        setValidityData((prev) => ({
          ...prev,
          initialValue
        }));
      }
    }
    useIsoLayoutEffect(() => {
      const registration = registrationRef.current;
      if (!registration || !registration.id) {
        return;
      }
      formRef.current.fields.set(registration.id, {
        getValue,
        name,
        controlRef: registration.controlRef ?? fallbackControlRef,
        validityData: getCombinedFieldValidityData(validityData, invalid),
        validate
      });
    }, [formRef, getValue, invalid, name, validate, validityData]);
    useIsoLayoutEffect(() => {
      const fields = formRef.current.fields;
      return () => {
        const id = registrationRef.current?.id;
        if (id) {
          fields.delete(id);
        }
      };
    }, [formRef]);
    return useStableCallback((source, registration) => {
      if (!registration) {
        if (activeFieldControlSourceRef.current === source) {
          activeFieldControlSourceRef.current = null;
          deleteRegistration();
          registrationRef.current = null;
        }
        return;
      }
      const previousId = registrationRef.current?.id;
      activeFieldControlSourceRef.current = source;
      registrationRef.current = registration;
      if (previousId && previousId !== registration.id) {
        deleteRegistration(previousId);
      }
      syncInitialValue();
      refreshRegistration();
    });
  }

  // node_modules/@base-ui/react/esm/field/root/FieldRoot.js
  var import_jsx_runtime17 = __toESM(require_react_shim(), 1);
  var FieldRootInner = /* @__PURE__ */ React56.forwardRef(function FieldRootInner2(componentProps, forwardedRef) {
    const {
      errors,
      validationMode: formValidationMode,
      submitAttemptedRef
    } = useFormContext();
    const {
      render,
      className,
      validate: validateProp,
      validationDebounceTime = 0,
      validationMode = formValidationMode,
      name,
      disabled: disabledProp = false,
      invalid: invalidProp,
      dirty: dirtyProp,
      touched: touchedProp,
      actionsRef,
      style,
      ...elementProps
    } = componentProps;
    const {
      disabled: disabledFieldset
    } = useFieldsetRootContext();
    const validate = useStableCallback(validateProp || (() => null));
    const disabled2 = disabledFieldset || disabledProp;
    const [touchedState, setTouchedUnwrapped] = React56.useState(false);
    const [dirtyState, setDirtyUnwrapped] = React56.useState(false);
    const [filled, setFilled] = React56.useState(false);
    const [focused, setFocused] = React56.useState(false);
    const dirty = dirtyProp ?? dirtyState;
    const touched = touchedProp ?? touchedState;
    const markedDirtyRef = React56.useRef(false);
    const setDirty = useStableCallback((value) => {
      if (dirtyProp !== void 0) {
        return;
      }
      if (value) {
        markedDirtyRef.current = true;
      }
      setDirtyUnwrapped(value);
    });
    const setTouched = useStableCallback((value) => {
      if (touchedProp !== void 0) {
        return;
      }
      setTouchedUnwrapped(value);
    });
    const shouldValidateOnChange = useStableCallback(() => validationMode === "onChange" || validationMode === "onSubmit" && submitAttemptedRef.current);
    const hasFormError = !!name && Object.hasOwn(errors, name) && errors[name] !== void 0;
    const invalid = invalidProp === true || hasFormError;
    const [validityData, setValidityData] = React56.useState({
      state: DEFAULT_VALIDITY_STATE,
      error: "",
      errors: [],
      value: null,
      initialValue: null
    });
    const valid = !invalid && validityData.state.valid;
    const state = React56.useMemo(() => ({
      disabled: disabled2,
      touched,
      dirty,
      valid,
      filled,
      focused
    }), [disabled2, touched, dirty, valid, filled, focused]);
    const validation = useFieldValidation({
      setValidityData,
      validate,
      validityData,
      validationDebounceTime,
      invalid,
      markedDirtyRef,
      state,
      name,
      shouldValidateOnChange
    });
    const handleImperativeValidate = React56.useCallback(() => {
      markedDirtyRef.current = true;
      validation.commit(validityData.value);
    }, [validation, validityData]);
    const registerFieldControl = useFieldControlRegistration({
      commit: validation.commit,
      invalid,
      markedDirtyRef,
      name,
      setValidityData,
      validityData
    });
    React56.useImperativeHandle(actionsRef, () => ({
      validate: handleImperativeValidate
    }), [handleImperativeValidate]);
    const contextValue = React56.useMemo(() => ({
      invalid,
      name,
      validityData,
      setValidityData,
      disabled: disabled2,
      touched,
      setTouched,
      dirty,
      setDirty,
      filled,
      setFilled,
      focused,
      setFocused,
      validate,
      validationMode,
      validationDebounceTime,
      shouldValidateOnChange,
      state,
      markedDirtyRef,
      registerFieldControl,
      validation
    }), [invalid, name, validityData, disabled2, touched, setTouched, dirty, setDirty, filled, setFilled, focused, setFocused, validate, validationMode, validationDebounceTime, shouldValidateOnChange, state, registerFieldControl, validation]);
    const element = useRenderElement("div", componentProps, {
      ref: forwardedRef,
      state,
      props: elementProps,
      stateAttributesMapping: fieldValidityMapping
    });
    return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FieldRootContext.Provider, {
      value: contextValue,
      children: element
    });
  });
  if (true) FieldRootInner.displayName = "FieldRootInner";
  var FieldRoot = /* @__PURE__ */ React56.forwardRef(function FieldRoot2(componentProps, forwardedRef) {
    return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LabelableProvider, {
      children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FieldRootInner, {
        ...componentProps,
        ref: forwardedRef
      })
    });
  });
  if (true) FieldRoot.displayName = "FieldRoot";

  // node_modules/@base-ui/react/esm/field/label/FieldLabel.js
  init_define_import_meta_env();
  var React57 = __toESM(require_react_shim(), 1);
  var FieldLabel2 = /* @__PURE__ */ React57.forwardRef(function FieldLabel3(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      id: idProp,
      nativeLabel = true,
      ...elementProps
    } = componentProps;
    const fieldRootContext = useFieldRootContext(false);
    const {
      labelId
    } = useLabelableContext();
    const labelRef = React57.useRef(null);
    const labelProps = useLabel({
      id: labelId ?? idProp,
      native: nativeLabel
    });
    if (true) {
      React57.useEffect(() => {
        if (!labelRef.current) {
          return;
        }
        const isLabelTag = labelRef.current.tagName === "LABEL";
        if (nativeLabel) {
          if (!isLabelTag) {
            const ownerStackMessage = SafeReact.captureOwnerStack?.() || "";
            const message = "<Field.Label> expected a <label> element because the `nativeLabel` prop is true. Rendering a non-<label> disables native label association, so `htmlFor` will not work. Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.";
            error(`${message}${ownerStackMessage}`);
          }
        } else if (isLabelTag) {
          const ownerStackMessage = SafeReact.captureOwnerStack?.() || "";
          const message = "<Field.Label> expected a non-<label> element because the `nativeLabel` prop is false. Rendering a <label> assumes native label behavior while Base UI treats it as non-native, which can cause unexpected pointer behavior. Use a non-<label> in the `render` prop, or set `nativeLabel` to `true`.";
          error(`${message}${ownerStackMessage}`);
        }
      }, [nativeLabel]);
    }
    const element = useRenderElement("label", componentProps, {
      ref: [forwardedRef, labelRef],
      state: fieldRootContext.state,
      props: [labelProps, elementProps],
      stateAttributesMapping: fieldValidityMapping
    });
    return element;
  });
  if (true) FieldLabel2.displayName = "FieldLabel";

  // node_modules/@base-ui/react/esm/field/error/FieldError.js
  init_define_import_meta_env();
  var React58 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime18 = __toESM(require_react_shim(), 1);
  var stateAttributesMapping4 = {
    ...fieldValidityMapping,
    ...transitionStatusMapping
  };
  var FieldError2 = /* @__PURE__ */ React58.forwardRef(function FieldError3(componentProps, forwardedRef) {
    const {
      render,
      id: idProp,
      className,
      match,
      style,
      ...elementProps
    } = componentProps;
    const id = useBaseUiId(idProp);
    const {
      validityData,
      state: fieldState,
      name
    } = useFieldRootContext(false);
    const {
      setMessageIds
    } = useLabelableContext();
    const {
      errors
    } = useFormContext();
    const formError = name ? errors[name] : null;
    const hasSpecificMatch = typeof match === "string";
    let rendered = false;
    if (match === true) {
      rendered = true;
    } else if (hasSpecificMatch) {
      rendered = Boolean(validityData.state[match]);
    } else {
      rendered = Boolean(formError) || validityData.state.valid === false;
    }
    const {
      mounted,
      transitionStatus,
      setMounted
    } = useTransitionStatus(rendered);
    useIsoLayoutEffect(() => {
      if (!rendered || !id) {
        return void 0;
      }
      setMessageIds((v) => v.concat(id));
      return () => {
        setMessageIds((v) => v.filter((item) => item !== id));
      };
    }, [rendered, id, setMessageIds]);
    const errorRef = React58.useRef(null);
    const [lastRenderedMessage, setLastRenderedMessage] = React58.useState(null);
    const [lastRenderedMessageKey, setLastRenderedMessageKey] = React58.useState(null);
    const clientErrorMessage = validityData.errors.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("ul", {
      children: validityData.errors.map((message) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("li", {
        children: message
      }, message))
    }) : validityData.error;
    const errorMessage = hasSpecificMatch ? clientErrorMessage : formError || clientErrorMessage;
    let errorKey = validityData.error;
    if (formError != null) {
      errorKey = Array.isArray(formError) ? JSON.stringify(formError) : formError;
    } else if (validityData.errors.length > 1) {
      errorKey = JSON.stringify(validityData.errors);
    }
    if (rendered && errorKey !== lastRenderedMessageKey) {
      setLastRenderedMessageKey(errorKey);
      setLastRenderedMessage(errorMessage);
    }
    useOpenChangeComplete({
      open: rendered,
      ref: errorRef,
      onComplete() {
        if (!rendered) {
          setMounted(false);
        }
      }
    });
    const state = {
      ...fieldState,
      transitionStatus
    };
    const element = useRenderElement("div", componentProps, {
      ref: [forwardedRef, errorRef],
      state,
      props: [{
        id,
        children: rendered ? errorMessage : lastRenderedMessage
      }, elementProps],
      stateAttributesMapping: stateAttributesMapping4,
      enabled: mounted
    });
    if (!mounted) {
      return null;
    }
    return element;
  });
  if (true) FieldError2.displayName = "FieldError";

  // node_modules/@base-ui/react/esm/field/description/FieldDescription.js
  init_define_import_meta_env();
  var React59 = __toESM(require_react_shim(), 1);
  var FieldDescription2 = /* @__PURE__ */ React59.forwardRef(function FieldDescription3(componentProps, forwardedRef) {
    const {
      render,
      id: idProp,
      className,
      style,
      ...elementProps
    } = componentProps;
    const id = useBaseUiId(idProp);
    const fieldRootContext = useFieldRootContext(false);
    const {
      setMessageIds
    } = useLabelableContext();
    useIsoLayoutEffect(() => {
      if (!id) {
        return void 0;
      }
      setMessageIds((v) => v.concat(id));
      return () => {
        setMessageIds((v) => v.filter((item) => item !== id));
      };
    }, [id, setMessageIds]);
    const element = useRenderElement("p", componentProps, {
      ref: forwardedRef,
      state: fieldRootContext.state,
      props: [{
        id
      }, elementProps],
      stateAttributesMapping: fieldValidityMapping
    });
    return element;
  });
  if (true) FieldDescription2.displayName = "FieldDescription";

  // node_modules/@base-ui/react/esm/field/control/FieldControl.js
  init_define_import_meta_env();
  var React62 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/utils/esm/useControlled.js
  init_define_import_meta_env();
  var React60 = __toESM(require_react_shim(), 1);
  function useControlled({
    controlled,
    default: defaultProp,
    name,
    state = "value"
  }) {
    const {
      current: isControlled
    } = React60.useRef(controlled !== void 0);
    const [valueState, setValue] = React60.useState(defaultProp);
    const value = isControlled ? controlled : valueState;
    if (true) {
      React60.useEffect(() => {
        if (isControlled !== (controlled !== void 0)) {
          error([`A component is changing the ${isControlled ? "" : "un"}controlled ${state} state of ${name} to be ${isControlled ? "un" : ""}controlled.`, "Elements should not switch from uncontrolled to controlled (or vice versa).", `Decide between using a controlled or uncontrolled ${name} element for the lifetime of the component.`, "The nature of the state is determined during the first render. It's considered controlled if the value is not `undefined`.", "More info: https://fb.me/react-controlled-components"].join("\n"));
        }
      }, [state, name, controlled]);
      const {
        current: defaultValue
      } = React60.useRef(defaultProp);
      React60.useEffect(() => {
        if (!isControlled && serializeToDevModeString(defaultValue) !== serializeToDevModeString(defaultProp)) {
          error([`A component is changing the default ${state} state of an uncontrolled ${name} after being initialized. To suppress this warning opt to use a controlled ${name}.`].join("\n"));
        }
      }, [defaultProp]);
    }
    const setValueIfUncontrolled = React60.useCallback((newValue) => {
      if (!isControlled) {
        setValue(newValue);
      }
    }, []);
    return [value, setValueIfUncontrolled];
  }
  function serializeToDevModeString(input) {
    let nextId = 0;
    const seen = /* @__PURE__ */ new WeakMap();
    try {
      const result = JSON.stringify(input, function replacer(key, value) {
        if (key === "_owner" && this != null && typeof this === "object" && "$$typeof" in this) {
          return void 0;
        }
        if (typeof value === "bigint") {
          return `__bigint__:${value}`;
        }
        if (value !== null && typeof value === "object") {
          const id = seen.get(value);
          if (id !== void 0) {
            return `__object__:${id}`;
          }
          seen.set(value, nextId);
          nextId += 1;
        }
        return value;
      });
      return result ?? `__top__:${typeof input}`;
    } catch {
      return "__unserializable__";
    }
  }

  // node_modules/@base-ui/react/esm/internals/field-register-control/useRegisterFieldControl.js
  init_define_import_meta_env();
  var React61 = __toESM(require_react_shim(), 1);
  function useRegisterFieldControl(controlRef, params) {
    const {
      enabled = true,
      getValue,
      id,
      value
    } = params;
    const {
      registerFieldControl
    } = useFieldRootContext();
    const sourceRef = React61.useRef(null);
    if (!sourceRef.current) {
      sourceRef.current = /* @__PURE__ */ Symbol();
    }
    useIsoLayoutEffect(() => {
      const source = sourceRef.current;
      if (!source || !enabled) {
        return void 0;
      }
      registerFieldControl(source, {
        controlRef,
        getValue,
        id,
        value
      });
      return () => {
        registerFieldControl(source, void 0);
      };
    }, [controlRef, enabled, getValue, id, registerFieldControl, value]);
  }

  // node_modules/@base-ui/react/esm/field/control/FieldControl.js
  var FieldControl = /* @__PURE__ */ React62.forwardRef(function FieldControl2(componentProps, forwardedRef) {
    const {
      render,
      className,
      id: idProp,
      name: nameProp,
      value: valueProp,
      disabled: disabledProp = false,
      onValueChange,
      defaultValue,
      autoFocus = false,
      style,
      ...elementProps
    } = componentProps;
    const {
      state: fieldState,
      name: fieldName,
      disabled: fieldDisabled,
      setTouched,
      setDirty,
      validityData,
      setFocused,
      setFilled,
      validationMode,
      validation
    } = useFieldRootContext();
    const disabled2 = fieldDisabled || disabledProp;
    const name = fieldName ?? nameProp;
    const state = {
      ...fieldState,
      disabled: disabled2
    };
    const {
      labelId
    } = useLabelableContext();
    const id = useLabelableId({
      id: idProp
    });
    useIsoLayoutEffect(() => {
      const hasExternalValue = valueProp != null;
      if (validation.inputRef.current?.value || hasExternalValue && valueProp !== "") {
        setFilled(true);
      } else if (hasExternalValue && valueProp === "") {
        setFilled(false);
      }
    }, [validation.inputRef, setFilled, valueProp]);
    const inputRef = React62.useRef(null);
    useIsoLayoutEffect(() => {
      if (autoFocus && inputRef.current === activeElement(ownerDocument(inputRef.current))) {
        setFocused(true);
      }
    }, [autoFocus, setFocused]);
    const [valueUnwrapped] = useControlled({
      controlled: valueProp,
      default: defaultValue,
      name: "FieldControl",
      state: "value"
    });
    const isControlled = valueProp !== void 0;
    const value = isControlled ? valueUnwrapped : void 0;
    const getFieldValue = useStableCallback(() => validation.inputRef.current?.value);
    useRegisterFieldControl(validation.inputRef, {
      id,
      value,
      getValue: getFieldValue
    });
    const element = useRenderElement("input", componentProps, {
      ref: [forwardedRef, inputRef],
      state,
      props: [{
        id,
        disabled: disabled2,
        name,
        ref: validation.inputRef,
        "aria-labelledby": labelId,
        autoFocus,
        ...isControlled ? {
          value
        } : {
          defaultValue
        },
        onChange(event) {
          const inputValue = event.currentTarget.value;
          onValueChange?.(inputValue, createChangeEventDetails(reason_parts_exports.none, event.nativeEvent));
          setDirty(inputValue !== validityData.initialValue);
          setFilled(inputValue !== "");
        },
        onFocus() {
          setFocused(true);
        },
        onBlur(event) {
          setTouched(true);
          setFocused(false);
          if (validationMode === "onBlur") {
            validation.commit(event.currentTarget.value);
          }
        },
        onKeyDown(event) {
          if (event.currentTarget.tagName === "INPUT" && event.key === "Enter") {
            setTouched(true);
            validation.commit(event.currentTarget.value);
          }
        }
      }, validation.getInputValidationProps(), elementProps],
      stateAttributesMapping: fieldValidityMapping
    });
    return element;
  });
  if (true) FieldControl.displayName = "FieldControl";

  // node_modules/@base-ui/react/esm/field/validity/FieldValidity.js
  init_define_import_meta_env();
  var React63 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime19 = __toESM(require_react_shim(), 1);
  var FieldValidity = function FieldValidity2(props) {
    const {
      children
    } = props;
    const {
      validityData,
      invalid
    } = useFieldRootContext(false);
    const combinedFieldValidityData = React63.useMemo(() => getCombinedFieldValidityData(validityData, invalid), [validityData, invalid]);
    const isInvalid = combinedFieldValidityData.state.valid === false;
    const {
      transitionStatus
    } = useTransitionStatus(isInvalid);
    const fieldValidityState = React63.useMemo(() => {
      return {
        ...combinedFieldValidityData,
        validity: combinedFieldValidityData.state,
        transitionStatus
      };
    }, [combinedFieldValidityData, transitionStatus]);
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(React63.Fragment, {
      children: children(fieldValidityState)
    });
  };
  if (true) FieldValidity.displayName = "FieldValidity";

  // node_modules/@base-ui/react/esm/field/item/FieldItem.js
  init_define_import_meta_env();
  var React66 = __toESM(require_react_shim(), 1);

  // node_modules/@base-ui/react/esm/field/item/FieldItemContext.js
  init_define_import_meta_env();
  var React64 = __toESM(require_react_shim(), 1);
  var FieldItemContext = /* @__PURE__ */ React64.createContext({
    disabled: false
  });
  if (true) FieldItemContext.displayName = "FieldItemContext";

  // node_modules/@base-ui/react/esm/checkbox-group/CheckboxGroupContext.js
  init_define_import_meta_env();
  var React65 = __toESM(require_react_shim(), 1);
  var CheckboxGroupContext = /* @__PURE__ */ React65.createContext(void 0);
  if (true) CheckboxGroupContext.displayName = "CheckboxGroupContext";
  function useCheckboxGroupContext(optional = true) {
    const context = React65.useContext(CheckboxGroupContext);
    if (context === void 0 && !optional) {
      throw new Error(true ? "Base UI: CheckboxGroupContext is missing. CheckboxGroup parts must be placed within <CheckboxGroup>." : formatErrorMessage_default(3));
    }
    return context;
  }

  // node_modules/@base-ui/react/esm/field/item/FieldItem.js
  var import_jsx_runtime20 = __toESM(require_react_shim(), 1);
  var FieldItem = /* @__PURE__ */ React66.forwardRef(function FieldItem2(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      disabled: disabledProp = false,
      ...elementProps
    } = componentProps;
    const {
      state,
      disabled: rootDisabled
    } = useFieldRootContext(false);
    const disabled2 = rootDisabled || disabledProp;
    const checkboxGroupContext = useCheckboxGroupContext();
    const parentId = checkboxGroupContext?.parent.id;
    const hasParentCheckbox = checkboxGroupContext?.allValues !== void 0;
    const controlId = hasParentCheckbox ? parentId : void 0;
    const fieldItemContext = React66.useMemo(() => ({
      disabled: disabled2
    }), [disabled2]);
    const element = useRenderElement("div", componentProps, {
      ref: forwardedRef,
      state,
      props: elementProps,
      stateAttributesMapping: fieldValidityMapping
    });
    return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(LabelableProvider, {
      controlId,
      children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(FieldItemContext.Provider, {
        value: fieldItemContext,
        children: element
      })
    });
  });
  if (true) FieldItem.displayName = "FieldItem";

  // node_modules/@base-ui/react/esm/input/Input.js
  var import_jsx_runtime21 = __toESM(require_react_shim(), 1);
  var Input = /* @__PURE__ */ React67.forwardRef(function Input2(props, forwardedRef) {
    return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(index_parts_exports2.Control, {
      ref: forwardedRef,
      ...props
    });
  });
  if (true) Input.displayName = "Input";

  // src/components/ui/input.tsx
  var import_jsx_runtime22 = __toESM(require_react_shim());
  function Input3({ className, type, ...props }) {
    if (type === "date") {
      return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DateInput, { className, ...props });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      Input,
      {
        type,
        "data-slot": "input",
        className: cn(INPUT_BASE_CLASS, className),
        ...props
      }
    );
  }

  // src/components/ui/table.tsx
  init_define_import_meta_env();
  var import_jsx_runtime23 = __toESM(require_react_shim());
  function Table({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "div",
      {
        "data-slot": "table-container",
        className: "relative w-full overflow-x-auto",
        children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          "table",
          {
            "data-slot": "table",
            className: cn("w-full caption-bottom text-sm", className),
            ...props
          }
        )
      }
    );
  }
  function TableHeader({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "thead",
      {
        "data-slot": "table-header",
        className: cn("[&_tr]:border-b", className),
        ...props
      }
    );
  }
  function TableBody({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "tbody",
      {
        "data-slot": "table-body",
        className: cn("[&_tr:last-child]:border-0", className),
        ...props
      }
    );
  }
  function TableFooter({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "tfoot",
      {
        "data-slot": "table-footer",
        className: cn(
          "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
          className
        ),
        ...props
      }
    );
  }
  function TableRow({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "tr",
      {
        "data-slot": "table-row",
        className: cn(
          "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
          className
        ),
        ...props
      }
    );
  }
  function TableHead({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "th",
      {
        "data-slot": "table-head",
        className: cn(
          "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
          className
        ),
        ...props
      }
    );
  }
  function TableCell({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "td",
      {
        "data-slot": "table-cell",
        className: cn(
          "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
          className
        ),
        ...props
      }
    );
  }
  function TableCaption({
    className,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "caption",
      {
        "data-slot": "table-caption",
        className: cn("mt-4 text-sm text-muted-foreground", className),
        ...props
      }
    );
  }
  return __toCommonJS(pkg_entry_exports);
})();
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-shim.development.js:
  (**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js:
  (**
   * @license React
   * use-sync-external-store-shim/with-selector.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs:
lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide-react/dist/esm/defaultAttributes.mjs:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide-react/dist/esm/context.mjs:
lucide-react/dist/esm/Icon.mjs:
lucide-react/dist/esm/createLucideIcon.mjs:
lucide-react/dist/esm/icons/calendar-days.mjs:
lucide-react/dist/esm/icons/x.mjs:
lucide-react/dist/esm/lucide-react.mjs:
  (**
   * @license lucide-react v1.11.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
window.BBI=BBI.__dsMainNs?Object.assign({},BBI,BBI.__dsMainNs,{__dsMainNs:undefined}):BBI;
