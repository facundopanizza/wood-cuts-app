import { optimizeCuts, WoodPiece } from './woodCutOptimizer';

describe('optimizeCuts', () => {
  test('basic optimization scenario', () => {
    const desiredCuts: WoodPiece[] = [
      { length: 100, quantity: 2 },
      { length: 50, quantity: 1 },
    ];
    const availableWood: WoodPiece[] = [{ length: 300, quantity: 1 }];

    const result = optimizeCuts(desiredCuts, availableWood);

    expect(result.totalLengthUsed).toBe(250);
    expect(result.cuts.length).toBe(1);
    expect(result.cuts[0].cuts).toEqual(expect.arrayContaining([100, 100, 50]));
  });

  test('multiple wood pieces', () => {
    const desiredCuts: WoodPiece[] = [
      { length: 100, quantity: 3 },
      { length: 50, quantity: 2 },
    ];
    const availableWood: WoodPiece[] = [{ length: 200, quantity: 6 }];

    const result = optimizeCuts(desiredCuts, availableWood);

    expect(result.totalLengthUsed).toBe(400);
    expect(result.cuts.length).toBe(3);
    expect(result.cuts[0].cuts).toEqual(expect.arrayContaining([100, 100]));
    expect(result.cuts[1].cuts).toEqual(expect.arrayContaining([100, 50, 50]));
  });

  test('custom sawDustWidth and errorPercentage', () => {
    const desiredCuts: WoodPiece[] = [{ length: 100, quantity: 2 }];
    const availableWood: WoodPiece[] = [{ length: 220, quantity: 1 }];

    const result = optimizeCuts(desiredCuts, availableWood, 5, 0.02);

    expect(result.totalLengthUsed).toBe(200);
    expect(result.cuts.length).toBe(1);
    expect(result.cuts[0].cuts).toEqual([100, 100]);
    // expect(result.totalLengthTrashed).toBeCloseTo(10, 0);
  });

  // test('insufficient wood', () => {
  //   const desiredCuts: WoodPiece[] = [{ length: 100, quantity: 3 }];
  //   const availableWood: WoodPiece[] = [{ length: 200, quantity: 1 }];

  //   const result = optimizeCuts(desiredCuts, availableWood);

  //   expect(result.totalLengthUsed).toBe(100);
  //   expect(result.cuts.length).toBe(1);
  //   expect(result.cuts[0].cuts).toEqual([100]);
  // });

  test('excess wood', () => {
    const desiredCuts: WoodPiece[] = [{ length: 50, quantity: 1 }];
    const availableWood: WoodPiece[] = [{ length: 100, quantity: 2 }];

    const result = optimizeCuts(desiredCuts, availableWood);

    expect(result.totalLengthUsed).toBe(50);
    expect(result.cuts.length).toBe(1);
    expect(result.cuts[0].cuts).toEqual([50]);
    expect(result.totalLengthUnused).toBe(100);
  });

  test('should not cut more than needed', () => {
    const desiredCuts: WoodPiece[] = [{ length: 33, quantity: 3 }];
    const availableWood: WoodPiece[] = [{ length: 100, quantity: 2 }];

    const result = optimizeCuts(desiredCuts, availableWood);

    // expect(result.totalLengthUsed).toBe(99);
    expect(result.cuts.length).toBe(2);
    expect(result.cuts[0].cuts).toEqual([33, 33]);
    expect(result.cuts[1].cuts).toEqual([33]);
    // expect(result.totalLengthUnused).toBe();
  });
});
