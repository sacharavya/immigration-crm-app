// Minimal XML element-path flattener for XFA datasets packets.
//
// The datasets XML in IRCC blanks is machine-generated element soup with no
// mixed content worth preserving, so a tiny tokenizer beats pulling in a DOM
// dependency (DOMParser exists in the browser but not in Node, where the
// tests run). Handles: elements, self-closing elements, attributes (skipped),
// comments, processing instructions, CDATA, and text (ignored).
//
// ponytail: not a general XML parser; entities and doctypes are out of
// scope, which datasets packets do not use.

export type XmlPath = {
  path: string;
  repeating: boolean;
};

function stripNamespace(tag: string): string {
  const i = tag.indexOf(":");
  return i === -1 ? tag : tag.slice(i + 1);
}

// Flattens to LEAF element paths: elements with no child elements. Parents
// that repeat mark all their descendants as repeating.
export function flattenXmlPaths(xml: string): XmlPath[] {
  type Frame = { name: string; childCounts: Map<string, number>; hasChildElement: boolean };
  const stack: Frame[] = [];
  const out = new Map<string, boolean>();
  // Which stack depths sit inside a repeated element.
  let repeatingDepth = -1;

  const tokenRe = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(xml)) !== null) {
    const [token, closeName, openName, , selfClose] = m;
    if (token.startsWith("<!--") || token.startsWith("<![CDATA[") || token.startsWith("<?")) {
      continue;
    }

    if (openName) {
      const name = stripNamespace(openName);
      const parent = stack[stack.length - 1];
      let isRepeat = false;
      if (parent) {
        parent.hasChildElement = true;
        const n = (parent.childCounts.get(name) ?? 0) + 1;
        parent.childCounts.set(name, n);
        isRepeat = n > 1;
      }
      const path = [...stack.map((f) => f.name), name].join(".");

      if (selfClose) {
        // A leaf with no children.
        const repeating = isRepeat || repeatingDepth !== -1;
        out.set(path, (out.get(path) ?? false) || repeating || isRepeat);
        continue;
      }

      stack.push({ name, childCounts: new Map(), hasChildElement: false });
      if (isRepeat && repeatingDepth === -1) {
        repeatingDepth = stack.length - 1;
      }
      continue;
    }

    if (closeName) {
      const frame = stack.pop();
      if (!frame) continue;
      if (!frame.hasChildElement) {
        const path = [...stack.map((f) => f.name), frame.name].join(".");
        const parent = stack[stack.length - 1];
        const count = parent?.childCounts.get(frame.name) ?? 1;
        const repeating = count > 1 || repeatingDepth !== -1;
        out.set(path, (out.get(path) ?? false) || repeating);
      }
      if (repeatingDepth !== -1 && stack.length <= repeatingDepth) {
        repeatingDepth = -1;
      }
    }
  }

  return [...out.entries()].map(([path, repeating]) => ({ path, repeating }));
}
