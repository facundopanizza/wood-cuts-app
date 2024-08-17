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
    const dp: number[] = new Array(woodLength + 1).fill(0);
    const cutChoice: number[] = new Array(woodLength + 1).fill(-1);

    for (let i = 1; i <= woodLength; i++) {
      for (let j = 0; j < remainingCuts.length; j++) {
        const cutLength = Math.ceil(
          remainingCuts[j].length * (1 + errorPercentage) + sawDustWidth
        );
        if (cutLength <= i && remainingCuts[j].quantity > 0) {
          const newValue = dp[i - cutLength] + remainingCuts[j].length;
          if (newValue > dp[i]) {
            dp[i] = newValue;
            cutChoice[i] = j;
          }
        }
      }
    }

    const cuts: number[] = [];
    let currentLength = woodLength;
    while (currentLength > 0 && cutChoice[currentLength] !== -1) {
      const chosenCutIndex = cutChoice[currentLength];
      cuts.push(remainingCuts[chosenCutIndex].length);
      currentLength -= Math.ceil(
        remainingCuts[chosenCutIndex].length * (1 + errorPercentage) +
          sawDustWidth
      );
      remainingCuts[chosenCutIndex].quantity--;
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
