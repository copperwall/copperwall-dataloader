type BatchFn<K, V> = (keys: ReadonlyArray<K>) => Promise<ReadonlyArray<V | Error>>;
interface DataLoader<K, V> {
    load: (key: K) => Promise<V>
}
interface QueueEntry<K> {
    key: K,
    resolve: Function,
    reject: Function
}

function dataloader<K, V>(batchFn: BatchFn<K, V>): DataLoader<K, V> {
    let queue: Array<QueueEntry<K>> = [];

    function executeBatch(): void {
        const oldQueue = queue;
        queue = [];
        const keys = oldQueue.map(entry => entry.key);

        batchFn(keys).then(values => {
            values.forEach(function (value, index) {
                if (value instanceof Error) {
                    oldQueue[index].reject(value);
                } else {
                    oldQueue[index].resolve(value);
                }
            });
        });
    }

    return {
        load: key => {
            return new Promise((resolve, reject) => {
                queue.push({
                    key,
                    resolve,
                    reject
                })

                if (queue.length === 1) {
                    // Execute the next batch after the promise microtask queue has finished.
                    Promise.resolve().then(() => process.nextTick(executeBatch));
                }
            });
        }
    }
}

export default dataloader;
