export interface WoodPiece {
  length: number;
  quantity: number;
}

export interface CutResult {
  woodUsed: number;
  cuts: number[];
}

export interface Result {
  cuts: CutResult[];
  totalLengthUsed: number;
  totalLengthTrashed: number;
  totalLengthUnused: number;
}

export function optimizeCuts(
  desiredCuts: WoodPiece[],
  availableWood: WoodPiece[],
  sawDustWidth: number = 3, // Default 3mm
  errorPercentage: number = 0.01
): Result {
  let totalLengthUsed = 0;
  let totalLengthTrashed = 0;
  let totalLengthUnused = 0;
  const cutsResult: CutResult[] = [];

  // Create a flat list of all available wood pieces
  const allWood: number[] = [];
  for (const wood of availableWood) {
    for (let i = 0; i < wood.quantity; i++) {
      allWood.push(wood.length);
    }
  }

  // Create a copy of desiredCuts to avoid modifying the original array
  const remainingCuts = desiredCuts.map((cut) => ({ ...cut }));

  // Function to solve for a single wood piece
  function solveSingleWood(woodLength: number): CutResult {
    const cuts: number[] = [];
    let remainingLength = woodLength;

    while (remainingLength > 0) {
      let bestCutIndex = -1;
      let bestCutLength = 0;

      for (let i = 0; i < remainingCuts.length; i++) {
        const cutLength = Math.ceil(
          remainingCuts[i].length * (1 + errorPercentage)
        );
        if (
          cutLength + sawDustWidth <= remainingLength &&
          remainingCuts[i].quantity > 0
        ) {
          if (cutLength > bestCutLength) {
            bestCutIndex = i;
            bestCutLength = cutLength;
          }
        }
      }

      if (bestCutIndex === -1) break;

      cuts.push(remainingCuts[bestCutIndex].length);
      remainingLength -= bestCutLength + sawDustWidth;
      remainingCuts[bestCutIndex].quantity--;
    }

    return {
      woodUsed: woodLength,
      cuts: cuts,
    };
  }

  // Process each wood piece
  for (const wood of allWood) {
    const result = solveSingleWood(wood);
    if (result.cuts.length > 0) {
      cutsResult.push(result);
      totalLengthUsed += result.cuts.reduce((a, b) => a + b, 0);
      const actualCutLength = result.cuts.reduce(
        (a, b) => a + Math.ceil(b * (1 + errorPercentage) + sawDustWidth),
        0
      );
      totalLengthTrashed += wood - actualCutLength;
    } else {
      totalLengthUnused += wood;
    }
  }

  return {
    cuts: cutsResult,
    totalLengthUsed: totalLengthUsed,
    totalLengthTrashed: totalLengthTrashed,
    totalLengthUnused: totalLengthUnused,
  };
}
