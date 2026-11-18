import { sourcePathToLine } from './preview/navigation';

function referenceAtColumn(line: string, column: number): string | null {
  const match = /["']?\$componentRef["']?\s*:\s*(["'])(#\/components\/[^"']+)\1/.exec(line)
    ?? /["']?\$componentRef["']?\s*:\s*(#\/components\/[^\s,}\]]+)/.exec(line);
  if (!match) return null;

  const value = match[2] ?? match[1];
  const valueStart = line.indexOf(value, match.index) + 1;
  const valueEnd = valueStart + value.length;
  return column >= valueStart && column <= valueEnd ? value : null;
}

/**
 * Text-based lookup of a JSON-pointer path, used only to follow `$componentRef`
 * values while the source does not parse. Validation findings use the AST lookup.
 */
export function pathToLine(
  text: string,
  path: string,
  requireCompleteMatch = false,
): number {
  const segments = (path || '/').split('/').filter(Boolean)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  const lines = text.split('\n');
  let lineIdx = 0;
  let matched = segments.length === 0;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    if (/^\d+$/.test(segment)) {
      const target = parseInt(segment, 10);
      let count = -1;
      let found = false;
      let itemIndent = -1;
      for (let index = lineIdx + 1; index < lines.length; index++) {
        const raw = lines[index];
        const leftTrimmed = raw.trimStart();
        if (!(leftTrimmed.startsWith('- ') || leftTrimmed === '-')) continue;
        const indent = raw.length - leftTrimmed.length;
        if (itemIndent === -1) itemIndent = indent;
        else if (indent !== itemIndent) continue;
        count++;
        if (count === target) { lineIdx = index; found = true; matched = true; break; }
      }
      if (!found) {
        count = -1;
        for (let index = lineIdx + 1; index < lines.length; index++) {
          if (lines[index].trimStart().startsWith('{')) {
            count++;
            if (count === target) { lineIdx = index; found = true; matched = true; break; }
          }
        }
      }
      if (requireCompleteMatch && !found) return 0;
    } else {
      const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isRootSegment = segmentIndex === 0 && lineIdx === 0;
      const pattern = new RegExp(`["']?${escaped}["']?\\s*[:\\[{]`);
      let found = false;
      for (let index = lineIdx; index < lines.length; index++) {
        if (!pattern.test(lines[index])) continue;
        if (isRootSegment) {
          const indent = lines[index].length - lines[index].trimStart().length;
          if (indent > 2) continue;
        }
        lineIdx = index;
        matched = true;
        found = true;
        break;
      }
      if (requireCompleteMatch && !found) return 0;
    }
  }

  return matched ? lineIdx + 1 : 0;
}

export function findComponentDefinitionLine(text: string, sourceLine: number, column: number): number {
  const reference = referenceAtColumn(text.split('\n')[sourceLine - 1] ?? '', column);
  if (!reference) return 0;
  const pointer = reference.slice(1);
  return sourcePathToLine(text, pointer) || pathToLine(text, pointer, true);
}