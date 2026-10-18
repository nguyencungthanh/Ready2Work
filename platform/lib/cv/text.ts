import { MIN_CV_CHARACTERS } from "./validation";

/** A non-empty text layer can still be unusable because of broken font maps. */
export function hasReadableCVText(value: string): boolean {
  const text = value.normalize("NFC").trim();
  const visible = text.replace(/\s/g, "");
  if (text.length < MIN_CV_CHARACTERS || !visible.length) return false;
  const lettersAndNumbers = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const brokenGlyphs = text.match(/[\uFFFD\p{Co}\p{Cc}]/gu)?.filter((character) => !/\s/u.test(character)).length ?? 0;
  return lettersAndNumbers >= 20 && lettersAndNumbers / visible.length >= 0.5
    && brokenGlyphs / visible.length < 0.02 && !/(?:\(cid:\d+\)[\s\S]*){2}/.test(text);
}
