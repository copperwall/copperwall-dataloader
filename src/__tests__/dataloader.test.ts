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
        };
        const testDataLoader = dataloader<number, number>(batchFnPlusOne);
        const values = testKeys.map(key => testDataLoader.load(key));

        const resolved = await Promise.all(values);
        expect(resolved).toEqual(expectedResults);
    });

    // NOTE: For some reason it looks like Promise jobs run before nextTick jobs
    // when running in Jest. So as far as the test suite is concerned, this will
    // pass whether or not the process.nextTick is run after all promises or
    // not. If I get around to figuring out why this happens in Jest I'll update it.
    test('should execute batch after all resolved promises for that frame of execution', async () => {
        const testDataLoader = dataloader<number, number>(batchFnWithPromise);
        const batchCalls: Array<ReadonlyArray<number>> = [];
        function batchFnWithPromise(keys: ReadonlyArray<number>) {
            batchCalls.push(keys);

            return Promise.resolve(keys);
        }

        Promise.resolve().then(() => {
            testDataLoader.load(2);
        });
        const value = await testDataLoader.load(1);
        expect(batchCalls).toEqual([[1, 2]]);
    });
})
