export function adfToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) {
    return node.content.map(adfToText).join(
      node.type === "paragraph" || node.type === "heading" ? "\n" : ""
    );
  }
  return "";
}
