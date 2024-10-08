export interface WoodPiece {
  length: number;
  quantity: number;
}

export interface CutResult {
  woodUsed: number;
  cuts: number[];
  remainingLength: number;
  originalLength: number;
  isReused: boolean;
  waste: number;
}

export interface Result {
  cuts: CutResult[];
  totalLengthUsed: number;
  totalLengthTrashed: number;
  totalLengthUnused: number;
  totalPiecesUsed: number;
  totalPiecesUnused: number;
  unfulfilledCuts: WoodPiece[];
  numberOfWoodPiecesUsed: number;
}

interface ReusablePiece {
  length: number;
  originalLength: number;
}

export interface GroupedCutResult extends CutResult {
  quantity: number;
}

export interface GroupedResult extends Omit<Result, 'cuts'> {
  cuts: GroupedCutResult[];
}

export function optimizeCuts(
  desiredCuts: WoodPiece[],
  availableWood?: WoodPiece[],
  sawDustWidth: number = 3,
  errorPercentage: number = 0.01,
  defaultWoodLength: number = 3962
): GroupedResult {
  let totalLengthUsed = 0;
  let totalLengthUnused = 0;
  const cutsResult: CutResult[] = [];
  const reusablePieces: ReusablePiece[] = [];

  let allWood: number[];
  if (availableWood && availableWood.length > 0) {
    allWood = availableWood.flatMap((wood) =>
      Array(wood.quantity).fill(wood.length)
    );
  } else {
    allWood = [];
  }

  const remainingCuts = desiredCuts.map((cut) => ({ ...cut }));

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

      if (remainingCuts[chosenCutIndex].quantity > 0) {
        cuts.push(remainingCuts[chosenCutIndex].length);
        currentLength -= Math.ceil(
          remainingCuts[chosenCutIndex].length * (1 + errorPercentage) +
            sawDustWidth
        );

        remainingCuts[chosenCutIndex].quantity--;
      } else {
        break;
      }
    }

    return {
      woodUsed: woodLength,
      cuts: cuts,
      remainingLength: currentLength,
      originalLength: woodLength,
      isReused: false,
      waste: cuts.reduce((acc, cut) => acc - cut, woodLength),
    };
  }

  function processPiece(wood: number | ReusablePiece, isReused = false) {
    const woodLength = typeof wood === 'number' ? wood : wood.length;
    const originalLength =
      typeof wood === 'number' ? wood : wood.originalLength;
    const result = solveSingleWood(woodLength);

    if (result.cuts.length > 0) {
      result.isReused = isReused;
      result.originalLength = originalLength;
      totalLengthUsed += result.cuts.reduce((a, b) => a + b, 0);

      const minRemainingCutLength = Math.min(
        ...remainingCuts
          .filter((cut) => cut.quantity > 0)
          .map((cut) => cut.length)
      );

      if (result.remainingLength >= minRemainingCutLength + sawDustWidth) {
        reusablePieces.push({
          length: result.remainingLength,
          originalLength: originalLength,
        });
      }

      return result;
    } else {
      totalLengthUnused += woodLength;
      return null;
    }
  }

  let totalPiecesUsed = 0;
  let totalPiecesUnused = allWood.length;

  while (remainingCuts.some((cut) => cut.quantity > 0)) {
    let currentWood: number | ReusablePiece;
    let isReused = false;

    if (reusablePieces.length > 0) {
      currentWood = reusablePieces.sort((a, b) => a.length - b.length).pop()!;
      isReused = true;
    } else if (allWood.length > 0) {
      currentWood = allWood.pop()!;
      totalPiecesUsed++;
      totalPiecesUnused--;
    } else {
      currentWood = defaultWoodLength;
      totalPiecesUsed++;
    }

    const currentResult = processPiece(currentWood, isReused);
    if (currentResult) {
      while (
        reusablePieces.length > 0 &&
        remainingCuts.some((cut) => cut.quantity > 0)
      ) {
        const reusedPiece = reusablePieces
          .sort((a, b) => a.length - b.length)
          .pop()!;
        const reusedResult = processPiece(reusedPiece, true);
        if (reusedResult) {
          currentResult.cuts = currentResult.cuts.concat(reusedResult.cuts);
          currentResult.remainingLength = reusedResult.remainingLength;
          currentResult.waste = currentResult.cuts.reduce(
            (acc, cut) => acc - cut,
            currentResult.originalLength
          );
        }
      }
      cutsResult.push(currentResult);
    }
  }

  totalLengthUnused += allWood.reduce((sum, wood) => sum + wood, 0);

  const unfulfilledCuts = remainingCuts.filter((cut) => cut.quantity > 0);

  const groupedCuts = cutsResult.reduce((acc, cut) => {
    const key = JSON.stringify(cut.cuts.sort((a, b) => a - b));
    if (!acc[key]) {
      acc[key] = { ...cut, quantity: 1 };
    } else {
      acc[key].quantity += 1;
    }
    return acc;
  }, {} as Record<string, GroupedCutResult>);

  const totalLengthTrashed = Object.values(groupedCuts).reduce(
    (acc, cut) => acc + cut.waste * cut.quantity,
    0
  );

  return {
    cuts: Object.values(groupedCuts),
    totalLengthUsed,
    totalLengthTrashed,
    totalLengthUnused,
    totalPiecesUsed,
    totalPiecesUnused,
    unfulfilledCuts,
    numberOfWoodPiecesUsed: totalPiecesUsed,
  };
}
