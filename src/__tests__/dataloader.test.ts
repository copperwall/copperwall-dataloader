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

    describe('Caching', () => {
        test('results should be cached', async () => {
            function batchFn(keys: ReadonlyArray<number>) {
                return Promise.resolve(keys);
            }
            const testDataLoader = dataloader<number, number>(batchFn);

            const p1 = testDataLoader.load(1);
            const p2 = testDataLoader.load(1);

            expect(p1).toBe(p2);

            const [v1, v2] = await Promise.all([p1, p2]);

            expect(v1).toBe(1);
            expect(v1).toBe(1);
        });

        test('cached results should not be included in batch', async () => {
            const batchCalls: Array<ReadonlyArray<number>> = [];
            function batchFn(keys: ReadonlyArray<number>) {
                batchCalls.push(keys);

                return Promise.resolve(keys);
            }

            const testDataLoader = dataloader<number, number>(batchFn);

            await testDataLoader.load(1);

            const p1 = testDataLoader.load(1);
            const p2 = testDataLoader.load(2);

            const [v1, v2] = await Promise.all([p1, p2]);

            expect(batchCalls).toEqual([[1], [2]]);
            expect(v1).toBe(1);
            expect(v2).toBe(2);
        });

        test('delete method should clear key from cache', async () => {
            const batchCalls: Array<ReadonlyArray<number>> = [];
            function batchFn(keys: ReadonlyArray<number>) {
                batchCalls.push(keys);
                return Promise.resolve(keys);
            }
            const testDataLoader = dataloader<number, number>(batchFn);

            const p1 = testDataLoader.load(1);
            const p2 = testDataLoader.load(1);
            const p3 = testDataLoader.load(2);

            expect(p1).toBe(p2);

            const [v1, v2, v3] = await Promise.all([p1, p2, p3]);

            expect(v1).toBe(1);
            expect(v2).toBe(1);
            expect(v3).toBe(2);

            testDataLoader.delete(1);

            // 1 should no longer be cached, but 2 should still be.
            const p4 = testDataLoader.load(1);
            const p5 = testDataLoader.load(2);

            const [v4, v5] = await Promise.all([p4, p5]);

            // Cache entry was deleted for 1, so p4 and p1 should
            // not be the same promise.
            expect(p4).not.toBe(p1);
            expect(p5).toBe(p3);

            expect(v4).toBe(1);
            expect(v5).toBe(2);

            expect(batchCalls).toEqual([[1, 2], [1]]);
        });
    })
})
