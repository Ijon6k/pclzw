/**
 * LZW Image Compression Engine - Compressor
 * Part of the Academic LZW Image Compression Analyzer project.
 * 
 * This module implements a standard LZW compression algorithm tuned for byte arrays (Uint8Array).
 * It features a 16-bit code space (max 65,536 dictionary entries) and operates in two modes:
 * 1. Pixel Mode ('pixel') - Compresses raw RGBA pixel arrays and records dimensions.
 * 2. File Mode ('file') - Compresses raw binary file streams.
 * 
 * Custom Binary Format Header:
 * - Bytes 0-3:   Magic Header "LZW2"
 * - Byte 4:      Mode flag - 'P' (Pixel Mode) or 'B' (Binary File Mode)
 * - Byte 5:      Filename length N (1 byte)
 * - Bytes 6..N+5: Filename (UTF-8 encoded)
 * - Bytes N+6..N+9: Original size in bytes (Uint32, little-endian)
 * - If Mode is 'P':
 *   - Next 4 bytes: Image Width (Uint32, little-endian)
 *   - Next 4 bytes: Image Height (Uint32, little-endian)
 * - Rest of file: 16-bit compressed code stream (Uint16, little-endian)
 */

export interface CompressionStep {
  index: number;
  currentSequence: string; // Hex or numeric sequence of current W
  currentCode: number;     // Code representing current W
  nextByte: number;        // Byte K
  lookaheadKey: string;    // String key of W+K
  found: boolean;          // Whether lookahead is in dictionary
  outputCode?: number;     // Code emitted if not found
  newCode?: number;        // New dictionary code assigned if not found
}

export interface CompressionResult {
  compressedData: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  dictionarySize: number;
  steps: CompressionStep[];
  mode: "pixel" | "file";
  width?: number;
  height?: number;
}

export interface CompressOptions {
  mode: "pixel" | "file";
  filename: string;
  width?: number;
  height?: number;
  maxStepsToRecord?: number;
}

/**
 * Compresses an input Uint8Array using the LZW algorithm.
 */
export function compressLZW(
  input: Uint8Array,
  options: CompressOptions
): CompressionResult {
  const { mode, filename, width, height, maxStepsToRecord = 50 } = options;
  const originalSize = input.length;

  if (originalSize === 0) {
    throw new Error("Cannot compress empty input data.");
  }

  // 1. Initialize Dictionary
  // Maps lookup string key to its 16-bit code.
  // For single bytes: key is the byte value string (e.g. "12") -> code 12.
  // For sequences: key is "parentCode,byte" (e.g. "256,12") -> code 257.
  const dictionary = new Map<string, number>();
  
  for (let i = 0; i < 256; i++) {
    dictionary.set(i.toString(), i);
  }

  let nextCode = 256;
  const MAX_CODE = 65535; // 16-bit limit
  const codes: number[] = [];
  const steps: CompressionStep[] = [];

  // 2. LZW Encoding Loop
  // Let W be the current sequence. We store its current code representation.
  let currentCode = input[0];
  let currentWString = input[0].toString(); // For display/lookup

  for (let i = 1; i < input.length; i++) {
    const k = input[i];
    const lookaheadKey = `${currentCode},${k}`;

    if (dictionary.has(lookaheadKey)) {
      // W + K is in the dictionary. Update current sequence W.
      const matchCode = dictionary.get(lookaheadKey)!;
      
      if (steps.length < maxStepsToRecord) {
        steps.push({
          index: i,
          currentSequence: currentWString,
          currentCode,
          nextByte: k,
          lookaheadKey,
          found: true,
        });
      }
      
      currentCode = matchCode;
      currentWString = `${currentWString},${k}`;
    } else {
      // W + K is NOT in the dictionary.
      // Output code for W.
      codes.push(currentCode);

      // Add W + K to dictionary if we haven't exceeded 16-bit space
      let newCodeAssigned: number | undefined;
      if (nextCode <= MAX_CODE) {
        dictionary.set(lookaheadKey, nextCode);
        newCodeAssigned = nextCode;
        nextCode++;
      }

      if (steps.length < maxStepsToRecord) {
        steps.push({
          index: i,
          currentSequence: currentWString,
          currentCode,
          nextByte: k,
          lookaheadKey,
          found: false,
          outputCode: currentCode,
          newCode: newCodeAssigned,
        });
      }

      // Reset current sequence W to K.
      currentCode = k;
      currentWString = k.toString();
    }
  }

  // Output code for the remaining sequence
  codes.push(currentCode);
  if (steps.length < maxStepsToRecord) {
    steps.push({
      index: input.length,
      currentSequence: currentWString,
      currentCode,
      nextByte: -1, // Terminating step
      lookaheadKey: "",
      found: false,
      outputCode: currentCode,
    });
  }

  // 3. Serialize Output to Custom Binary Format
  // Header generation:
  const textEncoder = new TextEncoder();
  const filenameBytes = textEncoder.encode(filename);
  
  // Calculate size of header fields
  const magicSize = 4; // "LZW2"
  const modeSize = 1;  // 'P' or 'B'
  const fnLenSize = 1; // Filename length byte
  const origSizeSize = 4; // Uint32 original size
  
  let headerSize = magicSize + modeSize + fnLenSize + filenameBytes.length + origSizeSize;
  if (mode === "pixel") {
    headerSize += 8; // Width (4 bytes) + Height (4 bytes)
  }

  const outputBytes = new Uint8Array(headerSize + codes.length * 2);
  
  // Write Magic: LZW2
  outputBytes[0] = 76; // L
  outputBytes[1] = 90; // Z
  outputBytes[2] = 87; // W
  outputBytes[3] = 50; // 2
  
  // Write Mode
  outputBytes[4] = mode === "pixel" ? 80 : 66; // 'P' or 'B'
  
  // Write Filename Length
  outputBytes[5] = filenameBytes.length;
  
  // Write Filename
  outputBytes.set(filenameBytes, 6);
  
  const view = new DataView(outputBytes.buffer, outputBytes.byteOffset, outputBytes.byteLength);
  
  // Write Original Size (Uint32, little-endian)
  const sizeOffset = 6 + filenameBytes.length;
  view.setUint32(sizeOffset, originalSize, true);
  
  let codesOffset = sizeOffset + 4;
  
  if (mode === "pixel") {
    // Write Width and Height (Uint32, little-endian)
    view.setUint32(codesOffset, width || 0, true);
    view.setUint32(codesOffset + 4, height || 0, true);
    codesOffset += 8;
  }
  
  // Write Code Stream (Uint16, little-endian)
  for (let i = 0; i < codes.length; i++) {
    view.setUint16(codesOffset + i * 2, codes[i], true);
  }

  const compressedSize = outputBytes.length;
  const ratio = originalSize / compressedSize;

  return {
    compressedData: outputBytes,
    originalSize,
    compressedSize,
    ratio,
    dictionarySize: nextCode,
    steps,
    mode,
    width,
    height,
  };
}
