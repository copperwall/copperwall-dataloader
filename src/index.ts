export type BatchFn<K, V> = (keys: ReadonlyArray<K>) => Promise<ReadonlyArray<V | Error>>;
interface DataLoader<K, V> {
    load: (key: K) => Promise<V>,
    loadMany: (keys: ReadonlyArray<K>) => Promise<ReadonlyArray<V>>,
    clear: (key: K) => void,
    clearAll: () => void,
    prime: (key: K, value: V) => void
}
interface QueueEntry<K> {
    key: K,
    resolve: Function,
    reject: Function
}

function dataloader<K, V>(batchFn: BatchFn<K, V>): DataLoader<K, V> {
    let queue: Array<QueueEntry<K>> = [];
    let cache: Map<K, Promise<V>> = new Map();

    function executeBatch(): void {
        const oldQueue = queue;
        queue = [];
        const keys = oldQueue.map(entry => entry.key);

        batchFn(keys).then(values => {
            values.forEach(function(value, index) {
                if (value instanceof Error) {
                    oldQueue[index].reject(value);
                } else {
                    oldQueue[index].resolve(value);
                }
            });
        }).catch((err: Error) => {
            oldQueue.forEach(function(entry) {
                clear(entry.key);
                entry.reject(err);
            });
        });
    }

    function load(key: K): Promise<V> {
        // TODO: Check if that key exists in the cache, return early if it does.
        // Or should this be done in the executeBatch function?
        // Let's try it here first.
        if (cache.has(key)) {
            return (cache.get(key) as Promise<V>);
        }

        const loadResult = new Promise<V>((resolve, reject) => {
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

        cache.set(key, loadResult);

        return loadResult;
    }

    function loadMany(keys: ReadonlyArray<K>): Promise<ReadonlyArray<V>> {
        return Promise.all(keys.map(load));
    }

    function clear(key: K): void {
        cache.delete(key);
    }

    function clearAll(): void {
        cache.clear();
    }

    function prime(key: K, value: V): void {
        const p = value instanceof Error ? Promise.reject(value) : Promise.resolve(value);

        if (!cache.has(key)) {
            cache.set(key, p);
        }
    }

    return {
        load,
        loadMany,
        clear,
        clearAll,
        prime
    }
}

export default dataloader;
