import dataloader from '../index';

describe('dataloader', () => {
    test('should group loaded keys together', async () => {
        const testKeys = [1,2];
        const batchFn = (keys: ReadonlyArray<number>) => {
            expect(keys).toEqual(keys);
            return Promise.resolve(keys);
        }
        const testDataLoader = dataloader<number, number>(batchFn);

        const values = testKeys.map(key => testDataLoader.load(key));

        const resolved = await Promise.all(values);
        expect(resolved).toEqual(testKeys);
    });

    test('should return a promise for each load call', async () => {
        const testKeys = [1,2];
        const expectedResults = [2,3];
        const batchFnPlusOne = (keys: ReadonlyArray<number>) => {
            return Promise.resolve(keys.map(key => key + 1));
        }
        const testDataLoader = dataloader<number, number>(batchFnPlusOne);
        const values = testKeys.map(key => testDataLoader.load(key));

        const resolved = await Promise.all(values);
        expect(resolved).toEqual(expectedResults);
    });
})